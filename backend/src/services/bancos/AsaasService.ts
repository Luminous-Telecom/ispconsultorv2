import axios from 'axios';
import { Banco } from '../../models/Banco';
import { Titulo } from '../../models/Titulo';
import { Cliente } from '../../models/Cliente';
import { Plano } from '../../models/Plano';
import { logger } from '../../utils/logger';
import { BarcodeService } from '../BarcodeService';
import asaasConfig from '../../config/bancos/asaas';
import type { JsonValue } from '../../types';
import type { ApiResponse, TituloWithRelations, AxiosErrorResponse, IBancoService } from './types';

export class AsaasService implements IBancoService {
  /**
   * Obter token (API Key) do Asaas
   */
  async obterToken(banco: Banco): Promise<string | null> {
    let apiKey = banco.api_key;

    if (!apiKey && (banco as any).dataValues) {
      apiKey = (banco as any).dataValues.api_key;
    }

    if (!apiKey && typeof (banco as any).getDataValue === 'function') {
      apiKey = (banco as any).getDataValue('api_key');
    }

    if (!apiKey) {
      logger.error('API Key não configurada para Asaas', {
        banco_id: banco.id,
        banco_nome: banco.nome
      });
      return null;
    }

    return apiKey;
  }

  /**
   * Gerar título/boleto no Asaas
   */
  async gerarTitulo(titulo: TituloWithRelations, banco: Banco, token: string): Promise<ApiResponse> {
    try {
      const cliente = titulo.cliente;
      const plano = titulo.plano;

      if (!cliente) {
        return {
          success: false,
          message: 'Cliente não encontrado'
        };
      }

      if (!plano) {
        return {
          success: false,
          message: 'Plano não encontrado'
        };
      }

      if (!cliente.telefone || !cliente.endereco || !cliente.numero || !cliente.bairro || !cliente.cep || !cliente.cidade || !cliente.estado) {
        return {
          success: false,
          message: 'Cliente está com dados incompletos para gerar boleto'
        };
      }

      const baseUrl = banco.sandbox
        ? (asaasConfig.sandbox_url || asaasConfig.cobranca_base_url || asaasConfig.api_base_url)
        : (asaasConfig.cobranca_base_url || asaasConfig.api_base_url);

      if (!baseUrl) {
        return {
          success: false,
          message: 'URL da API do Asaas não configurada'
        };
      }

      const headers = this.buildAuthHeaders(token);

      const customerId = await this.obterOuCriarCliente(baseUrl, headers, cliente, banco);
      if (!customerId) {
        return {
          success: false,
          message: 'Falha ao sincronizar cliente no Asaas'
        };
      }

      const payload = this.montarPayloadPagamento(titulo, banco, plano, customerId);
      const endpoint = `${baseUrl}${asaasConfig.api_endpoints.boleto}`;

      const response = await axios.post(endpoint, payload, {
        headers,
        timeout: 30000
      });

      if (response.status >= 200 && response.status < 300) {
        const dados = response.data as Record<string, JsonValue>;

        const chargeIdRaw = dados.id;
        const chargeId = typeof chargeIdRaw === 'string'
          ? chargeIdRaw
          : chargeIdRaw != null
            ? String(chargeIdRaw)
            : null;

        const urlBoleto = typeof dados.bankSlipUrl === 'string' ? dados.bankSlipUrl : null;
        const pdfUrl = typeof dados.invoiceUrl === 'string' ? dados.invoiceUrl : null;
        let barcode = typeof dados.bankSlipBarcode === 'string' ? dados.bankSlipBarcode : null;
        let linhaDigitavelRaw = typeof dados.identificationField === 'string' ? dados.identificationField : null;
        let pixQrCode = typeof dados.pixQrCode === 'string' ? dados.pixQrCode : null;
        let pixQrCodeStringValue = typeof dados.pixQrCodeText === 'string' ? dados.pixQrCodeText : null;
        let pixQrCodeImage = typeof dados.pixQrCodeImage === 'string' ? dados.pixQrCodeImage : null;
        const nossoNumeroRaw = dados.nossoNumero;
        const nossoNumero = typeof nossoNumeroRaw === 'string'
          ? nossoNumeroRaw
          : nossoNumeroRaw != null
            ? String(nossoNumeroRaw)
            : null;

        // Buscar linha digitável / código de barras caso não retornem na criação
        if ((!linhaDigitavelRaw || !barcode) && chargeId) {
          try {
            const identificationEndpoint = `${baseUrl}/payments/${chargeId}/identificationField`;
            const identificationResponse = await axios.get(identificationEndpoint, {
              headers,
              timeout: 30000
            });
            const identificationData = identificationResponse.data as Record<string, JsonValue>;
            const identificationFieldRaw = identificationData?.identificationField;
            const barCodeRaw = identificationData?.barCode;

            if (!linhaDigitavelRaw && typeof identificationFieldRaw === 'string') {
              linhaDigitavelRaw = identificationFieldRaw;
            }

            if (!barcode && typeof barCodeRaw === 'string') {
              barcode = barCodeRaw;
            }
          } catch (identificationError) {
            logger.warn('Não foi possível obter identificação do boleto Asaas', {
              titulo_id: titulo.id,
              charge_id: chargeId,
              error: identificationError instanceof Error ? identificationError.message : String(identificationError)
            });
          }
        }

        // Buscar dados de PIX caso não venham na criação
        if ((!pixQrCode || !pixQrCodeImage || !pixQrCodeStringValue) && chargeId) {
          try {
            const detailsEndpoint = `${baseUrl}/payments/${chargeId}`;
            const detailsResponse = await axios.get(detailsEndpoint, {
              headers,
              timeout: 30000
            });
            const detailsData = detailsResponse.data as Record<string, JsonValue>;
            const pixQrCodeRaw = detailsData?.pixQrCode;
            const pixQrCodeStringRaw = detailsData?.pixQrCodeText ?? detailsData?.pixQrCodeString;
            const pixQrCodeImageRaw = detailsData?.pixQrCodeImage;
            if (!pixQrCode && typeof pixQrCodeRaw === 'string') {
              pixQrCode = pixQrCodeRaw;
            }
            if (!pixQrCodeStringValue && typeof pixQrCodeStringRaw === 'string') {
              pixQrCodeStringValue = pixQrCodeStringRaw;
            }
            if (!pixQrCodeImage && typeof pixQrCodeImageRaw === 'string') {
              pixQrCodeImage = pixQrCodeImageRaw;
            }
          } catch (detailsError) {
            logger.warn('Não foi possível obter dados de PIX no Asaas (detalhes)', {
              titulo_id: titulo.id,
              charge_id: chargeId,
              error: detailsError instanceof Error ? detailsError.message : String(detailsError)
            });
          }

          if (!pixQrCodeImage || !pixQrCodeStringValue) {
            try {
              const pixEndpoint = `${baseUrl}/payments/${chargeId}/pixQrCode`;
              const pixResponse = await axios.get(pixEndpoint, {
                headers,
                timeout: 30000
              });
              const pixData = pixResponse.data as Record<string, JsonValue>;
              const encodedImage = pixData?.encodedImage;
              const payload = pixData?.payload ?? pixData?.text;

              if (!pixQrCode && typeof payload === 'string') {
                pixQrCode = payload;
              }
              if (!pixQrCodeStringValue && typeof payload === 'string') {
                pixQrCodeStringValue = payload;
              }

              if (typeof encodedImage === 'string' && encodedImage.trim()) {
                pixQrCodeImage = encodedImage.startsWith('data:image/')
                  ? encodedImage
                  : `data:image/png;base64,${encodedImage}`;
              }
            } catch (pixError) {
              logger.warn('Não foi possível obter dados de PIX no Asaas (pixQrCode)', {
                titulo_id: titulo.id,
                charge_id: chargeId,
                error: pixError instanceof Error ? pixError.message : String(pixError)
              });
            }
          }
        }

        // Se não tem linha digitável, gerar localmente (para sandbox)
        if (!linhaDigitavelRaw && banco.sandbox) {
          try {
            linhaDigitavelRaw = await titulo.gerarLinhaDigitavel();
          } catch (gerarError) {
            logger.warn('Erro ao gerar linha digitável localmente', { titulo_id: titulo.id, error: gerarError });
          }
        }

        const linhaDigitavelFormatada = linhaDigitavelRaw
          ? BarcodeService.formatarLinhaDigitavel(linhaDigitavelRaw)
          : null;

        const codigoBarrasFinal = (() => {
          if (!barcode) return null;
          const apenasDigitos = barcode.replace(/\D/g, '');
          if (apenasDigitos.length === 44) {
            return apenasDigitos;
          }
          if (apenasDigitos.length === 47) {
            return apenasDigitos.substring(0, 4) +
              apenasDigitos.substring(32, 33) +
              apenasDigitos.substring(33) +
              apenasDigitos.substring(4, 32);
          }
          return apenasDigitos || null;
        })();

        const pixQrCodeImageNormalized = pixQrCodeImage && !pixQrCodeImage.startsWith('data:image/')
          ? `data:image/png;base64,${pixQrCodeImage}`
          : pixQrCodeImage || null;

        return {
          success: true,
          message: 'Título gerado com sucesso',
          data: {
            charge_id: chargeId ?? undefined,
            codigo_barras: codigoBarrasFinal,
            url_boleto: urlBoleto,
            linha_digitavel: linhaDigitavelFormatada,
            pdf_url: pdfUrl,
            qrcode: pixQrCodeStringValue || pixQrCode,
            qrcode_image: pixQrCodeImageNormalized,
            nosso_numero: nossoNumero ?? undefined
          }
        };
      }

      return {
        success: false,
        message: 'Erro ao gerar título no Asaas'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const { mensagem, dados } = AsaasService.extrairMensagemErro(error, errorMessage);
      const axiosError = error as Error & AxiosErrorResponse;

      logger.error('Erro ao gerar título no Asaas', {
        titulo_id: titulo.id,
        banco_id: banco.id,
        status: axiosError.response?.status,
        data: dados,
        error: errorMessage
      });

      return {
        success: false,
        message: 'Erro ao gerar título: ' + mensagem
      };
    }
  }

  /**
   * Cancelar título no Asaas
   */
  async cancelarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
    let endpoint = '';
    try {
      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Título não possui charge_id para cancelar'
        };
      }

