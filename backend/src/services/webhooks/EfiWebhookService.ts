import { Banco } from '../../models/cadastros/Banco';
import { Titulo } from '../../models/financeiro/Titulo';
import { BancoApiService } from '../bancos/BancoApiService';
import { PaymentCommonService } from './PaymentCommonService';
import { logger } from '../../utils/logger';
import {
  WebhookResponse,
  NotificationData,
  NotificationItem,
  NotificationIdentifiers,
  ChargeNotification,
  TituloUpdateData
} from '../../types/webhooks';

/**
 * Serviço para processamento de webhooks da EFI (Efí/Gerencianet)
 */
export class EfiWebhookService {
  /**
   * Processa token de notificação (form-urlencoded)
   */
  static async processNotificationToken(
    notificationToken: string,
    receivedSecret?: string
  ): Promise<WebhookResponse> {
    try {
      logger.info(`Iniciando processamento de token de notificação: ${notificationToken}`);
      
      // Buscar bancos ativos para processar notificação
      const bancosAtivos = await Banco.findAll({
        where: { 
          tipo_banco: 'efi',
          ativo: true
        },
        order: [['created_at', 'DESC']]
      });

      let algumBancoAutorizado = false;

      // Para tokens de notificação, tentar processar em todos os bancos EFI ativos
      // O token em si já é uma forma de autenticação, não precisa validar webhook_secret
      for (const banco of bancosAtivos) {
        // Validar secret apenas se foi enviado (para segurança adicional)
        // Mas permitir processar mesmo sem secret, pois o token é autenticação suficiente
        if (receivedSecret && !(await PaymentCommonService.validateWebhookSecret(banco, receivedSecret))) {
          // Se um secret foi enviado mas não é válido, apenas logar mas continuar
          logger.debug('Secret do webhook não corresponde ao banco, mas tentando processar token mesmo assim', {
            banco_id: banco.id,
            possui_secret: !!banco.webhook_secret
          });
        }

        logger.info(`Tentando consultar token no banco ${banco.id}`, {
          banco_id: banco.id,
          banco_nome: banco.nome,
          sandbox: banco.sandbox
        });
        
        const resultado = await BancoApiService.consultarNotificacaoPorToken(banco, notificationToken);
        
        if (resultado.success && resultado.data) {
          logger.info('Token encontrado no banco correto!', {
            banco_id: banco.id,
            data_count: Array.isArray(resultado.data.data) ? resultado.data.data.length : 0
          });
          
          algumBancoAutorizado = true;
          
          return await EfiWebhookService.processNotificationData(
            resultado.data as NotificationData | NotificationItem[] | NotificationItem,
            banco,
            receivedSecret
          );
        }
      }
      
      // Se nenhum banco processou com sucesso mas temos secret, não bloquear
      // Para tokens de notificação, o secret é opcional
      if (!algumBancoAutorizado && receivedSecret) {
        // Verificar se algum banco tem o secret válido
        const algumBancoComSecretValido = bancosAtivos.some(banco => 
          banco.webhook_secret === receivedSecret
        );
        
        if (algumBancoComSecretValido) {
          // Secret é válido mas token não foi encontrado, pode ter expirado
          logger.debug('Token de notificação não encontrado em nenhum banco autorizado', {
            token: notificationToken.substring(0, 20) + '...'
          });
        } else {
          // Secret não corresponde, mas continuar tentando processar o token
          logger.debug('Webhook EFI: secret recebido não corresponde a nenhum banco, mas continuando processamento', { 
            receivedSecret: receivedSecret.substring(0, 10) + '...' 
          });
          // Não retornar erro - continuar para o fallback abaixo
        }
      }
      
      // Fallback: Buscar todos os bancos EFI ativos (se não encontrou no primeiro loop)
      if (!algumBancoAutorizado) {
        const bancosEfi = await Banco.findAll({
          where: { tipo_banco: 'efi', ativo: true }
        });
        
        if (bancosEfi.length === 0) {
          logger.error('Nenhum banco EFI ativo encontrado para processar notificação');
          return {
            success: false,
            message: 'Nenhum banco EFI ativo encontrado',
            status: 400
          };
        }
        
        // Tentar consultar a notificação em cada banco EFI (sem validar secret para tokens)
        for (const banco of bancosEfi) {
          logger.info(`Consultando notificação no banco EFI: ${banco.id}`);
          
          const resultado = await BancoApiService.consultarNotificacaoPorToken(banco, notificationToken);
          
          if (resultado.success && resultado.data) {
            logger.info('Notificação consultada com sucesso', {
              banco_id: banco.id,
              data: resultado.data
            });
            
            // Processar os dados da notificação
            return await EfiWebhookService.processNotificationData(
              resultado.data as NotificationData | NotificationItem[] | NotificationItem,
              banco,
              receivedSecret
            );
          } else {
            // Se o token não foi encontrado, expirou ou não existe, não tentar outros bancos
            if (resultado.message?.includes('não encontrado') || 
                resultado.message?.includes('expirado') ||
                resultado.message?.includes('property_does_not_exists')) {
              logger.warn('Token de notificação inválido - parando tentativas', {
                banco_id: banco.id,
                token: notificationToken,
                message: resultado.message
              });
              break; // Não tentar outros bancos se o token é inválido
            }
            
            logger.warn(`Falha ao consultar notificação no banco ${banco.id}`, {
              message: resultado.message
            });
          }
        }
      }
      
      logger.warn('Webhook: Token de notificação não processado (normal para tokens expirados)');
      return {
        success: false,
        message: 'Não foi possível consultar a notificação',
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
    receivedSecret?: string
  ): Promise<WebhookResponse> {
    try {
      logger.info('Processando dados da notificação', {
        banco_id: banco.id,
        dados
      });

      // Validar secret apenas se foi enviado (para segurança adicional)
      // Não bloquear processamento, pois dados já foram obtidos com sucesso da API
      if (receivedSecret && !(await PaymentCommonService.validateWebhookSecret(banco, receivedSecret))) {
        logger.debug('Webhook EFI: secret não corresponde ao banco, mas continuando processamento', {
          banco_id: banco.id,
          possui_secret: !!banco.webhook_secret
        });
        // Não retornar erro - os dados já foram validados pela API da Efí
      }

      // Nova estrutura da EFI: array de notificações
      if (!Array.isArray(dados) && 'code' in dados && dados.code && 'data' in dados && dados.data && Array.isArray(dados.data)) {
        logger.info('Processando notificações em lote', {
          count: dados.data.length
        });
        
        let processadas = 0;
        for (const notificacao of dados.data) {
          if (notificacao.type && notificacao.identifiers) {
            processadas += await EfiWebhookService.processIndividualNotification(notificacao, banco, receivedSecret);
          }
        }
        
        return {
          success: true,
          message: `${processadas} notificações processadas`,
          data: { total_processadas: processadas }
        };
      }

      // Verificar se é uma notificação de charge (boleto individual) - estrutura antiga
      if (!Array.isArray(dados) && 'charge' in dados && dados.charge) {
        const charge = dados.charge;
        const chargeId = charge.charge_id || null;
        const status = charge.status || 'unknown';
        
        if (chargeId) {
          logger.info('Processando notificação de charge', {
            charge_id: chargeId,
            status
          });
          
          // Buscar título pelo charge_id
          const titulo = await Titulo.findOne({
            where: { charge_id: chargeId }
          });
          
          if (titulo) {
            const statusLocal = EfiWebhookService.mapEfiStatus(status) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
            const oldStatus = titulo.status;
            const oldPago = titulo.pago;
            
            await titulo.update({
              status: statusLocal,
              pago: ['pago', 'liquidado'].includes(statusLocal)
            });
            
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
          } else {
            logger.warn('Título não encontrado para charge', { charge_id: chargeId });
            return {
              success: false,
              message: 'Título não encontrado',
              status: 404
            };
          }
        }
      }

      // Verificar se é uma notificação individual ou múltipla (estrutura direta)
      if (Array.isArray(dados)) {
        // Notificação múltipla
        let totalProcessadas = 0;
        for (const notificacao of dados) {
          const processadas = await EfiWebhookService.processIndividualNotification(notificacao, banco, receivedSecret);
          totalProcessadas += processadas;
        }
        
        return {
          success: true,
          message: `${totalProcessadas} notificações processadas`,
          data: { total_processadas: totalProcessadas }
        };
      } else if (!Array.isArray(dados) && 'type' in dados) {
        // Notificação individual
        const processadas = await EfiWebhookService.processIndividualNotification(dados as NotificationItem, banco, receivedSecret);
        
        return {
          success: true,
          message: 'Notificação processada',
          data: { processadas }
        };
      }
      
      // Fallback: retornar erro se não foi possível processar
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
    receivedSecret?: string
  ): Promise<number> {
    try {
      const type = notificacao.type || '';
      const identifiers = notificacao.identifiers || {};
      const status = typeof notificacao.status === 'object' && notificacao.status?.current
        ? notificacao.status.current
        : typeof notificacao.status === 'string' ? notificacao.status : null;
      const customId = notificacao.custom_id || null;
      
      // Validar secret apenas se foi enviado (para segurança adicional)
      // Não bloquear processamento, pois dados já foram validados pela API da Efí
      if (receivedSecret && !(await PaymentCommonService.validateWebhookSecret(banco, receivedSecret))) {
        logger.debug('Webhook EFI: secret não corresponde ao banco em notificação individual, mas continuando', {
          banco_id: banco.id,
          possui_secret: !!banco.webhook_secret
        });
        // Não retornar 0 - continuar processando
      }
      
      switch (type) {
        case 'charge':
          return await EfiWebhookService.processTituloNotification(identifiers, status, customId, notificacao, banco, receivedSecret);
          
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
  static async processTituloNotification(
    identifiers: NotificationIdentifiers,
    status: string | null,
    customId: string | null,
    dadosCompletos?: NotificationItem,
    bancoContext?: Banco,
    receivedSecret?: string
  ): Promise<number> {
    const chargeId = identifiers.charge_id || null;
    
    if (!chargeId) {
      logger.warn('Charge ID não encontrado na notificação de título');
      return 0;
    }

    try {
      // Buscar título pelo charge_id
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

      const bancoRelacionado = bancoContext ?? (titulo as Titulo & { banco?: Banco | null }).banco ?? null;
      // Validar secret apenas se foi enviado, mas não bloquear processamento
      if (receivedSecret && !(await PaymentCommonService.validateWebhookSecret(bancoRelacionado ?? undefined, receivedSecret))) {
        logger.debug('Webhook EFI: secret não corresponde ao banco ao processar título, mas continuando', {
          charge_id: chargeId,
          banco_id: bancoRelacionado?.id ?? null
        });
        // Não retornar 0 - continuar processando
      }

      // Atualizar status do título
      const statusString = status || 'pendente';
      const novoStatus = EfiWebhookService.mapEfiStatus(statusString) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
      const isPago = ['pago', 'liquidado'].includes(novoStatus);
      
      const updateData: TituloUpdateData = { 
        status: novoStatus,
        pago: isPago
      };

      
      if (isPago && !titulo.pago) {
        // Buscar data de pagamento do webhook (com hora se disponível)
        // Tentar created_at completo primeiro (pode ter hora), depois paid_at, depois confirm_at
        const dataPagamentoWebhook = dadosCompletos?.created_at 
          || dadosCompletos?.paid_at 
          || dadosCompletos?.confirmed_at
          || dadosCompletos?.payment_date;
        
        // Normalizar data de pagamento preservando hora
        const dataPagamentoNormalizada = dataPagamentoWebhook 
          ? PaymentCommonService.normalizePaymentDate(dataPagamentoWebhook)
          : new Date();
        
        // Usar método marcarComoPago para garantir lógica consistente
        // skipLiquidacaoBanco = true pois o webhook já indica que o banco sabe do pagamento
        await titulo.marcarComoPago(titulo.valor, dataPagamentoNormalizada || undefined, true);
        // Não adicionar data_pagamento e valor_pago ao updateData, pois já foi salvo pelo marcarComoPago
      }
      
      if (!isPago && titulo.pago) {
        updateData.data_pagamento = null;
        updateData.valor_pago = null;
      }
      
      // Atualizar data de vencimento se fornecida no webhook
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
      
      await titulo.update(updateData as Partial<typeof titulo>);

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
    bancoContext?: Banco
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

      // Buscar título pelo charge_id
      const titulo = await Titulo.findOne({
        where: { charge_id: chargeId },
        include: [{ model: Banco, as: 'banco', attributes: ['id', 'nome', 'tipo_banco', 'codigo', 'webhook_secret'] }]
      }) as (Titulo & { banco?: Banco | null }) | null;

      const bancoRelacionado = bancoContext ?? titulo?.banco ?? null;

      // Validar secret apenas se foi enviado, mas não bloquear processamento
      if (receivedSecret && !(await PaymentCommonService.validateWebhookSecret(bancoRelacionado ?? undefined, receivedSecret))) {
        logger.debug('Webhook EFI: secret não corresponde ao banco ao processar charge, mas continuando', {
          charge_id: chargeId,
          banco_id: bancoRelacionado?.id ?? null
        });
        // Não retornar erro - continuar processando
      }

      if (!titulo) {
        logger.warn('Título não encontrado para charge', { charge_id: chargeId });
        return {
          success: false,
          message: 'Título não encontrado',
          status: 404
        };
      }

      // Atualizar status do título
      const statusString = status || '';
      const novoStatus = EfiWebhookService.mapEfiStatus(statusString) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
      await titulo.update({ status: novoStatus });

      logger.info('Status do título atualizado via charge', {
        titulo_id: titulo.id,
        charge_id: chargeId,
        status_anterior: titulo.status,
        status_novo: novoStatus
      });

      return {
        success: true,
        message: 'Status do título atualizado',
        data: {
          titulo_id: titulo.id,
          status: novoStatus
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar notificação de charge', {
        notification,
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
   * Processa notificação de PIX
   */
  static async processPixNotification(
    notification: NotificationItem,
    receivedSecret?: string
  ): Promise<WebhookResponse> {
    try {
      logger.info('Processando notificação de PIX', { notification });

      // Implementar lógica específica para PIX se necessário
      // Por enquanto, tratar como notificação genérica
      return await EfiWebhookService.processGenericNotification(notification, receivedSecret);
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
    receivedSecret?: string
  ): Promise<WebhookResponse> {
    try {
      // Tentar identificar o tipo de notificação pelos campos disponíveis
      const chargeId = 'charge_id' in notification ? notification.charge_id : notification.id;
      const customId = notification.custom_id;

      if (chargeId) {
        return await EfiWebhookService.processChargeNotification(notification, receivedSecret);
      } else if (customId) {
        // Tentar buscar por custom_id
        const titulo = await Titulo.findByPk(String(customId), {
          include: [{ model: Banco, as: 'banco', attributes: ['id', 'nome', 'tipo_banco', 'codigo', 'webhook_secret'] }]
        }) as (Titulo & { banco?: Banco | null }) | null;
        if (titulo) {
          // Validar secret apenas se foi enviado, mas não bloquear processamento
          if (receivedSecret && !(await PaymentCommonService.validateWebhookSecret(titulo.banco ?? undefined, receivedSecret))) {
            logger.debug('Webhook EFI: secret não corresponde ao banco ao processar custom_id, mas continuando', {
              titulo_id: titulo.id,
              banco_id: titulo.banco?.id ?? null
            });
            // Não retornar erro - continuar processando
          }

          const statusString = typeof notification.status === 'string' 
            ? notification.status 
            : notification.status?.current || 'pendente';
          const novoStatus = EfiWebhookService.mapEfiStatus(statusString) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
          await titulo.update({ status: novoStatus });
          
          return {
            success: true,
            message: 'Status atualizado via custom_id',
            data: {
              titulo_id: titulo.id,
              status: novoStatus
            }
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

