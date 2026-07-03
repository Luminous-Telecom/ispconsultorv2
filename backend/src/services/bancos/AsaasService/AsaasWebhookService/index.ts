import axios from 'axios';
import { Banco } from '../../../../models/cadastros/Banco';
import { logger } from '../../../../utils/logger';
import asaasConfig from '../../../../config/bancos/asaas';
import type { ApiResponse } from '../../types';
import type { JsonValue } from '../../../../types/index';
import { AsaasHelpers } from '../AsaasHelpers';
import { SYSTEM_NAME } from '../../../../constants/systemBrand';

export class AsaasWebhookService {
  /**
   * Configura webhook no Asaas
   */
  static async configurarWebhook(
    banco: Banco,
    token: string
  ): Promise<ApiResponse> {
    const urlRetorno = banco.url_retorno?.trim();

    if (!urlRetorno) {
      return {
        success: false,
        message: 'URL de retorno do webhook não está configurada para este banco'
      };
    }

    const baseUrl = banco.sandbox
      ? (asaasConfig.sandbox_url || asaasConfig.cobranca_base_url || asaasConfig.api_base_url)
      : (asaasConfig.cobranca_base_url || asaasConfig.api_base_url);

    const headers = AsaasHelpers.buildAuthHeaders(token);
    const endpointBase = `${baseUrl}${asaasConfig.api_endpoints.webhook ?? '/webhook'}`;
    
    // Buscar webhook_token do campo webhook_secret ou configuracoes JSON
    let webhookSecret: string | undefined = undefined;
    
    if (banco.webhook_secret && typeof banco.webhook_secret === 'string' && banco.webhook_secret.trim()) {
      webhookSecret = banco.webhook_secret;
    } else if (banco.configuracoes && typeof banco.configuracoes === 'object') {
      const webhookToken = banco.configuracoes.webhook_token;
      if (typeof webhookToken === 'string' && webhookToken.trim()) {
        webhookSecret = webhookToken;
      }
    }

    logger.info('Asaas :: iniciando configuração de webhook', {
      banco_id: banco.id,
      url_retorno: urlRetorno,
      has_webhook_secret: !!webhookSecret
    });

    const eventosDesejados = [
      'PAYMENT_CREATED',
      'PAYMENT_UPDATED',
      'PAYMENT_RECEIVED',
      'PAYMENT_OVERDUE',
      'PAYMENT_RECEIVED_IN_CASH',
      'PAYMENT_CONFIRMED',
      'PAYMENT_REFUNDED',
      'PAYMENT_DELETED'
    ];

    const eventosExistentes = new Set<string>();

    try {
      const listaResponse = await axios.get(endpointBase, {
        headers,
        timeout: 20000
      });

      const body = listaResponse.data as
        | { data?: Array<Record<string, JsonValue>> }
        | Array<Record<string, JsonValue>>
        | Record<string, JsonValue>
        | undefined;

      const itens =
        Array.isArray(body)
          ? body
          : Array.isArray((body as { data?: Array<Record<string, JsonValue>> })?.data)
            ? ((body as { data?: Array<Record<string, JsonValue>> }).data as Array<Record<string, JsonValue>>)
            : [];

      logger.info('Asaas :: webhooks existentes retornados', {
        banco_id: banco.id,
        url_retorno: urlRetorno,
        quantidade: itens.length
      });

      for (const item of itens) {
        const alvo =
          typeof item.target === 'string' ? item.target :
          typeof item.url === 'string' ? item.url :
          typeof item.callbackUrl === 'string' ? item.callbackUrl :
          typeof item.deliveryUrl === 'string' ? item.deliveryUrl :
          null;

        if (alvo && alvo.trim() === urlRetorno) {
          const eventoUnitario = typeof item.event === 'string' ? item.event : undefined;
          if (eventoUnitario) {
            eventosExistentes.add(eventoUnitario);
          }

          const eventosArray = Array.isArray(item.events) ? item.events :
            Array.isArray(item.eventTypes) ? item.eventTypes :
            Array.isArray(item.triggers) ? item.triggers :
            null;

          if (eventosArray) {
            for (const evt of eventosArray) {
              if (typeof evt === 'string') {
                eventosExistentes.add(evt);
              }
            }
          }

          logger.info('Asaas :: webhook existente encontrado', {
            banco_id: banco.id,
            url_retorno: urlRetorno,
            eventos: Array.from(eventosExistentes)
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.warn('Não foi possível listar webhooks existentes no Asaas', {
        banco_id: banco.id,
        error: errorMessage
      });
    }

    const eventosRegistrados: string[] = [];
    const eventosFalhos: string[] = [];

    for (const evento of eventosDesejados) {
      if (eventosExistentes.has(evento)) {
        logger.info('Asaas :: webhook já existente para evento', {
          banco_id: banco.id,
          url: urlRetorno,
          evento
        });
        continue;
      }

      try {
        const payload: Record<string, JsonValue> = {
          event: evento,
          target: urlRetorno,
          apiVersion: 3,
          name: `${SYSTEM_NAME} - ${evento}`,
          enabled: true
        };

        if (webhookSecret) {
          payload.accessToken = webhookSecret;
        }

        logger.info(`Asaas :: registrando webhook - endpoint: ${endpointBase} target: ${urlRetorno}`, {
          banco_id: banco.id,
          evento,
          payload_target: payload.target,
          payload_name: payload.name,
          payload_apiVersion: payload.apiVersion
        });

        const resposta = await axios.post(endpointBase, payload, {
          headers,
          timeout: 20000
        });

        if (resposta.status >= 200 && resposta.status < 300) {
          eventosRegistrados.push(evento);
          eventosExistentes.add(evento);
          logger.info(`Asaas :: webhook registrado - endpoint: ${endpointBase} target: ${urlRetorno}`, {
            banco_id: banco.id,
            evento,
            status: resposta.status
          });
        } else {
          eventosFalhos.push(evento);
          logger.warn(`Asaas :: webhook não registrado - endpoint: ${endpointBase} target: ${urlRetorno}`, {
            banco_id: banco.id,
            evento,
            status: resposta.status,
            data: resposta.data
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        const { mensagem, dados } = AsaasHelpers.extrairMensagemErro(error, errorMessage);

        const erros = Array.isArray((dados as Record<string, JsonValue> | undefined)?.errors)
          ? (dados as { errors: Array<Record<string, JsonValue>> }).errors
          : [];

        const descricaoErro = erros.find((item) => typeof item.description === 'string')?.description as string | undefined;
        const codigoErro = erros.find((item) => typeof item.code === 'string' || typeof item.code === 'number')?.code;

        if (descricaoErro && /já existe|already exists|existente/i.test(descricaoErro)) {
          eventosExistentes.add(evento);
          logger.info(`Asaas :: webhook já existia para o evento - endpoint: ${endpointBase} target: ${urlRetorno}`, {
            banco_id: banco.id,
            evento,
            descricao: descricaoErro,
            codigo: codigoErro
          });
          continue;
        }

        logger.warn(`Falha ao registrar webhook no Asaas - endpoint: ${endpointBase} target: ${urlRetorno}`, {
          banco_id: banco.id,
          evento,
          error: mensagem,
          data: dados
        });
        eventosFalhos.push(evento);
      }
    }

    if (eventosRegistrados.length === 0 && eventosExistentes.size === 0) {
      return {
        success: false,
        message: eventosFalhos.length > 0
          ? `Não foi possível registrar webhook no Asaas: ${eventosFalhos.join(', ')}`
          : 'Não foi possível registrar webhook no Asaas'
      };
    }

    if (eventosFalhos.length > 0) {
      return {
        success: false,
        message: `Webhook parcialmente configurado no Asaas. Eventos com falha: ${eventosFalhos.join(', ')}`,
        data: {
          url: urlRetorno,
          eventos_registrados: eventosRegistrados,
          eventos_existentes: Array.from(eventosExistentes),
          eventos_falhos: eventosFalhos
        }
      };
    }

    logger.info('Webhook do Asaas configurado com sucesso', {
      banco_id: banco.id,
      url: urlRetorno,
      eventos_registrados: eventosRegistrados
    });

    return {
      success: true,
      message: `Webhook do Asaas configurado com sucesso (${urlRetorno})`,
      data: {
        url: urlRetorno,
        eventos_registrados: eventosRegistrados,
        eventos_existentes: Array.from(eventosExistentes)
      }
    };
  }
}