      const baseUrl = banco.sandbox
        ? (asaasConfig.sandbox_url || asaasConfig.cobranca_base_url || asaasConfig.api_base_url)
        : (asaasConfig.cobranca_base_url || asaasConfig.api_base_url);

      const headers = this.buildAuthHeaders(token);
      endpoint = `${baseUrl}${asaasConfig.api_endpoints.cancelar.replace(':id', titulo.charge_id)}`;

      logger.info('Asaas :: cancelando cobrança', {
        endpoint,
        titulo_id: titulo.id,
        charge_id: titulo.charge_id,
        sandbox: banco.sandbox
      });

      const response = await axios.delete(endpoint, { headers, timeout: 30000 });

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          message: 'Título cancelado com sucesso'
        };
      }

      return {
        success: false,
        message: `Erro ao cancelar título: ${response.status}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const { mensagem, dados } = AsaasService.extrairMensagemErro(error, errorMessage);
      const axiosError = error as Error & AxiosErrorResponse;

      logger.error('Erro ao cancelar título no Asaas', {
        titulo_id: titulo.id,
        endpoint,
        error: errorMessage,
        status: axiosError.response?.status,
        data: dados
      });

      return {
        success: false,
        message: 'Erro ao cancelar título: ' + mensagem
      };
    }
  }

  /**
   * Liquidar título no Asaas
   */
  async liquidarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
    try {
      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Título não possui charge_id para liquidar'
        };
      }

      const baseUrl = banco.sandbox
        ? (asaasConfig.sandbox_url || asaasConfig.cobranca_base_url || asaasConfig.api_base_url)
        : (asaasConfig.cobranca_base_url || asaasConfig.api_base_url);

      const headers = this.buildAuthHeaders(token);
      const endpoint = `${baseUrl}${asaasConfig.api_endpoints.liquidar.replace(':id', titulo.charge_id)}`;

      const payload = {
        paymentDate: new Date().toISOString().split('T')[0],
        value: Number(titulo.valor),
        notifyCustomer: false
      };

      await axios.post(endpoint, payload, { headers, timeout: 30000 });

      return {
        success: true,
        message: 'Título liquidado com sucesso'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const { mensagem, dados } = AsaasService.extrairMensagemErro(error, errorMessage);
      const axiosError = error as Error & AxiosErrorResponse;

      logger.error('Erro ao liquidar título no Asaas', {
        titulo_id: titulo.id,
        error: errorMessage,
        status: axiosError.response?.status,
        data: dados
      });

      return {
        success: false,
        message: 'Erro ao liquidar título: ' + mensagem
      };
    }
  }

  /**
   * Consultar status do título no Asaas
   */
  async consultarStatus(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
    try {
      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Título não possui charge_id para consultar'
        };
      }

      const baseUrl = banco.sandbox
        ? (asaasConfig.sandbox_url || asaasConfig.cobranca_base_url || asaasConfig.api_base_url)
        : (asaasConfig.cobranca_base_url || asaasConfig.api_base_url);

      const headers = this.buildAuthHeaders(token);
      const endpoint = `${baseUrl}${asaasConfig.api_endpoints.consultar}/${titulo.charge_id}`;

      const response = await axios.get(endpoint, { headers, timeout: 30000 });

      const dados = response.data as Record<string, JsonValue>;
      const status = typeof dados.status === 'string' ? dados.status : null;

      return {
        success: true,
        message: 'Status consultado com sucesso',
        status: status ?? undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao consultar status no Asaas', {
        titulo_id: titulo.id,
        error: errorMessage
      });

      return {
        success: false,
        message: 'Erro ao consultar status: ' + errorMessage
      };
    }
  }

  /**
   * Configurar webhook do Asaas para receber notificações
   */
  async configurarWebhook(banco: Banco, token: string): Promise<ApiResponse> {
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

    const headers = this.buildAuthHeaders(token);
    const endpointBase = `${baseUrl}${asaasConfig.api_endpoints.webhook ?? '/webhook'}`;
    const webhookSecret = typeof (banco as Banco).webhook_secret === 'string' && (banco as Banco).webhook_secret
      ? (banco as Banco).webhook_secret as string
      : undefined;

    logger.info('Asaas :: iniciando configuração de webhook', {
      banco_id: banco.id,
      url_retorno: urlRetorno,
      endpoint: endpointBase,
      sandbox: banco.sandbox,
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
          name: `BackNet ERP - ${evento}`,
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
        const { mensagem, dados } = AsaasService.extrairMensagemErro(error, errorMessage);

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

  /**
   * Obter ou criar cliente no Asaas
   */
  private async obterOuCriarCliente(
    baseUrl: string,
    headers: Record<string, string>,
    cliente: Cliente,
    banco: Banco
  ): Promise<string | null> {
    const cpfCnpj = this.sanitizeDigits(cliente.cnpj);

    try {
      const searchUrl = `${baseUrl}/customers?cpfCnpj=${cpfCnpj}&limit=1`;
      const response = await axios.get(searchUrl, { headers, timeout: 20000 });
      const data = response.data as { data?: Array<Record<string, JsonValue>> };
      const customers = Array.isArray(data?.data) ? data.data : [];

      if (customers.length > 0) {
        const first = customers[0];
        const id = first?.id;
        const customerId = typeof id === 'string' ? id : typeof id === 'number' ? String(id) : null;

        if (customerId) {
          // Atualizar cliente existente para desabilitar notificações
          try {
            await axios.put(`${baseUrl}/customers/${customerId}`,
              { notificationDisabled: true },
              { headers, timeout: 20000 }
            );
          } catch (updateError) {
            // Ignorar erro ao atualizar notificações
          }

          return customerId;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.warn('Falha ao buscar cliente no Asaas, tentando criar novo', {
        banco_id: banco.id,
        cliente_id: cliente.id,
        error: errorMessage
      });
    }

    const payload: Record<string, JsonValue> = {
      name: cliente.razao_social || cliente.nome_fantasia || `Cliente ${cliente.id}`,
      email: cliente.email,
      cpfCnpj,
      postalCode: this.sanitizeDigits(cliente.cep),
      address: cliente.endereco || '',
      addressNumber: cliente.numero || '',
      city: cliente.cidade || '',
      state: cliente.estado || '',
      notify: false,
      externalReference: `cliente_${cliente.id}`,
      notificationDisabled: true
    };

    const companyName = cliente.nome_fantasia || cliente.razao_social;
    if (companyName) {
      payload.companyName = companyName;
    }

    const phone = this.normalizePhone(cliente.telefone);
    if (phone) {
      payload.phone = phone;
    }

    const mobilePhone = this.normalizePhone(cliente.whatsapp ?? cliente.telefone);
    if (mobilePhone) {
      payload.mobilePhone = mobilePhone;
    }

    if (cliente.complemento) {
      payload.complement = cliente.complemento;
    }

    if (cliente.bairro) {
      payload.province = cliente.bairro;
    }

    try {
      const response = await axios.post(`${baseUrl}/customers`, payload, {
        headers,
        timeout: 30000
      });

      const dados = response.data as Record<string, JsonValue>;
      const id = dados?.id;

      if (typeof id === 'string') {
        return id;
      }
      if (typeof id === 'number') {
        return String(id);
      }

      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const axiosError = error as Error & AxiosErrorResponse;
      const errorResponse = axiosError.response;

      logger.error('Erro ao criar cliente no Asaas', {
        banco_id: banco.id,
        cliente_id: cliente.id,
        status: errorResponse?.status,
        data: errorResponse?.data,
        error: errorMessage
      });

      throw error;
    }
  }

  /**
   * Montar payload de pagamento para o Asaas
   */
  private montarPayloadPagamento(
    titulo: TituloWithRelations,
    banco: Banco,
    plano: Plano,
    customerId: string
  ): Record<string, JsonValue> {
    const valor = this.roundTwoDecimals(Number(titulo.valor));
    const descricaoBase = titulo.descricao || plano.nome_plano || `Título ${titulo.numero_titulo}`;
    const dueDate = new Date(titulo.data_vencimento).toISOString().split('T')[0];

    const payload: Record<string, JsonValue> = {
      customer: customerId,
      billingType: 'BOLETO',
      dueDate,
      value: valor,
      description: descricaoBase,
      externalReference: `titulo_${titulo.id}`,
      postalService: false,
      notificationDisabled: true
    };

    const multa = this.roundTwoDecimals(Number(banco.percentual_multa));
    if (multa > 0) {
      payload.fine = { value: multa };
    }

    const juros = this.roundTwoDecimals(Number(banco.percentual_juros));
    if (juros > 0) {
      payload.interest = { value: juros };
    }

    const desconto = this.roundTwoDecimals(Number(banco.desconto_valor));
    if (desconto > 0) {
      const descontoTipo = (banco.desconto_tipo ?? '').toLowerCase();
      const discountType = descontoTipo === 'percentual' ? 'PERCENTAGE' : 'FIXED';

      payload.discount = {
        value: desconto,
        type: discountType,
        dueDateLimitDays: 0
      };
    }

    return payload;
  }

  /**
   * Construir headers de autenticação
   */
  private buildAuthHeaders(token: string): Record<string, string> {
    return {
      'access_token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Remover caracteres não numéricos
   */
  private sanitizeDigits(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return value.replace(/\D/g, '');
  }

  /**
   * Normalizar telefone para formato Asaas
   */
  private normalizePhone(telefone: string | null | undefined): string | undefined {
    const digits = this.sanitizeDigits(telefone);
    return digits ? digits : undefined;
  }

  /**
   * Arredondar para 2 casas decimais
   */
  private roundTwoDecimals(value: number | null | undefined): number {
    if (value == null || Number.isNaN(Number(value))) {
      return 0;
    }
    return Math.round(Number(value) * 100) / 100;
  }

  private static extrairMensagemErro(error: unknown, padrao: string): { mensagem: string; dados?: JsonValue } {
    const axiosError = error as Error & AxiosErrorResponse;
    const dados = axiosError.response?.data;
    let mensagem = padrao;

    if (dados && typeof dados === 'object') {
      const dataObj = dados as Record<string, JsonValue>;
      const msg = dataObj?.message;
      if (typeof msg === 'string' && msg.trim()) {
        mensagem = msg;
      } else if (Array.isArray(dataObj?.errors) && dataObj.errors.length > 0) {
        const firstError = dataObj.errors[0] as Record<string, JsonValue>;
        const description = firstError?.description;
        const code = firstError?.code;
        const partes: string[] = [];
        if (typeof description === 'string' && description.trim()) {
          partes.push(description.trim());
        }
        if (typeof code === 'string' && code.trim()) {
          partes.push(`código: ${code.trim()}`);
        }
        if (partes.length > 0) {
          mensagem = partes.join(' - ');
        }
      }
    }

    return { mensagem, dados };
  }
}

