import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { AssinaturaDigital } from '../models/AssinaturaDigital';
import { TermoContrato } from '../models/TermoContrato';
import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { ModeloDocumento } from '../models/ModeloDocumento';
import { ZapsignService } from '../services/ZapsignService';
import { ClienteArquivoService } from '../services/clienteArquivoService';
import { VariaveisDocumentoService } from '../services/VariaveisDocumentoService';
import { AssinaturaDigitalController } from './AssinaturaDigitalController';
import Parametros from '../models/Parametros';

/**
 * Controller específico para ZAPSIGN
 * Todas as rotas e lógica são específicas para este provider
 */
export class AssinaturaDigitalControllerZapsign {
  /**
   * Envia documento para assinatura via ZAPSIGN
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

      // Verificar se ZAPSIGN está habilitado
      const parametros = await Parametros.findOne();
      if (!parametros?.assinatura_digital_habilitado) {
        res.status(400).json({
          success: false,
          message: 'Assinatura digital não está habilitada'
        });
        return;
      }

      if (parametros.assinatura_digital_api_provider !== 'zapsign') {
        res.status(400).json({
          success: false,
          message: 'Provider configurado não é ZAPSIGN'
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

      // Processar variáveis do documento
      if (conteudoHtml && cliente) {
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

      // Gerar PDF usando método do controller principal
      const pdfBase64 = await AssinaturaDigitalController.gerarPdfBase64(
        conteudoHtml || '<html><body><h1>Documento para assinatura</h1></body></html>',
        `termo-${termo_contrato_id || 'documento'}.pdf`
      );

      // Criar serviço ZAPSIGN
      const zapsignService = await ZapsignService.createFromDatabase();
      if (!zapsignService) {
        res.status(500).json({
          success: false,
          message: 'API Key do ZAPSIGN não configurada'
        });
        return;
      }

      const diasExpiracaoFinal = (dias_expiracao as number) || parametros?.assinatura_digital_dias_expiracao_padrao || 30;
      const dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + diasExpiracaoFinal);
      const cpfCnpjLimpo = cpf_cnpj_assinante?.replace(/[.\-\/\s]/g, '') || '';
      
      // Preparar signatários
      const signers = [{
        name: nome_assinante,
        email: email_assinante,
        cpf: cpfCnpjLimpo.length === 11 ? cpfCnpjLimpo : undefined,
        cnpj: cpfCnpjLimpo.length === 14 ? cpfCnpjLimpo : undefined,
        order: 1
      }];
      
      const uploadResult = await zapsignService.uploadDocumento({
        name: `Termo de Contrato ${termo_contrato_id || 'Documento'}`,
        file: pdfBase64,
        signers: signers
      });

      if (!uploadResult.success || !uploadResult.data) {
        res.status(500).json({
          success: false,
          message: uploadResult.message || uploadResult.error || 'Erro ao fazer upload do documento'
        });
        return;
      }

      const documentId = uploadResult.data.id;

      const assinatura = await AssinaturaDigital.create({
        termo_contrato_id: termo_contrato_id || null,
        cliente_id: cliente?.id || cliente_id || null,
        documento_tipo: termo_contrato_id ? 'termo' : 'outro' as const,
        documento_id: termo_contrato_id || null,
        api_provider: 'zapsign',
        api_document_id: documentId,
        status: 'enviado' as const,
        url_assinatura: uploadResult.data.url || null,
        email_assinante,
        nome_assinante,
        cpf_cnpj_assinante: cpfCnpjLimpo || null,
        data_envio: new Date(),
        data_expiracao: dataExpiracao
      });

      res.json({
        success: true,
        message: 'Documento enviado para assinatura via ZAPSIGN com sucesso',
        data: assinatura.toJSON ? assinatura.toJSON() : assinatura
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao enviar documento para assinatura via ZAPSIGN:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: `Erro ao enviar documento para assinatura: ${errorMessage}`
        });
      }
    }
  }

  /**
   * Consulta status de assinatura ZAPSIGN
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

      if (assinatura.api_provider !== 'zapsign') {
        res.status(400).json({
          success: false,
          message: 'Esta assinatura não é do provider ZAPSIGN'
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

      const zapsignService = await ZapsignService.createFromDatabase();
      if (!zapsignService) {
        res.status(500).json({
          success: false,
          message: 'API Key do ZAPSIGN não configurada'
        });
        return;
      }

      const resultado = await zapsignService.consultarStatus(assinatura.api_document_id);

      if (resultado.success && resultado.data) {
        // ZAPSIGN usa 'signed' ou 'completed' para assinado
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
        res.status(500).json({
          success: false,
          message: resultado.error || 'Erro ao consultar status'
        });
      }
    } catch (error) {
      logger.error('Erro ao consultar status ZAPSIGN:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao consultar status da assinatura'
      });
    }
  }

  /**
   * Baixa PDF assinado ZAPSIGN
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

      if (assinatura.api_provider !== 'zapsign') {
        res.status(400).json({
          success: false,
          message: 'Esta assinatura não é do provider ZAPSIGN'
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

      const zapsignService = await ZapsignService.createFromDatabase();
      if (!zapsignService) {
        res.status(500).json({
          success: false,
          message: 'API Key do ZAPSIGN não configurada'
        });
        return;
      }

      const pdfBuffer = await zapsignService.baixarPdfAssinado(assinatura.api_document_id);

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
      logger.error('Erro ao baixar PDF assinado ZAPSIGN:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao baixar PDF assinado'
      });
    }
  }

  /**
   * Cancela assinatura ZAPSIGN
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

      if (assinatura.api_provider !== 'zapsign') {
        res.status(400).json({
          success: false,
          message: 'Esta assinatura não é do provider ZAPSIGN'
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
        const zapsignService = await ZapsignService.createFromDatabase();
        if (zapsignService) {
          await zapsignService.cancelarAssinatura(assinatura.api_document_id);
        }
      }

      assinatura.status = 'cancelado';
      await assinatura.save();

      res.json({
        success: true,
        message: 'Assinatura cancelada com sucesso',
        data: assinatura
      });
    } catch (error) {
      logger.error('Erro ao cancelar assinatura ZAPSIGN:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao cancelar assinatura'
      });
    }
  }
}

