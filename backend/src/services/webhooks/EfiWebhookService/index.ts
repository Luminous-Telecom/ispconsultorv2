import { Request } from 'express';
import { Banco } from '../../../models/cadastros/Banco';
import { Titulo } from '../../../models/financeiro/Titulo';
import { BancoApiService } from '../../bancos/BancoApiService';
import { PaymentCommonService } from '../PaymentCommonService';
import { logger } from '../../../utils/logger';
import { registrarAtualizacaoElasticsearch } from '../../elasticsearch/ElasticsearchAuditService';
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
        if (receivedSecret && !PaymentCommonService.validateWebhookSecret(banco, receivedSecret)) {
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
            receivedSecret,
            req
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
            return await EfiWebhookProcessorService.processNotificationData(
              resultado.data as NotificationData | NotificationItem[] | NotificationItem,
              banco,
              receivedSecret,
              req
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
        // Tentar buscar por custom_id
        const titulo = await Titulo.findByPk(String(customId), {
          include: [{ model: Banco, as: 'banco', attributes: ['id', 'nome', 'tipo_banco', 'codigo', 'webhook_secret'] }]
        }) as (Titulo & { banco?: Banco | null }) | null;
        if (titulo) {
          // Validar secret apenas se foi enviado, mas não bloquear processamento
          if (receivedSecret && !PaymentCommonService.validateWebhookSecret(titulo.banco ?? undefined, receivedSecret)) {
            logger.debug('Webhook EFI: secret não corresponde ao banco ao processar custom_id, mas continuando', {
              titulo_id: titulo.id,
              banco_id: titulo.banco?.id ?? null
            });
            // Não retornar erro - continuar processando
          }

          // Capturar dados anteriores antes de atualizar
          const dadosAnteriores = titulo.toJSON() as Record<string, unknown>;
          
          const statusString = typeof notification.status === 'string' 
            ? notification.status 
            : notification.status?.current || 'pendente';
          const novoStatus = EfiWebhookProcessorService.mapEfiStatus(statusString) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
          await titulo.update({ status: novoStatus });
          
          // Recarregar título para obter dados atualizados
          await titulo.reload();
          
          // Capturar dados novos após atualização
          const dadosNovos = titulo.toJSON() as Record<string, unknown>;
          
          // Registrar auditoria no Elasticsearch se req foi fornecido
          if (req) {
            try {
              await registrarAtualizacaoElasticsearch(
                req,
                'Titulo',
                titulo.id,
                dadosAnteriores,
                dadosNovos,
                `Atualização via webhook EFI (generic) - Status: ${statusString}`
              );
            } catch (auditError) {
              // Não bloquear processamento se auditoria falhar
              logger.warn('Erro ao registrar auditoria de webhook EFI (generic)', {
                titulo_id: titulo.id,
                error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
              });
            }
          }
          
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

