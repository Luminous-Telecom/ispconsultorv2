import { Request } from 'express';
import { Banco } from '../../../models/cadastros/Banco';
import { PaymentCommonService } from '../PaymentCommonService';
import { TituloWebhookResolver } from '../TituloWebhookResolver';
import { applyPagoWebhook, enviarReciboSeAdmin, registrarAuditoriaWebhook, refetchResolvedTitulo } from '../WebhookTituloUpdater';
import { logger } from '../../../utils/logger';
import {
  WebhookResponse,
  NotificationData,
  NotificationItem,
  NotificationIdentifiers,
  ChargeNotification,
  TituloUpdateData
} from '../../../types/webhooks';
import { EfiWebhookValidatorService } from '../EfiWebhookValidatorService';

export class EfiWebhookProcessorService {
  /**
   * Processa dados da notificação retornados pela API EFI
   */
  static async processNotificationData(
    dados: NotificationData | NotificationItem[] | NotificationItem,
    banco: Banco,
    receivedSecret?: string,
    req?: Request
  ): Promise<WebhookResponse> {
    try {
      logger.info('Processando dados da notificação', {
        banco_id: banco.id
      });

      // Validar secret (não bloqueia)
      await EfiWebhookValidatorService.validateSecret(banco, receivedSecret);

      // Validar estrutura
      const validation = EfiWebhookValidatorService.validateNotificationStructure(dados);
      
      if (!validation.valid) {
        return {
          success: false,
          message: 'Formato de notificação não reconhecido',
          status: 400
        };
      }

      // Processar baseado na estrutura
      if (validation.isNotificationData) {
        const dataObj = dados as NotificationData;
        const notifications = dataObj.data || [];
        logger.info('Processando notificações em lote', {
          count: notifications.length
        });
        
        let processadas = 0;
        for (const notificacao of notifications) {
          if (notificacao.type && notificacao.identifiers) {
            processadas += await this.processIndividualNotification(notificacao, banco, receivedSecret, req);
          }
        }
        
        return {
          success: true,
          message: `${processadas} notificações processadas`,
          data: { total_processadas: processadas }
        };
      }

      if (validation.isChargeNotification) {
        const chargeData = dados as { charge: ChargeNotification };
        return await this.processChargeNotification(chargeData.charge, receivedSecret, banco, req);
      }

      if (Array.isArray(dados)) {
        let totalProcessadas = 0;
        for (const notificacao of dados) {
          const processadas = await this.processIndividualNotification(notificacao, banco, receivedSecret, req);
          totalProcessadas += processadas;
        }
        
        return {
          success: true,
          message: `${totalProcessadas} notificações processadas`,
          data: { total_processadas: totalProcessadas }
        };
      }

      if ('type' in dados) {
        const processadas = await this.processIndividualNotification(dados as NotificationItem, banco, receivedSecret, req);
        
        return {
          success: true,
          message: 'Notificação processada',
          data: { processadas }
        };
      }
      
      return {
        success: false,
        message: 'Formato de notificação não reconhecido',
        status: 400
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar dados da notificação', {
        banco_id: banco.id,
        error: errorMessage
      });
      return {
        success: false,
        message: 'Erro ao processar dados da notificação',
        status: 500
      };
    }
  }

  /**
   * Processa notificação individual
   */
  static async processIndividualNotification(
    notificacao: NotificationItem,
    banco: Banco,
    receivedSecret?: string,
    req?: Request
  ): Promise<number> {
    try {
      const type = notificacao.type || '';
      const identifiers = notificacao.identifiers || {};
      const status = typeof notificacao.status === 'object' && notificacao.status?.current
        ? notificacao.status.current
        : typeof notificacao.status === 'string' ? notificacao.status : null;
      const customId = notificacao.custom_id || null;
      
      await EfiWebhookValidatorService.validateSecret(banco, receivedSecret);
      
      switch (type) {
        case 'charge':
          return await this.processTituloNotification(identifiers, status, customId, notificacao, banco, receivedSecret, req);
          
        default:
          logger.warn('Tipo de notificação não suportado', { type });
          return 0;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar notificação individual', {
        notificacao,
        error: errorMessage
      });
      return 0;
    }
  }

  /**
   * Processa notificação de título (charge)
   */
  private static async processTituloNotification(
    identifiers: NotificationIdentifiers,
    status: string | null,
    customId: string | null,
    dadosCompletos: NotificationItem,
    banco: Banco,
    receivedSecret?: string,
    req?: Request
  ): Promise<number> {
    const chargeId = identifiers.charge_id || null;
    if (!chargeId) {
      logger.warn('Charge ID não encontrado na notificação de título');
      return 0;
    }

    try {
      const scope = PaymentCommonService.getWebhookScope(req);
      const resolved = await TituloWebhookResolver.findByChargeId(chargeId, scope);
      if (!resolved) {
        logger.warn('Título não encontrado', { charge_id: chargeId });
        return 0;
      }

      const bancoRelacionado = resolved.banco ?? banco;
      await EfiWebhookValidatorService.validateSecret(bancoRelacionado, receivedSecret);

      await refetchResolvedTitulo(resolved);
      const { titulo } = resolved;
      const jaEstavaPago = !!titulo.pago;
      const statusString = status || 'pendente';
      const novoStatus = this.mapEfiStatus(statusString) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
      const isPago = ['pago', 'liquidado'].includes(novoStatus);

      const updateData: Record<string, unknown> = { status: novoStatus, pago: isPago };
      if (!isPago && titulo.pago) {
        updateData.data_pagamento = null;
        updateData.valor_pago = null;
      }
      if (dadosCompletos?.expire_at) {
        const normalizedDate = PaymentCommonService.normalizeDueDate(dadosCompletos.expire_at);
        if (normalizedDate) updateData.data_vencimento = normalizedDate;
      } else if (dadosCompletos?.due_date) {
        const normalizedDate = PaymentCommonService.normalizeDueDate(dadosCompletos.due_date);
        if (normalizedDate) updateData.data_vencimento = normalizedDate;
      }

      const dadosAnteriores = (titulo as { toJSON: () => Record<string, unknown> }).toJSON() as Record<string, unknown>;

      if (isPago && !titulo.pago) {
        const dataPagamentoWebhook = PaymentCommonService.pickEfiWebhookPaymentDateRaw(dadosCompletos ?? {});
        const dataPagamentoNormalizada = dataPagamentoWebhook ? PaymentCommonService.normalizePaymentDate(dataPagamentoWebhook) : new Date();
        await applyPagoWebhook(resolved, Number(titulo.valor), dataPagamentoNormalizada || new Date());
        delete updateData.status;
        delete updateData.pago;
      }

      await (titulo as { update: (d: Record<string, unknown>) => Promise<unknown> }).update(updateData);
      await refetchResolvedTitulo(resolved);
      const dadosNovos = (resolved.titulo as { toJSON: () => Record<string, unknown> }).toJSON() as Record<string, unknown>;

      enviarReciboSeAdmin(resolved, jaEstavaPago);
      await registrarAuditoriaWebhook(req, resolved, dadosAnteriores, dadosNovos, `Atualização via webhook EFI - Status: ${statusString}`);
      return 1;
    } catch (error) {
      logger.error('Erro ao processar notificação de título', { charge_id: chargeId, error: error instanceof Error ? error.message : String(error) });
      return 0;
    }
  }

  /**
   * Processa notificação de charge (formato direto) - admin e SaaS
   */
  static async processChargeNotification(
    notification: ChargeNotification | NotificationItem,
    receivedSecret?: string,
    bancoContext?: Banco,
    req?: Request
  ): Promise<WebhookResponse> {
    try {
      const chargeId = 'charge_id' in notification ? notification.charge_id : notification.id;
      const status = typeof notification.status === 'string' ? notification.status : notification.status?.current;

      if (!chargeId) {
        return { success: false, message: 'Charge ID não encontrado', status: 400 };
      }

      const scope = PaymentCommonService.getWebhookScope(req);
      const resolved = await TituloWebhookResolver.findByChargeId(String(chargeId), scope);
      if (!resolved) {
        logger.warn('Título não encontrado para charge', { charge_id: chargeId });
        return { success: false, message: 'Título não encontrado', status: 404 };
      }

      const bancoRelacionado = resolved.banco ?? bancoContext ?? null;
      if (bancoRelacionado) {
        await EfiWebhookValidatorService.validateSecret(bancoRelacionado, receivedSecret);
      }

      await refetchResolvedTitulo(resolved);
      const { titulo } = resolved;
      const jaEstavaPago = !!titulo.pago;
      const statusLocal = this.mapEfiStatus(status || 'pendente') as 'pendente' | 'pago' | 'vencido' | 'cancelado';
      const isPago = ['pago', 'liquidado'].includes(statusLocal);
      const dadosAnteriores = (titulo as { toJSON: () => Record<string, unknown> }).toJSON() as Record<string, unknown>;

      if (isPago && !titulo.pago) {
        const notif = notification as { created_at?: string; paid_at?: string; confirmed_at?: string; payment_date?: string };
        const dataPagamentoWebhook = PaymentCommonService.pickEfiWebhookPaymentDateRaw(notif);
        const dataPagamentoNormalizada = dataPagamentoWebhook ? PaymentCommonService.normalizePaymentDate(dataPagamentoWebhook) : new Date();
        await applyPagoWebhook(resolved, Number(titulo.valor), dataPagamentoNormalizada || new Date());
      } else {
        await (titulo as { update: (d: Record<string, unknown>) => Promise<unknown> }).update({
          status: statusLocal,
          pago: isPago
        });
      }
      await refetchResolvedTitulo(resolved);
      const dadosNovos = (resolved.titulo as { toJSON: () => Record<string, unknown> }).toJSON() as Record<string, unknown>;

      enviarReciboSeAdmin(resolved, jaEstavaPago);
      await registrarAuditoriaWebhook(req, resolved, dadosAnteriores, dadosNovos, `Atualização via webhook EFI (charge notification) - Status: ${status}`);

      return {
        success: true,
        message: 'Título atualizado com sucesso',
        data: { titulo_id: (titulo as { id: number }).id }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar notificação de charge', { error: errorMessage });
      return { success: false, message: 'Erro ao processar notificação de charge', status: 500 };
    }
  }

  /**
   * Mapeia status da EFI para status local
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
