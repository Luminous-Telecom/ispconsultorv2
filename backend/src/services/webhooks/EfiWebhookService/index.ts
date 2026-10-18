import { toPlain } from '../../../utils/toPlain';
import { Request } from 'express';
import { Banco } from '../../../models/cadastros/Banco';
import { Titulo } from '../../../models/financeiro/Titulo';
import { prisma } from '../../../db/prisma';
import { BancoApiService } from '../../bancos/BancoApiService';
import { PaymentCommonService } from '../PaymentCommonService';
import { logger } from '../../../utils/logger';
import {
  WebhookResponse,
  NotificationData,
  NotificationItem,
  ChargeNotification
} from '../../../types/webhooks';
import { EfiWebhookValidatorService } from '../EfiWebhookValidatorService';
import { EfiWebhookProcessorService } from '../EfiWebhookProcessorService';

/**
 * Serviço para processamento de webhooks da EFI (Efí/Gerencianet)
 */
export class EfiWebhookService {
  /**
   * Processa token de notificação (form-urlencoded)
   */
  static async processNotificationToken(
    notificationToken: string,
    receivedSecret?: string,
    req?: Request
  ): Promise<WebhookResponse> {
    try {
      const scope = PaymentCommonService.getWebhookScope(req);
      const { TituloWebhookResolver } = await import('../TituloWebhookResolver');
      const banco = await TituloWebhookResolver.resolveBancoFromWebhookIdentifier(
        scope?.empresaIdentifier,
        'efi'
      );

      if (!banco) {
        return {
          success: false,
          message: scope?.empresaIdentifier
            ? 'Banco informado no webhook não encontrado (ID ou identificador da conta Efi)'
            : 'Identificador do banco é obrigatório no webhook',
          status: scope?.empresaIdentifier ? 404 : 400
        };
      }

      // BancoApiService tipa Prisma; o resolver devolve o model Sequelize.
      const bancoPrisma = await prisma.cadastros_bancos.findUnique({ where: { id: banco.id } });
      if (!bancoPrisma) {
        return {
          success: false,
          message: 'Banco informado no webhook não encontrado',
          status: 404
        };
      }

      const resultado = await BancoApiService.consultarNotificacaoPorToken(
        bancoPrisma,
        notificationToken,
        'admin'
      );

      if (resultado.success && resultado.data) {
        return await EfiWebhookProcessorService.processNotificationData(
          resultado.data as NotificationData | NotificationItem[] | NotificationItem,
          banco,
          receivedSecret,
          req
        );
      }

      return {
        success: false,
        message: resultado.message || 'Não foi possível consultar a notificação',
        status: 400
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar token de notificação', {
        token: notificationToken,
        error: errorMessage
      });
      return {
        success: false,
        message: 'Erro ao processar token de notificação',
        status: 500
      };
    }
  }

  /**
   * Processa dados da notificação retornados pela API EFI
   */
  static async processNotificationData(
    dados: NotificationData | NotificationItem[] | NotificationItem,
    banco: Banco,
    receivedSecret?: string,
    req?: Request
  ): Promise<WebhookResponse> {
    return await EfiWebhookProcessorService.processNotificationData(dados, banco, receivedSecret, req);
  }

  /**
   * Processa notificação individual (delegado para EfiWebhookProcessorService)
   */
  static async processIndividualNotification(
    notificacao: NotificationItem,
    banco: Banco,
    receivedSecret?: string,
    req?: Request
  ): Promise<number> {
    return await EfiWebhookProcessorService.processIndividualNotification(notificacao, banco, receivedSecret, req);
  }

  /**
   * Processa notificação de charge (formato direto) - delegado para EfiWebhookProcessorService
   */
  static async processChargeNotification(
    notification: ChargeNotification | NotificationItem,
    receivedSecret?: string,
    bancoContext?: Banco,
    req?: Request
  ): Promise<WebhookResponse> {
    return await EfiWebhookProcessorService.processChargeNotification(notification, receivedSecret, bancoContext, req);
  }

  /**
   * Processa notificação de PIX
   */
  static async processPixNotification(
    notification: NotificationItem,
    receivedSecret?: string,
    req?: Request
  ): Promise<WebhookResponse> {
    try {
      logger.info('Processando notificação de PIX', { notification });

      // Implementar lógica específica para PIX se necessário
      // Por enquanto, tratar como notificação genérica
      return await EfiWebhookProcessorService.processChargeNotification(notification, receivedSecret, undefined, req);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar notificação de PIX', {
        notification,
        error: errorMessage
      });
      return {
        success: false,
        message: 'Erro ao processar notificação de PIX',
        status: 500
      };
    }
  }

  /**
   * Processa notificação genérica
   */
  static async processGenericNotification(
    notification: NotificationItem | ChargeNotification,
    receivedSecret?: string,
    req?: Request
  ): Promise<WebhookResponse> {
    try {
      // Tentar identificar o tipo de notificação pelos campos disponíveis
      const chargeId = 'charge_id' in notification ? notification.charge_id : notification.id;
      const customId = notification.custom_id;

      if (chargeId) {
        return await EfiWebhookProcessorService.processChargeNotification(notification, receivedSecret, undefined, req);
      } else if (customId) {
        const { TituloWebhookResolver } = await import('../TituloWebhookResolver');
        const {
          applyPagoWebhook,
          enviarReciboSeAdmin,
          registrarAuditoriaWebhook,
          refetchResolvedTitulo,
          updateTituloWebhook,
        } = await import('../WebhookTituloUpdater');
        const scope = PaymentCommonService.getWebhookScope(req);
        const resolved = await TituloWebhookResolver.findByCustomId(String(customId), scope);
        if (resolved) {
          if (receivedSecret && !PaymentCommonService.validateWebhookSecret(resolved.banco ?? undefined, receivedSecret)) {
            logger.debug('Webhook EFI: secret não corresponde ao banco ao processar custom_id', {
              titulo_id: (resolved.titulo as { id: number }).id
            });
          }
          await refetchResolvedTitulo(resolved);
          const { titulo } = resolved;
          const jaEstavaPago = !!titulo.pago;
          const statusString = typeof notification.status === 'string' ? notification.status : (notification.status as { current?: string })?.current || 'pendente';
          const novoStatus = EfiWebhookProcessorService.mapEfiStatus(statusString) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
          const isPago = ['pago', 'liquidado'].includes(novoStatus);
          const dadosAnteriores = toPlain((titulo as { toJSON: () => Record<string, unknown> })) as Record<string, unknown>;
          if (isPago && !titulo.pago) {
            await applyPagoWebhook(resolved, Number(titulo.valor), new Date());
          } else {
            await updateTituloWebhook(resolved, { status: novoStatus, pago: isPago });
          }
          await refetchResolvedTitulo(resolved);
          const dadosNovos = toPlain((resolved.titulo as { toJSON: () => Record<string, unknown> })) as Record<string, unknown>;
          enviarReciboSeAdmin(resolved, jaEstavaPago);
          await registrarAuditoriaWebhook(req, resolved, dadosAnteriores, dadosNovos, `Atualização via webhook EFI (generic) - Status: ${statusString}`);
          return {
            success: true,
            message: 'Status atualizado via custom_id',
            data: { titulo_id: (titulo as { id: number }).id, status: novoStatus }
          };
        }
      }

      return {
        success: false,
        message: 'Não foi possível processar notificação genérica',
        status: 400
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar notificação genérica', {
        notification,
        error: errorMessage
      });
      return {
        success: false,
        message: 'Erro ao processar notificação genérica',
        status: 500
      };
    }
  }

  /**
   * Mapeia status da Efí para status interno
   */
  static mapEfiStatus(statusEfi: string): string {
    const statusMap: Record<string, string> = {
      'paid': 'pago',
      'settled': 'pago',
      'canceled': 'cancelado',
      'expired': 'vencido',
      'waiting': 'pendente',
      'pending': 'pendente',
      'active': 'ativo',
      'inactive': 'inativo'
    };

    return statusMap[statusEfi?.toLowerCase()] || 'pendente';
  }
}

