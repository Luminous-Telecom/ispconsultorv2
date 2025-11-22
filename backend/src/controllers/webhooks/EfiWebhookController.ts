import { Request, Response } from 'express';
import { EfiWebhookService } from '../../services/webhooks/EfiWebhookService';
import { PaymentCommonService } from '../../services/webhooks/PaymentCommonService';
import { logger } from '../../utils/logger';
import { JsonValue } from '../../types/index';
import {
  NotificationItem,
  ChargeNotification,
  WebhookResponse
} from '../../types/webhooks';

/**
 * Controller para webhooks da EFI (Efí/Gerencianet)
 * Responsável por validar requisição e delegar processamento ao service
 */
export class EfiWebhookController {
  /**
   * Processa webhook da EFI
   * Valida payload, extrai secret e delega processamento ao service
   */
  static async handle(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as Record<string, JsonValue> | undefined;

      // Extrair secret/token de headers ou payload
      const receivedSecret =
        req.get('asaas-access-token') ||
        req.get('efi-access-token') ||
        req.get('x-internal-webhook-secret') ||
        (typeof payload?.secret === 'string' ? payload.secret : undefined) ||
        (typeof payload?.token === 'string' ? payload.token : undefined);

      // Verificar se é um token de notificação (form-urlencoded)
      // Neste caso, precisa processar sincronamente pois retorna resultado da consulta
      if (
        req.get('Content-Type') === 'application/x-www-form-urlencoded' &&
        payload?.notification &&
        typeof payload.notification === 'string' &&
        !Array.isArray(payload.notification)
      ) {
        const notificationToken = payload.notification as string;
        logger.info(`Token de notificação recebido: ${notificationToken}`);

        // Processar token de notificação - consultar API do EFI
        // Este precisa ser síncrono pois retorna resultado da consulta
        const result = await EfiWebhookService.processNotificationToken(
          notificationToken,
          receivedSecret
        );
        res.status(result.status || 200).json(result);
        return;
      }

      // Validar estrutura básica do payload
      if (!payload || (typeof payload !== 'object')) {
        logger.warn('Payload inválido ou ausente');
        res.status(400).json({
          success: false,
          message: 'Payload inválido'
        });
        return;
      }

      // Verificar se é uma notificação válida da Efí
      if (!payload.notification && !payload.charge && !payload.pix) {
        logger.warn('Payload não contém campos esperados da Efí');
        res.status(400).json({
          success: false,
          message: 'Payload inválido'
        });
        return;
      }

      // Determinar tipo de notificação
      let notificationType = '';
      let notification: NotificationItem | ChargeNotification | null = null;

      if (payload.notification) {
        notification = payload.notification as NotificationItem;
        notificationType = notification.type || '';
      } else if (payload.charge) {
        notification = payload.charge as ChargeNotification;
        notificationType = 'charge_' + ((notification.status as string) || 'unknown');
      } else if (payload.pix) {
        notification = payload.pix as NotificationItem;
        notificationType = 'pix_' + ((notification.status as string) || 'unknown');
      }

      logger.info(`Tipo de notificação identificado: ${notificationType}`);

      // Retornar 200 OK imediatamente (webhook recebido com sucesso)
      res.status(200).json({
        success: true,
        message: 'Webhook recebido'
      });

      // Processar notificação em background (sem await)
      EfiWebhookController.processNotificationInBackground(
        notificationType,
        notification,
        receivedSecret
      ).catch(error => {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error('Erro ao processar webhook EFI em background', {
          notificationType,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao processar webhook EFI', {
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Processa notificação em background (sem bloquear resposta)
   */
  private static async processNotificationInBackground(
    notificationType: string,
    notification: NotificationItem | ChargeNotification | null,
    receivedSecret?: string
  ): Promise<void> {
    if (!notification) {
      logger.warn('Notificação nula, não é possível processar');
      return;
    }

    try {
      // Processar diferentes tipos de notificação
      switch (notificationType) {
        case 'charge_paid':
        case 'charge_settled':
        case 'charge_canceled':
        case 'charge_expired':
        case 'charge_waiting':
        case 'charge_pending':
          await EfiWebhookService.processChargeNotification(
            notification as ChargeNotification | NotificationItem,
            receivedSecret
          );
          break;

        case 'pix_paid':
        case 'pix_settled':
        case 'pix_canceled':
        case 'pix_expired':
        case 'pix_waiting':
        case 'pix_pending':
          await EfiWebhookService.processPixNotification(
            notification as NotificationItem,
            receivedSecret
          );
          break;

        // Processar notificações genéricas
        case 'payment':
        case 'paid':
        case 'settled':
        case 'canceled':
        case 'expired':
          logger.info(`Processando notificação genérica: ${notificationType}`);
          await EfiWebhookService.processGenericNotification(
            notification as NotificationItem | ChargeNotification,
            receivedSecret
          );
          break;

        default:
          logger.warn(`Tipo de notificação não reconhecido: ${notificationType}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar notificação em background', {
        notificationType,
        error: errorMessage
      });
      throw error;
    }
  }
}

