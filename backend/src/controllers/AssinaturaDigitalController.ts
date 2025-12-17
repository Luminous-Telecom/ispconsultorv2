import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { AssinaturaDigital } from '../models/AssinaturaDigital';
import { TermoContrato } from '../models/TermoContrato';
import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { ClienteArquivo } from '../models/ClienteArquivo';
import { ModeloDocumento } from '../models/ModeloDocumento';
import { AssinafyService } from '../services/AssinafyService';
import { ZapsignService } from '../services/ZapsignService';
import { ClienteArquivoService } from '../services/clienteArquivoService';
import { VariaveisDocumentoService } from '../services/VariaveisDocumentoService';
import Parametros from '../models/Parametros';

// Tipo para serviços de assinatura digital
type SignatureService = AssinafyService | ZapsignService;

export class AssinaturaDigitalController {
  /**
   * Obtém o serviço de assinatura digital correto baseado no provider configurado
   * @param providerForced - Provider específico a ser usado (opcional, para casos onde já sabemos qual usar)
   */
  private static async getSignatureService(providerForced?: 'assinafy' | 'zapsign'): Promise<SignatureService | null> {
    try {
      const parametros = await Parametros.findOne();
      
      if (!parametros || !parametros.assinatura_digital_api_key) {
        return null;
      }

      const provider = providerForced || parametros.assinatura_digital_api_provider || 'assinafy';

      switch (provider) {
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
      const parametros = await Parametros.findOne();
      const enabled = parametros?.assinatura_digital_habilitado ?? false;
      return enabled;
    } catch (error) {
      logger.error('Erro ao verificar se assinatura digital está habilitada:', error);
      return false;
    }
  }

  /**
   * Obtém o serviço de geração de PDF (pode ser qualquer um, pois o método é estático)
   */
  private static async gerarPdfBase64(
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

      logger.info('Listando assinaturas digitais', {
        status,
        cliente_id,
        termo_contrato_id
      });

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

      logger.info('Assinaturas listadas com sucesso', {
        total: assinaturas.length,
        filtros: where
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

      logger.debug('Buscando assinatura digital por ID', {
        id
      });

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
        logger.warn('Assinatura digital não encontrada', {
          id
        });
        res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
        return;
      }

      logger.info('Assinatura digital encontrada', {
        id: assinatura.id,
        status: assinatura.status,
        termoContratoId: assinatura.termo_contrato_id,
        clienteId: assinatura.cliente_id
      });

      res.json({
        success: true,
        data: assinatura
      });
    } catch (error) {
      logger.error('Erro ao buscar assinatura:', {
        id: req.params.id,
        error
      });
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

      const signatureService = await AssinaturaDigitalController.getSignatureService();
      if (!signatureService) {
        res.status(500).json({
          success: false,
          message: 'API Key não configurada. Configure em Parâmetros > Assinatura Digital'
        });
        return;
      }

      const parametros = await Parametros.findOne();
      const provider = parametros?.assinatura_digital_api_provider || 'assinafy';

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

      const diasExpiracaoFinal = (dias_expiracao as number) || parametros?.assinatura_digital_dias_expiracao_padrao || 30;
      const dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + diasExpiracaoFinal);
      const uploadResult = await signatureService.uploadDocumento({
        name: `Termo de Contrato ${termo_contrato_id || 'Documento'}`,
        file: pdfBase64
      });

      if (!uploadResult.success || !uploadResult.data) {
        res.status(500).json({
          success: false,
          message: uploadResult.message || uploadResult.error || 'Erro ao fazer upload do documento'
        });
        return;
      }

      const documentId = uploadResult.data.id;
      const cpfCnpjLimpo = cpf_cnpj_assinante?.replace(/[.\-\/\s]/g, '') || '';

      signatureService.processarDocumentoEmBackground(documentId, {
        name: `Termo de Contrato ${termo_contrato_id || 'Documento'}`,
        file: pdfBase64,
        signers: [{
          name: nome_assinante,
          email: email_assinante,
          cpf: cpfCnpjLimpo.length === 11 ? cpfCnpjLimpo : undefined,
          cnpj: cpfCnpjLimpo.length === 14 ? cpfCnpjLimpo : undefined,
          order: 1
        }],
        expiresAt: dataExpiracao.toISOString(),
        message: mensagem || 'Por favor, assine este documento'
      }).catch(error => {
        logger.error('Erro ao processar documento em background', {
          documentId,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      });

      const assinatura = await AssinaturaDigital.create({
        termo_contrato_id: termo_contrato_id || null,
        cliente_id: cliente?.id || cliente_id || null,
        documento_tipo: termo_contrato_id ? 'termo' : 'outro' as const,
        documento_id: termo_contrato_id || null,
        api_provider: provider as 'assinafy' | 'zapsign' | 'govbr' | 'outro',
        api_document_id: documentId,
        status: 'enviado' as const,
        url_assinatura: null,
        email_assinante,
        nome_assinante,
        cpf_cnpj_assinante: cpfCnpjLimpo || null,
        data_envio: new Date(),
        data_expiracao: dataExpiracao
      });

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

      logger.info('Consultando status de assinatura digital', {
        assinaturaId: id
      });

      const assinatura = await AssinaturaDigital.findByPk(id);

      if (!assinatura) {
        logger.warn('Assinatura digital não encontrada para consulta de status', {
          assinaturaId: id
        });
        res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
        return;
      }

      if (!assinatura.api_document_id) {
        logger.warn('Assinatura digital não possui ID da API', {
          assinaturaId: id
        });
        res.status(400).json({
          success: false,
          message: 'Assinatura não possui ID da API'
        });
        return;
      }

      logger.debug('Consultando status na API', {
        assinaturaId: id,
        apiDocumentId: assinatura.api_document_id,
        statusAtual: assinatura.status
      });

      const signatureService = await AssinaturaDigitalController.getSignatureService(
        assinatura.api_provider as 'assinafy' | 'zapsign'
      );
      if (!signatureService) {
        logger.error('Não foi possível criar serviço de assinatura digital para consulta de status');
        res.status(500).json({
          success: false,
          message: 'API Key não configurada. Configure em Parâmetros > Assinatura Digital'
        });
        return;
      }

      const resultado = await signatureService.consultarStatus(assinatura.api_document_id);

      if (resultado.success && resultado.data) {
        const statusAnterior = assinatura.status;
        
        // Atualizar status no banco
        if (resultado.data.status === 'signed' || resultado.data.status === 'completed') {
          await assinatura.marcarComoAssinado();
          
          // Atualizar termo de contrato relacionado se existir
          if (assinatura.termo_contrato_id) {
            const termoContrato = await TermoContrato.findByPk(assinatura.termo_contrato_id);
            if (termoContrato && termoContrato.assinado === 'NAO') {
              termoContrato.assinado = 'SIM';
              termoContrato.data_aceite = new Date();
              termoContrato.aceito_por = assinatura.nome_assinante || 'Assinatura Digital';
              await termoContrato.save();
              logger.info('Termo de contrato atualizado como assinado', {
                termoContratoId: termoContrato.id,
                assinaturaId: id
              });
            }
          }
          
          logger.info('Assinatura marcada como assinada', {
            assinaturaId: id,
            statusAnterior,
            statusNovo: assinatura.status,
            dataAssinatura: assinatura.data_assinatura
          });
        } else if (resultado.data.status === 'canceled') {
          assinatura.status = 'cancelado';
          await assinatura.save();
          logger.info('Assinatura marcada como cancelada', {
            assinaturaId: id,
            statusAnterior,
            statusNovo: assinatura.status
          });
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
          message: resultado.message || 'Erro ao consultar status'
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

      logger.info('Solicitado download de PDF assinado', {
        assinaturaId: id
      });

      const assinatura = await AssinaturaDigital.findByPk(id);

      if (!assinatura) {
        logger.warn('Assinatura digital não encontrada para download', {
          assinaturaId: id
        });
        res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
        return;
      }

      if (assinatura.status !== 'assinado') {
        logger.warn('Tentativa de baixar PDF de documento não assinado', {
          assinaturaId: id,
          status: assinatura.status
        });
        res.status(400).json({
          success: false,
          message: 'Documento ainda não foi assinado'
        });
        return;
      }

      // Se já temos o PDF em base64, retornar direto
      if (assinatura.pdf_assinado_base64) {
        logger.info('PDF assinado encontrado no banco, retornando', {
          assinaturaId: id,
          tamanhoBase64: assinatura.pdf_assinado_base64.length
        });
        const pdfBuffer = Buffer.from(assinatura.pdf_assinado_base64, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="documento-assinado-${id}.pdf"`);
        res.send(pdfBuffer);
        return;
      }

      // Se não, buscar da API
      if (!assinatura.api_document_id) {
        logger.warn('Assinatura não possui ID da API para download', {
          assinaturaId: id
        });
        res.status(400).json({
          success: false,
          message: 'Assinatura não possui ID da API'
        });
        return;
      }

      logger.info('Baixando PDF assinado da API', {
        assinaturaId: id,
        apiDocumentId: assinatura.api_document_id
      });

      const signatureService = await AssinaturaDigitalController.getSignatureService(
        assinatura.api_provider as 'assinafy' | 'zapsign'
      );
      if (!signatureService) {
        logger.error('Não foi possível criar serviço de assinatura digital para download');
        res.status(500).json({
          success: false,
          message: 'API Key não configurada. Configure em Parâmetros > Assinatura Digital'
        });
        return;
      }

      const pdfBuffer = await signatureService.baixarPdfAssinado(assinatura.api_document_id);

      if (!pdfBuffer) {
        logger.error('Falha ao baixar PDF assinado da API', {
          assinaturaId: id,
          apiDocumentId: assinatura.api_document_id
        });
        res.status(500).json({
          success: false,
          message: 'Erro ao baixar PDF assinado'
        });
        return;
      }

      // Salvar PDF em base64 no banco
      assinatura.pdf_assinado_base64 = pdfBuffer.toString('base64');
      await assinatura.save();

      logger.info('PDF assinado baixado e salvo no banco', {
        assinaturaId: id,
        tamanhoBytes: pdfBuffer.length
      });

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

      logger.info('Cancelando assinatura digital', {
        assinaturaId: id
      });

      const assinatura = await AssinaturaDigital.findByPk(id);

      if (!assinatura) {
        logger.warn('Assinatura digital não encontrada para cancelamento', {
          assinaturaId: id
        });
        res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
        return;
      }

      if (assinatura.status === 'assinado') {
        logger.warn('Tentativa de cancelar assinatura já concluída', {
          assinaturaId: id,
          status: assinatura.status
        });
        res.status(400).json({
          success: false,
          message: 'Não é possível cancelar uma assinatura já concluída'
        });
        return;
      }

      if (assinatura.api_document_id) {
        logger.info('Cancelando assinatura na API', {
          assinaturaId: id,
          apiDocumentId: assinatura.api_document_id
        });
        const signatureService = await AssinaturaDigitalController.getSignatureService(
          assinatura.api_provider as 'assinafy' | 'zapsign'
        );
        if (signatureService) {
          const resultado = await signatureService.cancelarAssinatura(assinatura.api_document_id);
          logger.info('Resultado do cancelamento na API', {
            assinaturaId: id,
            sucesso: resultado.success
          });
        } else {
          logger.warn('Não foi possível criar serviço de assinatura digital para cancelamento', {
            assinaturaId: id
          });
        }
      }

      const statusAnterior = assinatura.status;
      assinatura.status = 'cancelado';
      await assinatura.save();

      logger.info('Assinatura cancelada com sucesso', {
        assinaturaId: id,
        statusAnterior,
        statusNovo: assinatura.status
      });

      res.json({
        success: true,
        message: 'Assinatura cancelada com sucesso',
        data: assinatura
      });
    } catch (error) {
      logger.error('Erro ao cancelar assinatura:', {
        assinaturaId: req.params.id,
        error
      });
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
   * Webhook para receber atualizações das APIs de assinatura digital (Assinafy e ZAPSIGN)
   */
  static async webhook(req: Request, res: Response): Promise<void> {
    try {
      // Retornar 200 OK imediatamente (antes de validar para evitar timeout)
      res.status(200).json({
        success: true,
        message: 'Webhook recebido'
      });

      // Detectar provider baseado na estrutura do webhook
      // Assinafy: geralmente tem object.id, object.status
      // ZAPSIGN: geralmente tem document_id, status direto no body
      let documentId: string | undefined;
      let status: string | undefined;
      let signedPdf: string | undefined;
      let event: string | undefined;
      let signingUrl: string | undefined;
      let certificatedPdfUrl: string | undefined;
      let assignmentCompletedCount: number | undefined;
      let assignmentSignerCount: number | undefined;
      let provider: 'assinafy' | 'zapsign' | undefined;

      // Tentar detectar Assinafy (estrutura com object)
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
      }
      // Tentar detectar ZAPSIGN (estrutura mais simples)
      else if (req.body?.document_id || req.body?.id) {
        provider = 'zapsign';
        documentId = req.body.document_id || req.body.id;
        status = req.body.status;
        event = req.body.event || req.body.type;
        signingUrl = req.body.signing_url || req.body.url;
        certificatedPdfUrl = req.body.download_url || req.body.pdf_url;
        signedPdf = req.body.signed_pdf || req.body.pdf_base64;
      }
      // Fallback: tentar campos genéricos
      else {
        documentId = req.body?.document_id || req.body?.id || req.body?.data?.id || req.body?.data?.document_id;
        status = req.body?.status || req.body?.data?.status;
        event = req.body?.event || req.body?.type || req.body?.data?.event;
        signingUrl = req.body?.signing_url || req.body?.url;
        certificatedPdfUrl = req.body?.download_url || req.body?.pdf_url || req.body?.certificated_pdf_url;
        signedPdf = req.body?.signed_pdf || req.body?.signedPdf || req.body?.pdf_base64;
      }

      if (!documentId) {
        logger.warn('Webhook recebido sem document_id', {
          body: req.body,
          provider: provider || 'desconhecido'
        });
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

      logger.info('Webhook recebido', {
        documentId,
        provider: provider || 'desconhecido',
        status,
        event
      });

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
        .catch(error => {
          logger.error('Erro ao processar webhook em background', {
            documentId,
            provider: provider || 'desconhecido',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            stack: error instanceof Error ? error.stack : undefined
          });
        });
    } catch (error) {
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

    // Buscar assinatura com diferentes formatos do ID
    let assinatura = await AssinaturaDigital.findOne({
      where: { api_document_id: String(documentId) }
    });

    // Se não encontrou, tentar como número
    if (!assinatura && !isNaN(Number(documentId))) {
      assinatura = await AssinaturaDigital.findOne({
        where: { api_document_id: Number(documentId) }
      });
    }

    // Se ainda não encontrou, listar assinaturas recentes para debug
    if (!assinatura) {
      const assinaturasRecentes = await AssinaturaDigital.findAll({
        limit: 5,
        order: [['created_at', 'DESC']],
        attributes: ['id', 'api_document_id', 'status', 'termo_contrato_id', 'created_at']
      });

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
    // ZAPSIGN: status 'signed' ou 'completed'
    const isAssinado = 
      status === 'certificated' || 
      event === 'document_ready' ||
      status === 'signed' ||
      status === 'completed' ||
      (provider === 'zapsign' && (status === 'signed' || status === 'completed'));

    if (isAssinado && assinatura.status !== 'assinado') {
      const dadosParaAtualizar: Record<string, unknown> = {
        status: 'assinado',
        data_assinatura: new Date()
      };
      
      if (certificatedPdfUrl) {
        dadosParaAtualizar.pdf_assinado_url = certificatedPdfUrl;
      }

      // Usar PDF do webhook se disponível
      let pdfBase64ParaSalvar: string | null = null;
      
      if (signedPdf) {
        dadosParaAtualizar.pdf_assinado_base64 = signedPdf;
        pdfBase64ParaSalvar = signedPdf;
      } else if (!assinatura.pdf_assinado_base64) {
        // Tentar baixar PDF se não foi fornecido no webhook e não há base64 salvo
        try {
          const signatureService = await AssinaturaDigitalController.getSignatureService(
            assinatura.api_provider as 'assinafy' | 'zapsign'
          );
          if (signatureService) {
            const pdfBuffer = await signatureService.baixarPdfAssinado(documentId);
            if (pdfBuffer) {
              const base64 = pdfBuffer.toString('base64');
              dadosParaAtualizar.pdf_assinado_base64 = base64;
              pdfBase64ParaSalvar = base64;
            }
          }
        } catch (error) {
          logger.warn('Erro ao baixar PDF assinado', {
            documentId,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      } else {
        // Usar PDF já salvo anteriormente
        pdfBase64ParaSalvar = assinatura.pdf_assinado_base64;
      }

      await AssinaturaDigital.update(dadosParaAtualizar, {
        where: { id: assinatura.id }
      });

      // Recarregar assinatura para ter dados atualizados
      await assinatura.reload();

      // Salvar PDF assinado como arquivo do cliente
      if (assinatura.cliente_id && pdfBase64ParaSalvar) {
        try {
          // Verificar se já existe arquivo vinculado a esta assinatura
          const arquivoExistente = await ClienteArquivo.findOne({
            where: {
              cliente_id: assinatura.cliente_id,
              referencia_id: assinatura.id,
              referencia_tipo: 'assinatura_digital'
            }
          });

          // Só criar se não existir
          if (!arquivoExistente) {
            // Gerar nome do arquivo
            const nomeArquivo = `Documento_Assinado_${assinatura.id}_${Date.now()}.pdf`;
            
            // Preparar base64 com prefixo se necessário
            const pdfBase64ComPrefixo = pdfBase64ParaSalvar.startsWith('data:') 
              ? pdfBase64ParaSalvar 
              : `data:application/pdf;base64,${pdfBase64ParaSalvar}`;
            
            // Criar registro de arquivo do cliente usando método auxiliar para base64
            await ClienteArquivoService.createFromBase64({
              cliente_id: assinatura.cliente_id,
              nome: nomeArquivo,
              tipo: 'assinatura',
              arquivo_base64: pdfBase64ComPrefixo,
              mime_type: 'application/pdf',
              descricao: `Documento assinado digitalmente${assinatura.nome_assinante ? ` - ${assinatura.nome_assinante}` : ''}`,
              origem: 'assinatura_digital',
              referencia_id: assinatura.id,
              referencia_tipo: 'assinatura_digital'
            });

            logger.info('PDF assinado salvo como arquivo do cliente', {
              clienteId: assinatura.cliente_id,
              assinaturaId: assinatura.id,
              nomeArquivo
            });
          } else {
            logger.info('Arquivo já existe para esta assinatura, pulando criação', {
              clienteId: assinatura.cliente_id,
              assinaturaId: assinatura.id,
              arquivoId: arquivoExistente.id
            });
          }
        } catch (error) {
          logger.error('Erro ao salvar PDF assinado como arquivo do cliente', {
            clienteId: assinatura.cliente_id,
            assinaturaId: assinatura.id,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            stack: error instanceof Error ? error.stack : undefined
          });
          // Não crítico, continua o processamento
        }
      }

      // Atualizar termo de contrato relacionado
      if (assinatura.termo_contrato_id) {
        const termoContrato = await TermoContrato.findByPk(assinatura.termo_contrato_id);
        if (termoContrato) {
          const dataAceite = new Date();
          const aceitoPor = assinatura.nome_assinante || 'Assinatura Digital';
          
          logger.info('Atualizando termo de contrato como assinado', {
            termoContratoId: termoContrato.id,
            statusAnterior: termoContrato.assinado,
            dataAceiteAnterior: termoContrato.data_aceite,
            aceitoPorAnterior: termoContrato.aceito_por
          });

          termoContrato.assinado = 'SIM';
          termoContrato.data_aceite = dataAceite;
          termoContrato.aceito_por = aceitoPor;
          await termoContrato.save();

          logger.info('✅ Termo de contrato atualizado com sucesso', {
            termoContratoId: termoContrato.id,
            assinado: termoContrato.assinado,
            dataAceite: termoContrato.data_aceite,
            aceitoPor: termoContrato.aceito_por
          });
        } else {
          logger.warn('Termo de contrato não encontrado para atualização', {
            termoContratoId: assinatura.termo_contrato_id
          });
        }
      }

    } else if (status === 'canceled' || event === 'document.canceled') {
      assinatura.status = 'cancelado';
      await assinatura.save();
    }
  }
}
