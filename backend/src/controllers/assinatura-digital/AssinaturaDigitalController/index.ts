import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { AssinaturaDigitalService } from '../../../services/assinatura-digital/AssinaturaDigitalService';
import { TermoContratoService } from '../../../services/contratos/TermoContratoService';
import { AssinafyService } from '../../../services/assinatura-digital/AssinafyService';
import { AssinaturaEnvioService } from '../../../services/assinatura-digital/AssinaturaEnvioService';
import { AssinaturaWebhookProcessorService } from '../../../services/assinatura-digital/AssinaturaWebhookProcessorService';
import { registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { getCurrentTimestamp } from '../../../utils/timezoneUtils';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

// Interface comum para serviços de assinatura digital
interface ISignatureService {
  uploadDocumento(documento: { name: string; file: string; signers?: Array<{ name: string; email: string; cpf?: string; cnpj?: string; order?: number }> }): Promise<{ success: boolean; data?: { id: string; url?: string; status: string }; error?: string; message?: string }>;
  processarDocumentoEmBackground?(documentId: string, documento: { name?: string; file?: string; signers: Array<{ name: string; email: string; cpf?: string; cnpj?: string; order?: number }>; expiresAt?: string; message?: string }): Promise<void>;
  consultarStatus(documentId: string): Promise<{ success: boolean; data?: { id: string; url?: string; status: string }; error?: string }>;
  baixarPdfAssinado(documentId: string, url?: string): Promise<Buffer | null>;
  cancelarAssinatura(documentId: string): Promise<{ success: boolean; error?: string }>;
}

export class AssinaturaDigitalController {


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
      const empresaId = getEmpresaIdOrNull(req);

      const assinaturas = await AssinaturaDigitalService.list({
        status: status as string,
        cliente_id: cliente_id as string | number,
        termo_contrato_id: termo_contrato_id as string | number,
        empresa_id: empresaId ?? undefined
      });

      sendSuccess(res, assinaturas);
    } catch (error) {
      sendError(res, error, 'Erro ao listar assinaturas', 500, true);
    }
  }

  /**
   * Obtém assinatura por ID (respeitando empresa_id)
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);

      const assinatura = await AssinaturaDigitalService.getById(id, empresaId);

      if (!assinatura) {
        sendNotFound(res, 'Assinatura não encontrada');
        return;
      }

      sendSuccess(res, assinatura);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar assinatura', 500, true);
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
        sendValidationError(res, 'Email e nome do assinante são obrigatórios');
        return;
      }

      const assinatura = await AssinaturaEnvioService.enviarParaAssinatura({
        termo_contrato_id,
        cliente_id,
        email_assinante,
        nome_assinante,
        cpf_cnpj_assinante,
        mensagem,
        dias_expiracao,
        req: req as AuthenticatedRequest
      });

      sendSuccess(res, assinatura.toJSON ? assinatura.toJSON() : assinatura, 'Documento enviado para assinatura com sucesso');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('não encontrado')) {
          sendNotFound(res, error.message);
          return;
        }
        if (error.message.includes('obrigatórios') || error.message.includes('não possui')) {
          sendValidationError(res, error.message);
          return;
        }
        if (error.message.includes('não está habilitada') || error.message.includes('não configurada')) {
          sendError(res, error, error.message, 500, false);
          return;
        }
      }
      sendError(res, error, 'Erro ao enviar documento para assinatura', 500, true);
    }
  }

  /**
   * Consulta status de uma assinatura (respeitando empresa_id)
   */
  static async consultarStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);

      const assinatura = await AssinaturaDigitalService.getById(id, empresaId);

      if (!assinatura) {
        sendNotFound(res, 'Assinatura não encontrada');
        return;
      }

      if (!assinatura.api_document_id) {
        sendValidationError(res, 'Assinatura não possui ID da API');
        return;
      }

      const signatureService = await AssinaturaEnvioService.getSignatureService(
        assinatura.api_provider as 'assinafy' | 'zapsign',
        assinatura.empresa_id
      );
      if (!signatureService) {
        sendError(res, new Error('API Key não configurada. Configure em Parâmetros > Assinatura Digital'), 'API Key não configurada. Configure em Parâmetros > Assinatura Digital', 500, false);
        return;
      }

      const resultado = await (signatureService as ISignatureService).consultarStatus(assinatura.api_document_id);

      if (resultado.success && resultado.data) {
        if (resultado.data.status === 'signed' || resultado.data.status === 'completed') {
          await assinatura.marcarComoAssinado();
          
          if (assinatura.termo_contrato_id) {
            const termoContrato = await TermoContratoService.getById(assinatura.termo_contrato_id);
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

        sendSuccess(res, {
          ...assinatura.toJSON(),
          status_api: resultado.data.status,
          url_assinatura: resultado.data.url
        });
      } else {
        logger.error('Erro ao consultar status na API', {
          assinaturaId: id,
          resultado
        });
        sendError(res, new Error(resultado.error || 'Erro ao consultar status'), resultado.error || 'Erro ao consultar status', 500, false);
      }
    } catch (error) {
      sendError(res, error, 'Erro ao consultar status da assinatura', 500, true, {
        assinaturaId: req.params.id
      });
    }
  }

  /**
   * Baixa PDF assinado (respeitando empresa_id)
   */
  static async baixarPdfAssinado(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);

      const assinatura = await AssinaturaDigitalService.getById(id, empresaId);

      if (!assinatura) {
        sendNotFound(res, 'Assinatura não encontrada');
        return;
      }

      if (assinatura.status !== 'assinado') {
        sendValidationError(res, 'Documento ainda não foi assinado');
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
        sendValidationError(res, 'Assinatura não possui ID da API');
        return;
      }

      const signatureService = await AssinaturaEnvioService.getSignatureService(
        assinatura.api_provider as 'assinafy' | 'zapsign',
        assinatura.empresa_id
      );
      if (!signatureService) {
        sendError(res, new Error('API Key não configurada. Configure em Parâmetros > Assinatura Digital'), 'API Key não configurada. Configure em Parâmetros > Assinatura Digital', 500, false);
        return;
      }

      const pdfBuffer = await (signatureService as ISignatureService).baixarPdfAssinado(assinatura.api_document_id);

      if (!pdfBuffer) {
        sendError(res, new Error('Erro ao baixar PDF assinado'), 'Erro ao baixar PDF assinado', 500, false);
        return;
      }

      assinatura.pdf_assinado_base64 = pdfBuffer.toString('base64');
      await assinatura.save();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="documento-assinado-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      sendError(res, error, 'Erro ao baixar PDF assinado', 500, true, {
        assinaturaId: req.params.id
      });
    }
  }

  /**
   * Cancela assinatura pendente (respeitando empresa_id)
   */
  static async cancelar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);

      const assinatura = await AssinaturaDigitalService.getById(id, empresaId);

      if (!assinatura) {
        sendNotFound(res, 'Assinatura não encontrada');
        return;
      }

      if (assinatura.status === 'assinado') {
        sendValidationError(res, 'Não é possível cancelar uma assinatura já concluída');
        return;
      }

      if (assinatura.api_document_id) {
        const signatureService = await AssinaturaEnvioService.getSignatureService(
          assinatura.api_provider as 'assinafy' | 'zapsign',
          assinatura.empresa_id
        );
        if (signatureService) {
          await (signatureService as ISignatureService).cancelarAssinatura(assinatura.api_document_id);
        }
      }

      const dadosAnteriores = assinatura.toJSON();
      assinatura.status = 'cancelado';
      await assinatura.save();

      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? assinatura.empresa_id ?? null;
        await registrarExclusao(
          req as AuthenticatedRequest,
          'AssinaturaDigital',
          assinatura.id,
          dadosAnteriores as Record<string, unknown>,
          'Assinatura cancelada',
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, assinatura, 'Assinatura cancelada com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao cancelar assinatura', 500, true);
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
    const timestamp = getCurrentTimestamp();
    (req as Request & { webhookClientIp?: string }).webhookClientIp = req.ip || req.socket.remoteAddress || 'unknown';

    try {
      sendSuccess(res, { timestamp }, 'Webhook Assinafy recebido', 200);

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

      AssinaturaWebhookProcessorService.processarWebhookEmBackground(
        documentId, 
        status, 
        signedPdf, 
        event,
        assignmentCompletedCount,
        assignmentSignerCount,
        signingUrl,
        certificatedPdfUrl,
        'assinafy',
        req
      )
        .catch((error: unknown) => {
          logger.error('Erro ao processar webhook Assinafy em background', {
            documentId,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        });
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao processar webhook Assinafy', 500, true);
    }
  }

  /**
   * Webhook específico para ZAPSIGN
   */
  static async webhookZapsign(req: Request, res: Response): Promise<void> {
    (req as Request & { webhookClientIp?: string }).webhookClientIp = req.ip || req.socket.remoteAddress || 'unknown';

    try {
      sendSuccess(res, undefined, 'Webhook ZAPSIGN recebido', 200);

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
      AssinaturaWebhookProcessorService.processarWebhookEmBackground(
        documentId, 
        status, 
        signedPdf,
        event,
        undefined,
        undefined,
        signingUrl,
        certificatedPdfUrl,
        'zapsign',
        req
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
    const timestamp = getCurrentTimestamp();
    (req as Request & { webhookClientIp?: string }).webhookClientIp = req.ip || req.socket.remoteAddress || 'unknown';

    try {
      sendSuccess(res, { timestamp }, 'Webhook recebido', 200);

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
        const assinatura = await AssinaturaDigitalService.getByApiDocumentIdWithAttributes(
          documentId,
          ['api_provider']
        );
        if (assinatura) {
          provider = assinatura.api_provider as 'assinafy' | 'zapsign';
        }
      }

      // Processar em background
      AssinaturaWebhookProcessorService.processarWebhookEmBackground(
        documentId, 
        status, 
        signedPdf, 
        event,
        assignmentCompletedCount,
        assignmentSignerCount,
        signingUrl,
        certificatedPdfUrl,
        provider,
        req
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
      sendError(res, error, 'Erro ao processar webhook', 500, true);
    }
  }

}
