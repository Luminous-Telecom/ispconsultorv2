import axios from 'axios';
import { Titulo } from '../../../../models/financeiro/Titulo';
import { Banco } from '../../../../models/cadastros/Banco';
import { Plano } from '../../../../models/cadastros/Plano';
import { logger } from '../../../../utils/logger';
import { formatDateOnly } from '../../../../utils/timezoneUtils';
import { BarcodeService } from '../../BarcodeService';
import asaasConfig from '../../../../config/bancos/asaas';
import type { ApiResponse, TituloWithRelations, AxiosErrorResponse } from '../../types';
import type { JsonValue } from '../../../../types/index';
import { AsaasHelpers } from '../AsaasHelpers';
import { AsaasClienteService } from '../AsaasClienteService';

export class AsaasTituloService {
  /**
   * Gera título/boleto no Asaas
   */
  static async gerarTitulo(
    titulo: TituloWithRelations,
    banco: Banco,
    token: string
  ): Promise<ApiResponse> {
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

      const headers = AsaasHelpers.buildAuthHeaders(token);

      const customerId = await AsaasClienteService.obterOuCriarCliente(baseUrl, headers, cliente, banco);
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
            const tituloModel = titulo as unknown as Titulo;
            linhaDigitavelRaw = await tituloModel.gerarLinhaDigitavel();
          } catch (gerarError) {
            logger.warn('Erro ao gerar linha digitável localmente', { titulo_id: titulo.id, error: gerarError });
          }
        }

        const linhaDigitavelFormatada = linhaDigitavelRaw
          ? BarcodeService.formatarLinhaDigitavel(linhaDigitavelRaw)
          : null;
        
        const codigoBarrasFinal = barcode ? BarcodeService.converterLinhaDigitavelParaCodigoBarras(barcode.replace(/\D/g, '')) : null;

        const pixQrCodeImageNormalized = pixQrCodeImage && !pixQrCodeImage.startsWith('data:image/')
          ? `data:image/png;base64,${pixQrCodeImage}`
          : pixQrCodeImage || null;

        // Se o título foi criado (tem charge_id), retornar sucesso mesmo se PIX estiver incompleto
        // O PIX pode ser atualizado posteriormente via webhook
        if (chargeId) {
          const tituloModel = titulo as unknown as Titulo;
          await tituloModel.update({
            charge_id: String(chargeId),
            codigo_barras: codigoBarrasFinal,
            url_boleto: urlBoleto,
            linha_digitavel: linhaDigitavelFormatada,
            qrcode: pixQrCodeStringValue || pixQrCode || null,
            qrcode_image: pixQrCodeImageNormalized,
            nosso_numero: nossoNumero || null,
            status: 'pendente'
          });

          return {
            success: true,
            message: 'Título gerado com sucesso' + (!pixQrCodeImageNormalized && !pixQrCodeStringValue ? ' (dados de PIX podem estar incompletos)' : ''),
            data: {
              charge_id: String(chargeId),
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
      }

      return {
        success: false,
        message: 'Erro ao gerar título no Asaas: resposta inválida'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const { mensagem, dados } = AsaasHelpers.extrairMensagemErro(error, errorMessage);
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
   * Cancela título no Asaas
   */
  static async cancelarTitulo(
    titulo: Titulo,
    banco: Banco,
    token: string
  ): Promise<ApiResponse> {
    try {
      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Charge ID não encontrado'
        };
      }

      const baseUrl = banco.sandbox
        ? (asaasConfig.sandbox_url || asaasConfig.cobranca_base_url || asaasConfig.api_base_url)
        : (asaasConfig.cobranca_base_url || asaasConfig.api_base_url);

      const endpoint = `${baseUrl}${asaasConfig.api_endpoints.cancelar.replace(':id', titulo.charge_id)}`;
      const headers = AsaasHelpers.buildAuthHeaders(token);

      logger.info('Asaas :: cancelando cobrança', {
        endpoint,
        titulo_id: titulo.id,
        charge_id: titulo.charge_id,
        sandbox: banco.sandbox
      });

      const response = await axios.delete(endpoint, {
        headers,
        timeout: 30000
      });

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
    } catch (error: unknown) {
      const { mensagem, dados } = AsaasHelpers.extrairMensagemErro(error, 'Erro ao cancelar título');
      const axiosError = error as Error & AxiosErrorResponse;

      logger.error('Erro ao cancelar título no Asaas', {
        titulo_id: titulo.id,
        error: mensagem,
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
   * Liquida título no Asaas
   */
  static async liquidarTitulo(
    titulo: Titulo,
    banco: Banco,
    token: string
  ): Promise<ApiResponse> {
    try {
      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Charge ID não encontrado'
        };
      }

      const baseUrl = banco.sandbox
        ? (asaasConfig.sandbox_url || asaasConfig.cobranca_base_url || asaasConfig.api_base_url)
        : (asaasConfig.cobranca_base_url || asaasConfig.api_base_url);

      const endpoint = `${baseUrl}${asaasConfig.api_endpoints.liquidar.replace(':id', titulo.charge_id)}`;
      const headers = AsaasHelpers.buildAuthHeaders(token);

      const payload = {
        paymentDate: formatDateOnly(new Date()) || '',
        value: Number(titulo.valor),
        notifyCustomer: false
      };

      await axios.post(endpoint, payload, { headers, timeout: 30000 });

      return {
        success: true,
        message: 'Título liquidado com sucesso'
      };
    } catch (error: unknown) {
      const { mensagem, dados } = AsaasHelpers.extrairMensagemErro(error, 'Erro ao liquidar título');
      const axiosError = error as Error & AxiosErrorResponse;

      logger.error('Erro ao liquidar título no Asaas', {
        titulo_id: titulo.id,
        error: mensagem,
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
   * Consulta status do título no Asaas
   */
  static async consultarStatus(
    titulo: Titulo,
    banco: Banco,
    token: string
  ): Promise<ApiResponse> {
    try {
      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Charge ID não encontrado'
        };
      }

      const baseUrl = banco.sandbox
        ? (asaasConfig.sandbox_url || asaasConfig.cobranca_base_url || asaasConfig.api_base_url)
        : (asaasConfig.cobranca_base_url || asaasConfig.api_base_url);

      const endpoint = `${baseUrl}${asaasConfig.api_endpoints.consultar.replace(':id', titulo.charge_id)}`;
      const headers = AsaasHelpers.buildAuthHeaders(token);

      const response = await axios.get(endpoint, {
        headers,
        timeout: 30000
      });

      if (response.status >= 200 && response.status < 300) {
        const dados = response.data as Record<string, JsonValue>;
        const status = typeof dados.status === 'string' ? dados.status : null;
        const statusNorm = typeof status === 'string' ? status.toLowerCase() : null;

        return {
          success: true,
          message: 'Status consultado com sucesso',
          status: statusNorm || undefined,
          data: dados
        };
      }

      return {
        success: false,
        message: 'Erro ao consultar status'
      };
    } catch (error: unknown) {
      const { mensagem } = AsaasHelpers.extrairMensagemErro(error, 'Erro ao consultar status');
      logger.error('Erro ao consultar status no Asaas', {
        titulo_id: titulo.id,
        error: mensagem
      });

      return {
        success: false,
        message: 'Erro ao consultar status: ' + mensagem
      };
    }
  }

  /**
   * Monta payload para criação de pagamento no Asaas
   */
  private static montarPayloadPagamento(
    titulo: TituloWithRelations,
    banco: Banco,
    plano: Plano,
    customerId: string
  ): Record<string, any> {
    const valor = AsaasHelpers.roundTwoDecimals(Number(titulo.valor));
    const descricaoBase = titulo.descricao || plano.nome_plano || `Título ${titulo.numero_titulo}`;
    const dueDate = formatDateOnly(titulo.data_vencimento) || '';

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

    const multa = AsaasHelpers.roundTwoDecimals(Number(banco.percentual_multa));
    if (multa > 0) {
      payload.fine = { value: multa };
    }

    const juros = AsaasHelpers.roundTwoDecimals(Number(banco.percentual_juros));
    if (juros > 0) {
      payload.interest = { value: juros };
    }

    const desconto = AsaasHelpers.roundTwoDecimals(Number(banco.desconto_valor));
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
}
