import { Request, Response } from 'express';
import { AsaasWebhookService } from '../../../services/webhooks/AsaasWebhookService';
import { logger } from '../../../utils/logger';
import { JsonValue } from '../../../types/index';
import { AsaasPaymentPayload } from '../../../types/webhooks';
import { sendSuccess, sendError, sendValidationError, sendUnauthorized } from '../../../utils/responseUtils';
import { assignWebhookClientIp } from '../../../utils/requestUtils';

/**
 * Controller para webhooks do Asaas
 * Responsável por validar requisição (token obrigatório) e delegar processamento ao service
 */
export class AsaasWebhookController {
  /**
   * Processa webhook do Asaas
   * Valida token (obrigatório) e delega processamento ao service
   */
  static async handle(req: Request, res: Response): Promise<void> {
    (req as import('../../../types/webhooks').WebhookRequest).webhookEmpresaIdentifier = req.params?.empresaIdentifier;
    const startTime = Date.now();
    const clientIp = assignWebhookClientIp(req);
    const userAgent = req.get('user-agent') || 'unknown';
    
    try {
      const payload = req.body as AsaasPaymentPayload | Record<string, JsonValue> | undefined;


      // Validar payload básico
      if (!payload || typeof payload !== 'object') {
        sendValidationError(res, 'Payload inválido');
        return;
      }

      // Extrair secret/token de headers ou payload
      const receivedSecret =
        req.get('asaas-access-token') ||
        req.get('access_token') ||
        (typeof payload?.token === 'string' ? payload.token : undefined);

      // Log de informações do payload (sem dados sensíveis)
      const eventType = (payload as Record<string, JsonValue>).event as string | undefined;
      const payloadId = (payload as Record<string, JsonValue>).id as string | undefined;

      // Extrair objeto payment ou invoice
      const payment = (payload.payment && typeof payload.payment === 'object' && !Array.isArray(payload.payment))
        ? payload.payment as AsaasPaymentPayload['payment']
        : undefined;

      const invoice = (payload && 'invoice' in payload && typeof payload.invoice === 'object' && !Array.isArray(payload.invoice))
        ? payload.invoice as AsaasPaymentPayload['invoice']
        : undefined;

      // Se não tem payment.id nem invoice.id, retornar sucesso (webhook pode vir sem dados)
      if ((!payment || !payment.id) && (!invoice || !invoice.id)) {
        sendSuccess(res, undefined, 'Webhook recebido sem payment.id ou invoice.id');
        return;
      }

      // Buscar token esperado (de qualquer banco Asaas)
      const expectedSecret = await AsaasWebhookService.findExpectedToken(null);

      // Validar token (obrigatório para Asaas)
      if (!expectedSecret) {
        sendUnauthorized(res, 'Token do webhook não configurado');
        return;
      }

      if (!receivedSecret || receivedSecret !== expectedSecret) {
        sendUnauthorized(res, 'Token do webhook inválido');
        return;
      }

      // Log do evento recebido e validado

      // Retornar 200 OK imediatamente (webhook recebido e validado com sucesso)
      sendSuccess(res, undefined, 'Webhook recebido');

      // Processar webhook em background (sem await)
      if (payment && payment.id) {
        const rootPayload = { dateCreated: (payload as AsaasPaymentPayload).dateCreated };
        AsaasWebhookService.processWebhook(payment, req, rootPayload).catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          logger.error('Erro ao processar webhook Asaas (payment) em background', {
            payment_id: payment.id,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
          });
        });
      } else if (invoice && invoice.id) {
        // Processar webhook de invoice (NFS-e)
        AsaasWebhookService.processInvoiceWebhook(invoice, eventType, req).catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          logger.error('Erro ao processar webhook Asaas (invoice) em background', {
            invoice_id: invoice.id,
            event: eventType,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
          });
        });
      }

      // Log de conclusão
      const processingTime = Date.now() - startTime;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const processingTime = Date.now() - startTime;
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'AsaasWebhookController',
        action: 'handle',
        ip: clientIp,
        processing_time_ms: processingTime
      });
    }
  }
}

