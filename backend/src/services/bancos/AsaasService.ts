import axios from 'axios';
import { Banco } from '../../models/Banco';
import { Titulo } from '../../models/Titulo';
import { Cliente } from '../../models/Cliente';
import { Plano } from '../../models/Plano';
import { logger } from '../../utils/logger';
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
        const barcode = typeof dados.bankSlipBarcode === 'string' ? dados.bankSlipBarcode : null;
        let linhaDigitavel = typeof dados.identificationField === 'string' ? dados.identificationField : null;
        const pixQrCode = typeof dados.pixQrCode === 'string' ? dados.pixQrCode : null;
        const pixQrCodeImage = typeof dados.pixQrCodeImage === 'string' ? dados.pixQrCodeImage : null;

        // Se não tem linha digitável, gerar localmente (para sandbox)
        if (!linhaDigitavel && banco.sandbox) {
          try {
            linhaDigitavel = await titulo.gerarLinhaDigitavel();
          } catch (gerarError) {
            logger.warn('Erro ao gerar linha digitável localmente', { titulo_id: titulo.id, error: gerarError });
          }
        }

        await titulo.update({
          charge_id: chargeId,
          codigo_barras: barcode,
          url_boleto: urlBoleto,
          linha_digitavel: linhaDigitavel,
          qrcode: pixQrCode,
          qrcode_image: pixQrCodeImage,
          status: 'pendente'
        });

        return {
          success: true,
          message: 'Título gerado com sucesso',
          data: {
            charge_id: chargeId ?? undefined,
            codigo_barras: barcode,
            url_boleto: urlBoleto,
            linha_digitavel: linhaDigitavel,
            pdf_url: pdfUrl,
            qrcode: pixQrCode,
            qrcode_image: pixQrCodeImage
          }
        };
      }

      return {
        success: false,
        message: 'Erro ao gerar título no Asaas'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const axiosError = error as Error & AxiosErrorResponse;
      const errorResponse = axiosError.response;

      logger.error('Erro ao gerar título no Asaas', {
        titulo_id: titulo.id,
        banco_id: banco.id,
        status: errorResponse?.status,
        data: errorResponse?.data,
        error: errorMessage
      });

      let finalMessage = 'Erro ao gerar título: ' + errorMessage;
      if (errorResponse?.status === 401) {
        finalMessage = 'Erro de autenticação (401): Verifique a API Key do Asaas.';
      }

      return {
        success: false,
        message: finalMessage
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
        await titulo.update({ status: 'cancelado' });

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
      const axiosError = error as Error & AxiosErrorResponse;
      const errorResponse = axiosError.response;
      const responseData = errorResponse?.data;

      logger.error('Erro ao cancelar título no Asaas', {
        titulo_id: titulo.id,
        endpoint,
        error: errorMessage,
        status: errorResponse?.status,
        data: responseData
      });

      let detalhes = errorMessage;
      if (responseData && typeof responseData === 'object') {
        const dataObj = responseData as Record<string, JsonValue>;
        const messageField = dataObj?.message;
        if (typeof messageField === 'string' && messageField.trim()) {
          detalhes = messageField;
        } else if (Array.isArray(dataObj?.errors) && dataObj.errors.length > 0) {
          const firstError = dataObj.errors[0] as Record<string, JsonValue>;
          const description = firstError?.description;
          if (typeof description === 'string' && description.trim()) {
            detalhes = description;
          }
          const code = firstError?.code;
          if (typeof code === 'string' && code.trim()) {
            detalhes += ` (código: ${code})`;
          }
        }
      }

      return {
        success: false,
        message: 'Erro ao cancelar título: ' + detalhes
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
      const endpoint = `${baseUrl}${asaasConfig.api_endpoints.liquidar}/${titulo.charge_id}/receiveInCash`;

      const payload = {
        paymentDate: new Date().toISOString().split('T')[0],
        value: titulo.valor,
        notifyCustomer: false
      };

      await axios.post(endpoint, payload, { headers, timeout: 30000 });

      await titulo.update({ status: 'pago' });

      return {
        success: true,
        message: 'Título liquidado com sucesso'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao liquidar título no Asaas', {
        titulo_id: titulo.id,
        error: errorMessage
      });

      return {
        success: false,
        message: 'Erro ao liquidar título: ' + errorMessage
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
}

