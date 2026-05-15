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

/** Extrai o path da URL de retorno para comparar com a URL do request */
function getUrlRetornoPath(urlRetorno: string | null | undefined): string {
  if (!urlRetorno || typeof urlRetorno !== 'string') return '';
  try {
    if (urlRetorno.startsWith('http://') || urlRetorno.startsWith('https://')) {
      return new URL(urlRetorno).pathname.replace(/\/+$/, '').toLowerCase();
    }
    return urlRetorno.split('?')[0].replace(/\/+$/, '').toLowerCase();
  } catch {
    return urlRetorno.split('?')[0].replace(/\/+$/, '').toLowerCase();
  }
}

/** Path da URL que recebeu o webhook (EFI envia para o url_retorno configurado na cobrança) */
function getWebhookRequestPath(req?: Request): string {
  if (!req?.originalUrl) return '';
  return req.originalUrl.split('?')[0].replace(/\/+$/, '').toLowerCase();
}

/**
 * Serviço para processamento de webhooks da EFI (Efí/Gerencianet)
 */
export class EfiWebhookService {
  /**
   * Processa token de notificação (form-urlencoded)
   * Prioriza bancos cujo url_retorno corresponde à URL que recebeu o webhook
   */
  static async processNotificationToken(
    notificationToken: string,
    receivedSecret?: string,
    req?: Request
  ): Promise<WebhookResponse> {
    try {
      const requestPath = getWebhookRequestPath(req);
      logger.info('Processando token de notificação EFI', {
        token: notificationToken.substring(0, 20) + '...',
        request_path: requestPath || '(vazio)'
      });

      // Priorizar SaaS quando path for /webhook/efi/saas (cobrança provavelmente criada pelo SaasBanco)
      const isPathSaas = requestPath?.includes('/saas');
      let algumBancoAutorizado = false;

      if (isPathSaas) {
        const { default: SaasBanco } = await import('../../../models/saas/SaasBanco');
        const bancosSaasEfi = await SaasBanco.findAll({
          where: { tipo_banco: 'efi', ativo: true }
        });
        const bancosSaasComMatch = bancosSaasEfi.filter(
          (b) =>
            requestPath &&
            getUrlRetornoPath((b as { url_retorno?: string }).url_retorno) === requestPath
        );
        const bancosSaasATentar =
          bancosSaasComMatch.length > 0 ? bancosSaasComMatch : bancosSaasEfi;

        logger.info('Path SaaS — tentando bancos SaaS primeiro', {
          path: requestPath,
          quantidade: bancosSaasATentar.length,
          ids: bancosSaasATentar.map((b) => b.id)
        });

        for (const banco of bancosSaasATentar) {
          if (receivedSecret && !PaymentCommonService.validateWebhookSecret(banco, receivedSecret)) {
            continue;
          }
          logger.info('Tentando banco SaaS', {
            banco_id: banco.id,
            banco_nome: banco.nome,
            sandbox: banco.sandbox,
            origem: 'saas'
          });
          const resultado = await BancoApiService.consultarNotificacaoPorToken(
            banco as unknown as Banco,
            notificationToken,
            'saas'
          );
          if (resultado.success && resultado.data) {
            algumBancoAutorizado = true;
            return await EfiWebhookProcessorService.processNotificationData(
              resultado.data as NotificationData | NotificationItem[] | NotificationItem,
              banco as unknown as Banco,
              receivedSecret,
              req
            );
          }
          if (resultado.message?.includes('não encontrado') || resultado.message?.includes('expirado') || resultado.message?.includes('property_does_not_exists')) {
            break;
          }
        }
      }

      // Bancos Admin
      const bancosAtivos = await Banco.findAll({
        where: { 
          tipo_banco: 'efi',
          ativo: true
        },
        order: [['created_at', 'DESC']]
      });

      logger.info('Bancos admin EFI encontrados', {
        total: bancosAtivos.length,
        bancos: bancosAtivos.map((b) => ({
          id: b.id,
          nome: b.nome,
          sandbox: b.sandbox,
          url_retorno_path: getUrlRetornoPath(b.url_retorno) || '(não configurado)'
        }))
      });

      // Filtrar bancos cujo url_retorno corresponde à URL do request (evita tentar todos)
      const bancosComMatch = bancosAtivos.filter(
        (b) => requestPath && getUrlRetornoPath(b.url_retorno) === requestPath
      );
      const bancosATentar =
        bancosComMatch.length > 0 ? bancosComMatch : bancosAtivos;

      logger.info('Bancos admin a tentar', {
        filtrado_por_url: bancosComMatch.length > 0,
        quantidade: bancosATentar.length,
        ids: bancosATentar.map((b) => b.id)
      });

      for (const banco of bancosATentar) {
        // Validar secret apenas se foi enviado (para segurança adicional)
        // Mas permitir processar mesmo sem secret, pois o token é autenticação suficiente
        if (receivedSecret && !PaymentCommonService.validateWebhookSecret(banco, receivedSecret)) {
          logger.debug('Secret do webhook não corresponde ao banco, mas tentando processar token mesmo assim', {
            banco_id: banco.id,
            possui_secret: !!banco.webhook_secret
          });
        }

        logger.info('Tentando banco admin', {
          banco_id: banco.id,
          banco_nome: banco.nome,
          sandbox: banco.sandbox,
          origem: 'admin'
        });
        
        const resultado = await BancoApiService.consultarNotificacaoPorToken(banco, notificationToken, 'admin');
        
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
      
      // Fallback: tentar bancos EFI SaaS (saas_saas_bancos) — exceto se já tentamos SaaS primeiro (isPathSaas)
      if (!algumBancoAutorizado && !isPathSaas) {
        const { default: SaasBanco } = await import('../../../models/saas/SaasBanco');
        const bancosSaasEfi = await SaasBanco.findAll({
          where: { tipo_banco: 'efi', ativo: true }
        });

        logger.info('Bancos SaaS EFI encontrados', {
          total: bancosSaasEfi.length,
          bancos: bancosSaasEfi.map((b) => ({
            id: b.id,
            nome: b.nome,
            sandbox: b.sandbox,
            url_retorno_path: getUrlRetornoPath(b.url_retorno ?? undefined) || '(não configurado)'
          }))
        });

        // Priorizar bancos SaaS cujo url_retorno corresponde ao request
        const bancosSaasComMatch = bancosSaasEfi.filter(
          (b) =>
            requestPath &&
            getUrlRetornoPath((b as { url_retorno?: string }).url_retorno) === requestPath
        );
        const bancosSaasATentar =
          bancosSaasComMatch.length > 0 ? bancosSaasComMatch : bancosSaasEfi;

        logger.info('Bancos SaaS a tentar', {
          filtrado_por_url: bancosSaasComMatch.length > 0,
          quantidade: bancosSaasATentar.length,
          ids: bancosSaasATentar.map((b) => b.id)
        });

        for (const banco of bancosSaasATentar) {
          if (receivedSecret && !PaymentCommonService.validateWebhookSecret(banco, receivedSecret)) {
            continue;
          }
          logger.info('Tentando banco SaaS', {
            banco_id: banco.id,
            banco_nome: banco.nome,
            sandbox: banco.sandbox,
            origem: 'saas'
          });
          const resultado = await BancoApiService.consultarNotificacaoPorToken(banco as unknown as Banco, notificationToken, 'saas');
          if (resultado.success && resultado.data) {
            algumBancoAutorizado = true;
            return await EfiWebhookProcessorService.processNotificationData(
              resultado.data as NotificationData | NotificationItem[] | NotificationItem,
              banco as unknown as Banco,
              receivedSecret,
              req
            );
          }
          if (resultado.message?.includes('não encontrado') || resultado.message?.includes('expirado') || resultado.message?.includes('property_does_not_exists')) {
            break;
          }
        }
      }

      logger.warn('Webhook EFI: token não processado por nenhum banco', {
        token: notificationToken.substring(0, 20) + '...',
        request_path: requestPath || '(vazio)',
        bancos_admin_tentados: bancosATentar.length,
        hint: 'Verifique: 1) Credenciais (client_id/client_secret) 2) Ambiente (sandbox vs produção) 3) Se a cobrança foi criada com outro banco'
      });
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
        const { TituloWebhookResolver } = await import('../TituloWebhookResolver');
        const { enviarReciboSeAdmin, registrarAuditoriaWebhook, refetchResolvedTitulo } = await import('../WebhookTituloUpdater');
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
          const statusString = typeof notification.status === 'string' ? notification.status : (notification.status as { current?: string })?.current || 'pendente';
          const novoStatus = EfiWebhookProcessorService.mapEfiStatus(statusString) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
          const dadosAnteriores = (titulo as { toJSON: () => Record<string, unknown> }).toJSON() as Record<string, unknown>;
          await (titulo as { update: (d: Record<string, unknown>) => Promise<unknown> }).update({ status: novoStatus, pago: ['pago', 'liquidado'].includes(novoStatus) });
          await refetchResolvedTitulo(resolved);
          const dadosNovos = (resolved.titulo as { toJSON: () => Record<string, unknown> }).toJSON() as Record<string, unknown>;
          enviarReciboSeAdmin(resolved);
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

