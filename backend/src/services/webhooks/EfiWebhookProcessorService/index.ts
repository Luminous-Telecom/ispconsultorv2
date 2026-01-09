import { Request } from 'express';
import { Banco } from '../../../models/cadastros/Banco';
import { Titulo } from '../../../models/financeiro/Titulo';
import { PaymentCommonService } from '../PaymentCommonService';
import { logger } from '../../../utils/logger';
import { registrarAtualizacaoElasticsearch } from '../../elasticsearch/ElasticsearchAuditService';
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
      const titulo = await Titulo.findOne({
        where: { charge_id: chargeId },
        include: [
          {
            model: Banco,
            as: 'banco',
            attributes: ['id', 'nome', 'tipo_banco', 'codigo', 'webhook_secret']
          }
        ]
      });

      if (!titulo) {
        logger.warn('Título não encontrado', { charge_id: chargeId });
        return 0;
      }

      const bancoRelacionado = (titulo as Titulo & { banco?: Banco | null }).banco ?? banco;
      await EfiWebhookValidatorService.validateSecret(bancoRelacionado, receivedSecret);

      const statusString = status || 'pendente';
      const novoStatus = this.mapEfiStatus(statusString) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
      const isPago = ['pago', 'liquidado'].includes(novoStatus);
      
      const updateData: TituloUpdateData = { 
        status: novoStatus,
        pago: isPago
      };

      if (isPago && !titulo.pago) {
        const dataPagamentoWebhook = dadosCompletos?.created_at 
          || dadosCompletos?.paid_at 
          || dadosCompletos?.confirmed_at
          || dadosCompletos?.payment_date;
        
        const dataPagamentoNormalizada = dataPagamentoWebhook 
          ? PaymentCommonService.normalizePaymentDate(dataPagamentoWebhook)
          : new Date();
        
        await titulo.marcarComoPago(titulo.valor, dataPagamentoNormalizada || undefined, true);
      }
      
      if (!isPago && titulo.pago) {
        updateData.data_pagamento = null;
        updateData.valor_pago = null;
      }
      
      if (dadosCompletos?.expire_at) {
        const normalizedDate = PaymentCommonService.normalizeDueDate(dadosCompletos.expire_at);
        if (normalizedDate) {
          updateData.data_vencimento = normalizedDate;
        }
      } else if (dadosCompletos?.due_date) {
        const normalizedDate = PaymentCommonService.normalizeDueDate(dadosCompletos.due_date);
        if (normalizedDate) {
          updateData.data_vencimento = normalizedDate;
        }
      }
      
      const dadosAnteriores = titulo.toJSON() as Record<string, unknown>;
      await titulo.update(updateData as Partial<typeof titulo>);
      await titulo.reload();
      const dadosNovos = titulo.toJSON() as Record<string, unknown>;
      
      if (req) {
        try {
          await registrarAtualizacaoElasticsearch(
            req,
            'Titulo',
            titulo.id,
            dadosAnteriores,
            dadosNovos,
            `Atualização via webhook EFI - Status: ${statusString}`
          );
        } catch (auditError) {
          logger.warn('Erro ao registrar auditoria de webhook EFI', {
            titulo_id: titulo.id,
            error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
          });
        }
      }

      return 1;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar notificação de título', {
        charge_id: chargeId,
        error: errorMessage
      });
      return 0;
    }
  }

  /**
   * Processa notificação de charge (formato direto)
   */
  static async processChargeNotification(
    notification: ChargeNotification | NotificationItem,
    receivedSecret?: string,
    bancoContext?: Banco,
    req?: Request
  ): Promise<WebhookResponse> {
    try {
      const chargeId = 'charge_id' in notification ? notification.charge_id : notification.id;
      const status = typeof notification.status === 'string' 
        ? notification.status 
        : notification.status?.current;
      const customId = notification.custom_id;

      if (!chargeId) {
        return {
          success: false,
          message: 'Charge ID não encontrado',
          status: 400
        };
      }

      const titulo = await Titulo.findOne({
        where: { charge_id: chargeId },
        include: [
          {
            model: Banco,
            as: 'banco',
            attributes: ['id', 'nome', 'tipo_banco', 'codigo', 'webhook_secret']
          }
        ]
      });

      if (!titulo) {
        logger.warn('Título não encontrado para charge', { charge_id: chargeId });
        return {
          success: false,
          message: 'Título não encontrado',
          status: 404
        };
      }

      const bancoRelacionado = bancoContext ?? (titulo as Titulo & { banco?: Banco | null }).banco ?? null;
      if (bancoRelacionado) {
        await EfiWebhookValidatorService.validateSecret(bancoRelacionado, receivedSecret);
      }

      const dadosAnteriores = titulo.toJSON() as Record<string, unknown>;
      const statusLocal = this.mapEfiStatus(status || 'pendente') as 'pendente' | 'pago' | 'vencido' | 'cancelado';
      const oldStatus = titulo.status;
      const oldPago = titulo.pago;
      
      await titulo.update({
        status: statusLocal,
        pago: ['pago', 'liquidado'].includes(statusLocal)
      });
      
      await titulo.reload();
      const dadosNovos = titulo.toJSON() as Record<string, unknown>;
      
      if (req) {
        try {
          await registrarAtualizacaoElasticsearch(
            req,
            'Titulo',
            titulo.id,
            dadosAnteriores,
            dadosNovos,
            `Atualização via webhook EFI (charge notification) - Status: ${status}`
          );
        } catch (auditError) {
          logger.warn('Erro ao registrar auditoria de webhook EFI (charge notification)', {
            titulo_id: titulo.id,
            error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
          });
        }
      }
      
      logger.info('Título atualizado via webhook', {
        titulo_id: titulo.id,
        charge_id: chargeId,
        status_anterior: oldStatus,
        status_novo: statusLocal,
        pago_anterior: oldPago,
        pago_novo: titulo.pago
      });
      
      return {
        success: true,
        message: 'Título atualizado com sucesso',
        data: { titulo_id: titulo.id }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar notificação de charge', {
        error: errorMessage
      });
      return {
        success: false,
        message: 'Erro ao processar notificação de charge',
        status: 500
      };
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
