import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { AssinaturaDigital } from '../../../models/assinatura-digital/AssinaturaDigital';
import { TermoContrato } from '../../../models/contratos/TermoContrato';
import { Cliente } from '../../../models/clientes/Cliente';
import { Contrato } from '../../../models/contratos/Contrato';
import { ClienteArquivo } from '../../../models/clientes/ClienteArquivo';
import { ModeloDocumento } from '../../../models/documentos/ModeloDocumento';
import { AssinafyService } from '../../../services/assinatura-digital/AssinafyService';
import { ZapsignService } from '../../../services/assinatura-digital/ZapsignService';
import { ClienteArquivoService } from '../../../services/cadastros';
import { VariaveisDocumentoService } from '../../../services/documentos/VariaveisDocumentoService';
import AssinaturaDigitalProvider from '../../../models/assinatura-digital/AssinaturaDigitalProvider';
import { registrarCriacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import type { AuthenticatedRequest } from '../../../types/auth';

// Interface comum para serviços de assinatura digital
interface ISignatureService {
  uploadDocumento(documento: { name: string; file: string; signers?: Array<{ name: string; email: string; cpf?: string; cnpj?: string; order?: number }> }): Promise<{ success: boolean; data?: { id: string; url?: string; status: string }; error?: string; message?: string }>;
  processarDocumentoEmBackground?(documentId: string, documento: { name?: string; file?: string; signers: Array<{ name: string; email: string; cpf?: string; cnpj?: string; order?: number }>; expiresAt?: string; message?: string }): Promise<void>;
  consultarStatus(documentId: string): Promise<{ success: boolean; data?: { id: string; url?: string; status: string }; error?: string }>;
  baixarPdfAssinado(documentId: string, url?: string): Promise<Buffer | null>;
  cancelarAssinatura(documentId: string): Promise<{ success: boolean; error?: string }>;
}

// Tipo para serviços de assinatura digital
type SignatureService = AssinafyService | ZapsignService;

export class AssinaturaDigitalController {
  /**
   * Obtém o serviço de assinatura digital correto baseado no provider configurado
   * @param providerForced - Provider específico a ser usado (obrigatório)
   */
  private static async getSignatureService(providerForced: 'assinafy' | 'zapsign'): Promise<SignatureService | null> {
    try {
      // Os serviços já fazem a verificação de configuração internamente
      switch (providerForced) {
        case 'zapsign':
          return await ZapsignService.createFromDatabase();
        case 'assinafy':
        default:
          return await AssinafyService.createFromDatabase();
      }
    } catch (error) {
      logger.error('Erro ao obter serviço de assinatura digital:', error);
      return null;
    }
  }

  /**
   * Verifica se a assinatura digital está habilitada
   */
  private static async isSignatureEnabled(): Promise<boolean> {
    try {
      const provider = await AssinaturaDigitalProvider.findOne({
        where: { habilitado: true }
      });
      return !!provider && !!provider.api_key;
    } catch (error) {
      logger.error('Erro ao verificar se assinatura digital está habilitada:', error);
      return false;
    }
  }

  /**
   * Obtém o serviço de geração de PDF (pode ser qualquer um, pois o método é estático)
   */
  static async gerarPdfBase64(
    conteudoHtml: string,
    nomeArquivo: string
  ): Promise<string> {
    // Usar AssinafyService para geração de PDF (método estático, não depende do provider)
    return await AssinafyService.gerarPdfBase64(conteudoHtml, nomeArquivo);
  }
  /**
   * Lista todas as assinaturas
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { status, cliente_id, termo_contrato_id } = req.query;

      const where: Record<string, unknown> = {};
      
      if (status) {
        where.status = status;
      }
      if (cliente_id) {
        where.cliente_id = cliente_id;
      }
      if (termo_contrato_id) {
        where.termo_contrato_id = termo_contrato_id;
      }

      const assinaturas = await AssinaturaDigital.findAll({
        where,
        include: [
          {
            model: TermoContrato,
            as: 'termoContrato',
            required: false,
            attributes: ['id', 'tipo_termo', 'assinado']
          },
          {
            model: Cliente,
            as: 'cliente',
            required: false,
            attributes: ['id', 'nome', 'email', 'cpf_cnpj']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: assinaturas
      });
    } catch (error) {
      logger.error('Erro ao listar assinaturas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar assinaturas'
      });
    }
  }

  /**
   * Obtém assinatura por ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const assinatura = await AssinaturaDigital.findByPk(id, {
        include: [
          {
            model: TermoContrato,
            as: 'termoContrato',
            required: false
          },
          {
            model: Cliente,
            as: 'cliente',
            required: false
          }
        ]
      });

      if (!assinatura) {
        res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: assinatura
      });
    } catch (error) {
      logger.error('Erro ao buscar assinatura:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar assinatura'
      });
    }
  }

  /**
   * Envia documento para assinatura
   */
  static async enviarParaAssinatura(req: Request, res: Response): Promise<void> {
    try {
      const {
        termo_contrato_id,
        cliente_id,
        email_assinante,
        nome_assinante,
        cpf_cnpj_assinante,
        mensagem,
        dias_expiracao = 30
      } = req.body;

      if (!email_assinante || !nome_assinante) {
        res.status(400).json({
          success: false,
          message: 'Email e nome do assinante são obrigatórios'
        });
        return;
      }

      // Buscar termo de contrato se fornecido
      let cliente: Cliente | null = null;
      let contrato: Contrato | null = null;
      let conteudoHtml = '';

      if (termo_contrato_id) {
        const termoContrato = await TermoContrato.findByPk(termo_contrato_id);

        if (!termoContrato) {
          res.status(404).json({
            success: false,
            message: 'Termo de contrato não encontrado'
          });
          return;
        }

        if (!termoContrato.modelo_documento_id) {
          res.status(400).json({
            success: false,
            message: 'Termo de contrato não possui modelo de documento associado'
          });
          return;
        }

        contrato = await termoContrato.getContrato();
        if (contrato) {
          cliente = await contrato.getCliente();
        }

        const modeloDocumento = await ModeloDocumento.findByPk(termoContrato.modelo_documento_id);
        if (!modeloDocumento) {
          res.status(404).json({
            success: false,
            message: 'Modelo de documento não encontrado'
          });
          return;
        }

        const conteudoMap: Record<string, string> = {
          'adesao': modeloDocumento.conteudo_adesao || modeloDocumento.conteudo || '',
          'permanencia': modeloDocumento.conteudo_permanencia || modeloDocumento.conteudo || ''
        };
        
        conteudoHtml = conteudoMap[termoContrato.tipo_termo] || modeloDocumento.conteudo || '';

        if (!conteudoHtml) {
          res.status(400).json({
            success: false,
            message: 'Modelo de documento não possui conteúdo válido'
          });
          return;
        }
      } else if (cliente_id) {
        cliente = await Cliente.findByPk(cliente_id);
        if (!cliente) {
          res.status(404).json({
            success: false,
            message: 'Cliente não encontrado'
          });
          return;
        }
      }

      const isEnabled = await AssinaturaDigitalController.isSignatureEnabled();
      if (!isEnabled) {
        res.status(400).json({
          success: false,
          message: 'Assinatura digital não está habilitada. Configure em Parâmetros > Assinatura Digital'
        });
        return;
      }

      // Buscar provider habilitado
      const providerConfig = await AssinaturaDigitalProvider.findOne({
        where: { habilitado: true }
      });
      
      if (!providerConfig) {
        res.status(500).json({
          success: false,
          message: 'Nenhum provider de assinatura digital habilitado. Configure em Parâmetros > Assinatura Digital'
        });
        return;
      }

      const provider = providerConfig.provider as 'assinafy' | 'zapsign';
      
      // Este método genérico está deprecated - use os controllers específicos
      const signatureService = await AssinaturaDigitalController.getSignatureService(provider);
      if (!signatureService) {
        res.status(500).json({
          success: false,
          message: 'API Key não configurada. Configure em Parâmetros > Assinatura Digital'
        });
        return;
      }

      if (conteudoHtml && cliente) {
        // baseUrl não é mais necessário - links serão relativos
        const baseUrl = undefined;
        const contratoRef = contrato ? { id: contrato.id } : undefined;

        conteudoHtml = await VariaveisDocumentoService.processarVariaveis(
          conteudoHtml,
          {
            cliente,
            contrato: contratoRef,
            dataReferencia: new Date()
          },
          baseUrl
        );
      }

      const pdfBase64 = await AssinaturaDigitalController.gerarPdfBase64(
        conteudoHtml || '<html><body><h1>Documento para assinatura</h1></body></html>',
        `termo-${termo_contrato_id || 'documento'}.pdf`
      );

      const diasExpiracaoFinal = (dias_expiracao as number) || providerConfig.dias_expiracao_padrao || 30;
      const dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + diasExpiracaoFinal);
      const cpfCnpjLimpo = cpf_cnpj_assinante?.replace(/[.\-\/\s]/g, '') || '';
      
      // Preparar signatários para envio
      const signers = [{
        name: nome_assinante,
        email: email_assinante,
        cpf: cpfCnpjLimpo.length === 11 ? cpfCnpjLimpo : undefined,
        cnpj: cpfCnpjLimpo.length === 14 ? cpfCnpjLimpo : undefined,
        order: 1
      }];
      
      // Para ZAPSIGN, os signatários devem ser enviados junto com a criação do documento
      // Para Assinafy, enviamos depois
      const uploadResult = await (signatureService as ISignatureService).uploadDocumento({
        name: `Termo de Contrato ${termo_contrato_id || 'Documento'}`,
        file: pdfBase64,
        signers: provider === 'zapsign' ? signers : undefined // Incluir signatários apenas para ZAPSIGN
      });

      if (!uploadResult.success || !uploadResult.data) {
        res.status(500).json({
          success: false,
          message: uploadResult.message || uploadResult.error || 'Erro ao fazer upload do documento'
        });
        return;
      }

      const documentId = uploadResult.data.id;
      
      // Para Assinafy, processar signatários em background
      // Para ZAPSIGN, enviar documento para assinatura por email aos signatários
      if (provider === 'assinafy') {
        (signatureService as ISignatureService).processarDocumentoEmBackground?.(documentId, {
          name: `Termo de Contrato ${termo_contrato_id || 'Documento'}`,
          file: pdfBase64,
          signers: signers,
          expiresAt: dataExpiracao.toISOString(),
          message: mensagem || 'Por favor, assine este documento'
        }).catch((error: unknown) => {
          logger.error('Erro ao processar documento em background', {
            documentId,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        });
      } else if (provider === 'zapsign') {
        // Para ZAPSIGN, o email já é enviado automaticamente quando fazemos upload com signers
        // que têm send_automatic_email: true. Não precisamos chamar endpoint /send separadamente.
      }

      // Para ZAPSIGN, a URL de assinatura já vem na resposta do upload
      const urlAssinatura = provider === 'zapsign' && uploadResult.data?.url 
        ? uploadResult.data.url 
        : null;

      const assinatura = await AssinaturaDigital.create({
        termo_contrato_id: termo_contrato_id || null,
        cliente_id: cliente?.id || cliente_id || null,
        documento_tipo: termo_contrato_id ? 'termo' : 'outro' as const,
        documento_id: termo_contrato_id || null,
        api_provider: provider as 'assinafy' | 'zapsign',
        api_document_id: documentId,
        status: 'enviado' as const,
        url_assinatura: urlAssinatura,
        email_assinante,
        nome_assinante,
        cpf_cnpj_assinante: cpfCnpjLimpo || null,
        data_envio: new Date(),
        data_expiracao: dataExpiracao
      });

      await registrarCriacao(
        req as AuthenticatedRequest,
        'AssinaturaDigital',
        assinatura.id,
        assinatura.toJSON() as Record<string, unknown>
      );

      res.json({
        success: true,
        message: 'Documento enviado para assinatura com sucesso',
        data: assinatura.toJSON ? assinatura.toJSON() : assinatura
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao enviar documento para assinatura:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: `Erro ao enviar documento para assinatura: ${errorMessage}`
        });
      }
    }
  }

  /**
   * Consulta status de uma assinatura
   */
  static async consultarStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const assinatura = await AssinaturaDigital.findByPk(id);

      if (!assinatura) {
        res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
        return;
      }

      if (!assinatura.api_document_id) {
        res.status(400).json({
          success: false,
          message: 'Assinatura não possui ID da API'
        });
        return;
      }

      const signatureService = await AssinaturaDigitalController.getSignatureService(
        assinatura.api_provider as 'assinafy' | 'zapsign'
      );
      if (!signatureService) {
        res.status(500).json({
          success: false,
          message: 'API Key não configurada. Configure em Parâmetros > Assinatura Digital'
        });
        return;
      }

      const resultado = await (signatureService as ISignatureService).consultarStatus(assinatura.api_document_id);

      if (resultado.success && resultado.data) {
        if (resultado.data.status === 'signed' || resultado.data.status === 'completed') {
          await assinatura.marcarComoAssinado();
          
          if (assinatura.termo_contrato_id) {
            const termoContrato = await TermoContrato.findByPk(assinatura.termo_contrato_id);
            if (termoContrato && termoContrato.assinado === 'NAO') {
              termoContrato.assinado = 'SIM';
              termoContrato.data_aceite = new Date();
              termoContrato.aceito_por = assinatura.nome_assinante || 'Assinatura Digital';
              await termoContrato.save();
            }
          }
        } else if (resultado.data.status === 'canceled') {
          assinatura.status = 'cancelado';
          await assinatura.save();
        }

        res.json({
          success: true,
          data: {
            ...assinatura.toJSON(),
            status_api: resultado.data.status,
            url_assinatura: resultado.data.url
          }
        });
      } else {
        logger.error('Erro ao consultar status na API', {
          assinaturaId: id,
          resultado
        });
        res.status(500).json({
          success: false,
          message: resultado.error || 'Erro ao consultar status'
        });
      }
    } catch (error) {
      logger.error('Erro ao consultar status da assinatura:', {
        assinaturaId: req.params.id,
        error
      });
      res.status(500).json({
        success: false,
        message: 'Erro ao consultar status da assinatura'
      });
    }
  }

  /**
   * Baixa PDF assinado
   */
  static async baixarPdfAssinado(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const assinatura = await AssinaturaDigital.findByPk(id);

      if (!assinatura) {
        res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
        return;
      }

      if (assinatura.status !== 'assinado') {
        res.status(400).json({
          success: false,
          message: 'Documento ainda não foi assinado'
        });
        return;
      }

      if (assinatura.pdf_assinado_base64) {
        const pdfBuffer = Buffer.from(assinatura.pdf_assinado_base64, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="documento-assinado-${id}.pdf"`);
        res.send(pdfBuffer);
        return;
      }

      if (!assinatura.api_document_id) {
        res.status(400).json({
          success: false,
          message: 'Assinatura não possui ID da API'
        });
        return;
      }

      const signatureService = await AssinaturaDigitalController.getSignatureService(
        assinatura.api_provider as 'assinafy' | 'zapsign'
      );
      if (!signatureService) {
        res.status(500).json({
          success: false,
          message: 'API Key não configurada. Configure em Parâmetros > Assinatura Digital'
        });
        return;
      }

      const pdfBuffer = await (signatureService as ISignatureService).baixarPdfAssinado(assinatura.api_document_id);

      if (!pdfBuffer) {
        res.status(500).json({
          success: false,
          message: 'Erro ao baixar PDF assinado'
        });
        return;
      }

      assinatura.pdf_assinado_base64 = pdfBuffer.toString('base64');
      await assinatura.save();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="documento-assinado-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao baixar PDF assinado:', {
        assinaturaId: req.params.id,
        error
      });
      res.status(500).json({
        success: false,
        message: 'Erro ao baixar PDF assinado'
      });
    }
  }

  /**
   * Cancela assinatura pendente
   */
  static async cancelar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const assinatura = await AssinaturaDigital.findByPk(id);

      if (!assinatura) {
        res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
        return;
      }

      if (assinatura.status === 'assinado') {
        res.status(400).json({
          success: false,
          message: 'Não é possível cancelar uma assinatura já concluída'
        });
        return;
      }

      if (assinatura.api_document_id) {
        const signatureService = await AssinaturaDigitalController.getSignatureService(
          assinatura.api_provider as 'assinafy' | 'zapsign'
        );
        if (signatureService) {
          await (signatureService as ISignatureService).cancelarAssinatura(assinatura.api_document_id);
        }
      }

      const dadosAnteriores = assinatura.toJSON();
      assinatura.status = 'cancelado';
      await assinatura.save();

      await registrarExclusao(
        req as AuthenticatedRequest,
        'AssinaturaDigital',
        assinatura.id,
        dadosAnteriores as Record<string, unknown>,
        'Assinatura cancelada'
      );

      res.json({
        success: true,
        message: 'Assinatura cancelada com sucesso',
        data: assinatura
      });
    } catch (error) {
      logger.error('Erro ao cancelar assinatura:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao cancelar assinatura'
      });
    }
  }

  /**
   * Handler para OPTIONS (CORS preflight)
   */
  static async webhookOptions(req: Request, res: Response): Promise<void> {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
  }

  /**
   * Webhook específico para Assinafy
   */
  static async webhookAssinafy(req: Request, res: Response): Promise<void> {
    const timestamp = new Date().toISOString();
    
    try {
      res.status(200).json({
        success: true,
        message: 'Webhook Assinafy recebido',
        timestamp
      });

      const documentId = req.body?.object?.id || req.body?.document_id || req.body?.id;
      const status = req.body?.object?.status || req.body?.status;
      const event = req.body?.event || req.body?.type;
      const signingUrl = req.body?.object?.signing_url || req.body?.signing_url;
      const certificatedPdfUrl = req.body?.object?.artifacts?.certificated 
        || req.body?.object?.download_url 
        || req.body?.certificated_pdf_url;
      const assignmentCompletedCount = req.body?.object?.assignment?.summary?.completed_count;
      const assignmentSignerCount = req.body?.object?.assignment?.summary?.signer_count;
      const signedPdf = req.body?.signed_pdf || req.body?.signedPdf;

      if (!documentId) {
        logger.warn('Webhook Assinafy sem document_id');
        return;
      }

      AssinaturaDigitalController.processarWebhookEmBackground(
        documentId, 
        status, 
        signedPdf, 
        event,
        assignmentCompletedCount,
        assignmentSignerCount,
        signingUrl,
        certificatedPdfUrl,
        'assinafy'
      )
        .catch((error: unknown) => {
          logger.error('Erro ao processar webhook Assinafy em background', {
            documentId,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        });
    } catch (error: unknown) {
      logger.error('Erro ao receber webhook Assinafy:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      res.status(500).json({
        success: false,
        message: 'Erro ao processar webhook Assinafy'
      });
    }
  }

  /**
   * Webhook específico para ZAPSIGN
   */
  static async webhookZapsign(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Webhook ZAPSIGN recebido'
      });

      const documentId = req.body?.token || req.body?.data?.token;
      const status = req.body?.status || req.body?.data?.status;
      const event = req.body?.event_type || req.body?.event || req.body?.data?.event_type || req.body?.data?.event;
      const signingUrl = req.body?.signers?.[0]?.sign_url;
      const certificatedPdfUrl = req.body?.signed_file || req.body?.signed_file_url || req.body?.download_url || req.body?.pdf_url;
      const signedPdf = req.body?.signed_pdf || req.body?.pdf_base64;

      if (!documentId) {
        return;
      }

      // Processar em background
      AssinaturaDigitalController.processarWebhookEmBackground(
        documentId, 
        status, 
        signedPdf,
        event,
        undefined,
        undefined,
        signingUrl,
        certificatedPdfUrl,
        'zapsign'
      ).catch((error: unknown) => {
        logger.error('Erro ao processar webhook ZAPSIGN em background', {
          documentId,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      });
    } catch (error: unknown) {
      logger.error('Erro ao processar webhook ZAPSIGN', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Webhook genérico (mantido para compatibilidade - detecta provider automaticamente)
   */
  static async webhook(req: Request, res: Response): Promise<void> {
    const timestamp = new Date().toISOString();
    
    try {
      res.status(200).json({
        success: true,
        message: 'Webhook recebido',
        timestamp
      });

      let documentId: string | undefined;
      let status: string | undefined;
      let signedPdf: string | undefined;
      let event: string | undefined;
      let signingUrl: string | undefined;
      let certificatedPdfUrl: string | undefined;
      let assignmentCompletedCount: number | undefined;
      let assignmentSignerCount: number | undefined;
      let provider: 'assinafy' | 'zapsign' | undefined;

      if (req.body?.object?.id) {
        provider = 'assinafy';
        documentId = req.body.object.id;
        status = req.body.object.status;
        event = req.body.event || req.body.type;
        signingUrl = req.body.object.signing_url;
        certificatedPdfUrl = req.body.object.artifacts?.certificated 
          || req.body.object.download_url;
        assignmentCompletedCount = req.body.object.assignment?.summary?.completed_count;
        assignmentSignerCount = req.body.object.assignment?.summary?.signer_count;
        signedPdf = req.body.signed_pdf || req.body.signedPdf;
      } else if (req.body?.token || req.body?.event_type) {
        provider = 'zapsign';
        documentId = req.body.token;
        status = req.body.status;
        event = req.body.event_type || req.body.event || req.body.type;
        signingUrl = req.body.signers?.[0]?.sign_url;
        certificatedPdfUrl = req.body.signed_file;
        signedPdf = req.body.signed_pdf || req.body.pdf_base64;
      } else {
        documentId = req.body?.document_id || req.body?.id || req.body?.token;
        status = req.body?.status;
        event = req.body?.event_type || req.body?.event || req.body?.type;
        signingUrl = req.body?.signing_url || req.body?.url || req.body?.signers?.[0]?.sign_url;
        certificatedPdfUrl = req.body?.download_url || req.body?.pdf_url || req.body?.signed_file;
        signedPdf = req.body?.signed_pdf || req.body?.signedPdf || req.body?.pdf_base64;
      }

      if (!documentId) {
        return;
      }

      // Se não detectou provider, tentar identificar pela assinatura no banco
      if (!provider) {
        const assinatura = await AssinaturaDigital.findOne({
          where: { api_document_id: String(documentId) },
          attributes: ['api_provider']
        });
        if (assinatura) {
          provider = assinatura.api_provider as 'assinafy' | 'zapsign';
        }
      }

      // Processar em background
      AssinaturaDigitalController.processarWebhookEmBackground(
        documentId, 
        status, 
        signedPdf, 
        event,
        assignmentCompletedCount,
        assignmentSignerCount,
        signingUrl,
        certificatedPdfUrl,
        provider
      )
        .catch((error: unknown) => {
          logger.error('Erro ao processar webhook em background', {
            documentId,
            provider: provider || 'desconhecido',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            stack: error instanceof Error ? error.stack : undefined
          });
        });
    } catch (error: unknown) {
      logger.error('Erro ao receber webhook:', {
        body: req.body,
        headers: req.headers,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({
        success: false,
        message: 'Erro ao processar webhook'
      });
    }
  }

  /**
   * Processa webhook em background
   */
  private static async processarWebhookEmBackground(
    documentId: string,
    status: string | undefined,
    signedPdf?: string,
    event?: string,
    assignmentCompletedCount?: number,
    assignmentSignerCount?: number,
    signingUrl?: string,
    certificatedPdfUrl?: string,
    provider?: 'assinafy' | 'zapsign'
  ): Promise<void> {

    let assinatura = await AssinaturaDigital.findOne({
      where: { api_document_id: String(documentId) }
    });

    if (!assinatura && !isNaN(Number(documentId))) {
      assinatura = await AssinaturaDigital.findOne({
        where: { api_document_id: Number(documentId) }
      });
    }

    if (!assinatura) {
      return;
    }

    // Atualizar URL de assinatura se fornecida no webhook
    if (signingUrl && !assinatura.url_assinatura) {
      await AssinaturaDigital.update(
        { url_assinatura: signingUrl },
        { where: { id: assinatura.id } }
      );
    }

    // Verificar se documento foi assinado - apenas quando realmente estiver completo
    // Assinafy: status 'certificated' ou event 'document_ready'
    // ZAPSIGN: status 'signed' ou event 'doc_signed'
    const isAssinado = 
      status === 'certificated' || 
      event === 'document_ready' ||
      status === 'signed' ||
      status === 'completed' ||
      event === 'doc_signed' ||
      (provider === 'zapsign' && (status === 'signed' || status === 'completed' || event === 'doc_signed'));

    if (!isAssinado) {
      return;
    }

    if (assinatura.status === 'assinado') {
      return;
    }

    const dadosParaAtualizar: Record<string, unknown> = {
        status: 'assinado',
        data_assinatura: new Date()
      };
      
      if (certificatedPdfUrl) {
        dadosParaAtualizar.pdf_assinado_url = certificatedPdfUrl;
      }

      // Usar PDF do webhook se disponível
      let pdfBufferParaSalvar: Buffer | null = null;
      let pdfBase64ParaSalvar: string | null = null;
      
      if (signedPdf) {
        const base64Content = signedPdf.replace(/^data:.*,/, '');
        pdfBufferParaSalvar = Buffer.from(base64Content, 'base64');
        dadosParaAtualizar.pdf_assinado_base64 = signedPdf;
        pdfBase64ParaSalvar = signedPdf;
      } else if (!assinatura.pdf_assinado_base64) {
        // Baixar PDF usando o método do serviço com a URL configurada no banco de dados
        // Não usar a URL do webhook, usar apenas o documentId para o serviço buscar via API
        try {
          const signatureService = await AssinaturaDigitalController.getSignatureService(
            assinatura.api_provider as 'assinafy' | 'zapsign'
          );
          if (signatureService) {
            const pdfBuffer = await (signatureService as ISignatureService).baixarPdfAssinado(
              documentId,
              certificatedPdfUrl || undefined
            );
            if (pdfBuffer) {
              pdfBufferParaSalvar = pdfBuffer;
              const base64 = pdfBuffer.toString('base64');
              dadosParaAtualizar.pdf_assinado_base64 = base64;
              pdfBase64ParaSalvar = base64;
            }
          }
        } catch (error) {
          // Ignorar erro ao baixar PDF
        }
      } else {
        pdfBase64ParaSalvar = assinatura.pdf_assinado_base64;
        if (pdfBase64ParaSalvar) {
          try {
            const base64Content = pdfBase64ParaSalvar.replace(/^data:.*,/, '');
            pdfBufferParaSalvar = Buffer.from(base64Content, 'base64');
          } catch (error) {
            // Ignorar erro de conversão
          }
        }
      }

      await AssinaturaDigital.update(dadosParaAtualizar, {
        where: { id: assinatura.id }
      });


      // Recarregar assinatura para ter dados atualizados
      await assinatura.reload();

      if (assinatura.cliente_id && pdfBufferParaSalvar) {
        try {
          const arquivoExistente = await ClienteArquivo.findOne({
            where: {
              cliente_id: assinatura.cliente_id,
              referencia_id: assinatura.id,
              referencia_tipo: 'assinatura_digital'
            }
          });

          if (!arquivoExistente) {
            const nomeArquivo = `Documento_Assinado_${assinatura.id}_${Date.now()}.pdf`;
            
            await ClienteArquivoService.createFromBuffer({
              cliente_id: assinatura.cliente_id,
              nome: nomeArquivo,
              tipo: 'assinatura',
              arquivo_buffer: pdfBufferParaSalvar,
              mime_type: 'application/pdf',
              descricao: `Documento assinado digitalmente${assinatura.nome_assinante ? ` - ${assinatura.nome_assinante}` : ''}`,
              origem: 'assinatura_digital',
              referencia_id: assinatura.id,
              referencia_tipo: 'assinatura_digital'
            });
          }
        } catch (error) {
          logger.error('Erro ao salvar PDF assinado como arquivo do cliente', {
            clienteId: assinatura.cliente_id,
            assinaturaId: assinatura.id,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      // Atualizar termo de contrato relacionado
      if (assinatura.termo_contrato_id) {
        const termoContrato = await TermoContrato.findByPk(assinatura.termo_contrato_id);
        if (termoContrato) {
          const dataAceite = new Date();
          const aceitoPor = assinatura.nome_assinante || 'Assinatura Digital';
          
          termoContrato.assinado = 'SIM';
          termoContrato.data_aceite = dataAceite;
          termoContrato.aceito_por = aceitoPor;
          await termoContrato.save();
        }
      }

    if (status === 'canceled' || event === 'document.canceled') {
      assinatura.status = 'cancelado';
      await assinatura.save();
    }
  }
}
