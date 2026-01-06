import { Request, Response } from 'express';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Banco } from '../../../models/cadastros/Banco';
import { AsaasWebhookService } from '../../../services/webhooks/AsaasWebhookService';
import { logger } from '../../../utils/logger';
import { JsonValue } from '../../../types/index';
import { AsaasPaymentPayload } from '../../../types/webhooks';

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
    const startTime = Date.now();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    
    try {
      const payload = req.body as AsaasPaymentPayload | Record<string, JsonValue> | undefined;


      // Validar payload básico
      if (!payload || typeof payload !== 'object') {
        res.status(400).json({
          success: false,
          message: 'Payload inválido'
        });
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
        res.status(200).json({
          success: true,
          message: 'Webhook recebido sem payment.id ou invoice.id'
        });
        return;
      }

      // Buscar token esperado (de qualquer banco Asaas)
      const expectedSecret = await AsaasWebhookService.findExpectedToken(null);

      // Validar token (obrigatório para Asaas)
      if (!expectedSecret) {
        res.status(401).json({
          success: false,
          message: 'Token do webhook não configurado'
        });
        return;
      }

      if (!receivedSecret || receivedSecret !== expectedSecret) {
        res.status(401).json({
          success: false,
          message: 'Token do webhook inválido'
        });
        return;
      }

      // Log do evento recebido e validado

      // Retornar 200 OK imediatamente (webhook recebido e validado com sucesso)
      res.status(200).json({
        success: true,
        message: 'Webhook recebido'
      });

      // Processar webhook em background (sem await)
      if (payment && payment.id) {
        const chargeId = String(payment.id);
        const titulo = await Titulo.findOne({
          where: { charge_id: chargeId },
          include: [{ model: Banco, as: 'banco' }]
        }) as (Titulo & { banco?: Banco | null }) | null;

        if (titulo) {
          AsaasWebhookService.processWebhook(payment, titulo).catch(error => {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            logger.error('Erro ao processar webhook Asaas (payment) em background', {
              charge_id: chargeId,
              titulo_id: titulo.id,
              error: errorMessage,
              stack: error instanceof Error ? error.stack : undefined
            });
          });
        }
      } else if (invoice && invoice.id) {
        // Processar webhook de invoice (NFS-e)
        AsaasWebhookService.processInvoiceWebhook(invoice).catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          logger.error('Erro ao processar webhook Asaas (invoice) em background', {
            invoice_id: invoice.id,
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
      logger.error('Erro ao processar webhook Asaas', {
        error: errorMessage,
        stack: errorStack,
        ip: clientIp,
        processing_time_ms: processingTime
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

