import axios from 'axios';
import { Banco } from '../../../../models/cadastros/Banco';
import { Titulo } from '../../../../models/financeiro/Titulo';
import { logger } from '../../../../utils/logger';
import { efiConfig } from '../../../../config/bancos/efi';
import type { JsonValue } from '../../../../types/index';
import type { ApiResponse, TituloWithRelations, AxiosErrorResponse } from '../../types';
import { EfiHelpers } from '../EfiHelpers';

interface ClienteForBoleto {
  razao_social: string;
  cnpj: string;
  telefone: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
}

interface PlanoForBoleto {
  nome_plano: string;
}

export class EfiTituloService {
  /**
   * Gerar título/boleto na Efi
   */
  static async gerarTitulo(titulo: TituloWithRelations, banco: Banco, token: string): Promise<ApiResponse> {
    try {
      const cliente = titulo.cliente;
      const plano = titulo.plano;

      if (!cliente || !plano) {
        return {
          success: false,
          message: 'Cliente ou plano não encontrado'
        };
      }

      if (!cliente.telefone || !cliente.endereco || !cliente.numero || !cliente.bairro || !cliente.cep || !cliente.cidade || !cliente.estado) {
        return {
          success: false,
          message: 'Cliente está com dados incompletos para gerar boleto'
        };
      }

      const clienteForBoleto: ClienteForBoleto = {
        razao_social: cliente.razao_social,
        cnpj: cliente.cnpj,
        telefone: cliente.telefone,
        endereco: cliente.endereco,
        numero: cliente.numero,
        complemento: cliente.complemento || undefined,
        bairro: cliente.bairro,
        cep: cliente.cep,
        cidade: cliente.cidade,
        estado: cliente.estado
      };

      const planoForBoleto: PlanoForBoleto = {
        nome_plano: plano.nome_plano
      };

      const dadosBoleto = await EfiHelpers.prepararDadosBoleto(banco, titulo, clienteForBoleto, planoForBoleto);

      const baseUrlCobranca = banco.sandbox 
        ? efiConfig.sandbox_url
        : efiConfig.cobranca_base_url;
      const endpoint = baseUrlCobranca + efiConfig.api_endpoints.boleto;

      const headers = EfiHelpers.buildAuthHeaders(token);
      headers['Content-Type'] = 'application/json';

      const maxTentativas = 3;
      let delay = 2000;
      let response = null;

      for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
          response = await axios.post(endpoint, dadosBoleto, { 
            headers,
            timeout: 30000
          });
          break;
        } catch (error) {
          const axiosError = error as Error & AxiosErrorResponse;
          const isTimeout = axiosError.code === 'ECONNABORTED' || 
                           axiosError.response?.status === 504 || 
                           axiosError.response?.status === 502 || 
                           axiosError.response?.status === 503;

          if (tentativa < maxTentativas && isTimeout) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          } else {
            throw error;
          }
        }
      }

      if (!response) {
        return {
          success: false,
          message: 'Nenhuma resposta recebida do servidor'
        };
      }

      if (response.status >= 200 && response.status < 300) {
        return await this.processarRespostaGeracao(response.data, titulo, banco, headers, baseUrlCobranca);
      }

      return {
        success: false,
        message: 'Erro ao gerar título'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const axiosError = error as Error & AxiosErrorResponse;
      const errorResponse = axiosError.response;

      logger.error('Erro ao gerar título na Efi', {
        titulo_id: titulo.id,
        banco_id: banco.id,
        error: errorMessage,
        status: errorResponse?.status
      });

      let finalErrorMessage = 'Erro ao gerar título: ' + errorMessage;
      if (errorResponse?.status === 401) {
        finalErrorMessage = 'Erro de autenticação (401): Verifique as credenciais (Client ID e Client Secret) do banco.';
      }

      return {
        success: false,
        message: finalErrorMessage
      };
    }
  }

  /**
   * Processa resposta da geração de título
   */
  private static async processarRespostaGeracao(
    dados: Record<string, JsonValue>,
    titulo: TituloWithRelations,
    banco: Banco,
    headers: Record<string, string>,
    baseUrlCobranca: string
  ): Promise<ApiResponse> {
        const { BarcodeService } = await import('../../BarcodeService');
    
    const chargeId = EfiHelpers.getNestedValue(dados, efiConfig.api_response_mapping.boleto.id);
    const chargeIdString = chargeId != null ? String(chargeId) : null;
    const barcode = EfiHelpers.getNestedValue(dados, efiConfig.api_response_mapping.boleto.barcode);
    const url = EfiHelpers.getNestedValue(dados, efiConfig.api_response_mapping.boleto.url);
    
    const linhaDigitavelPath = efiConfig.api_response_mapping.boleto.linha_digitavel || '';
    const linhaDigitavelRaw = linhaDigitavelPath ? EfiHelpers.getNestedValue(dados, linhaDigitavelPath) : null;
    const linhaDigitavel = (typeof linhaDigitavelRaw === 'string' ? linhaDigitavelRaw : null) || (typeof barcode === 'string' ? barcode : null);
    const { codigo_barras: codigoBarrasFinal, linha_digitavel: linhaDigitavelFormatada } =
      BarcodeService.normalizarCodigosBoleto(barcode, linhaDigitavel);
    const pdfUrl = EfiHelpers.getNestedValue(dados, efiConfig.api_response_mapping.boleto.pdf);
    const pixQrcode = EfiHelpers.getNestedValue(dados, efiConfig.api_response_mapping.boleto.pix_qrcode);
    const pixQrcodeImage = EfiHelpers.getNestedValue(dados, efiConfig.api_response_mapping.boleto.pix_qrcode_image);
    const nossoNumeroRaw =
      EfiHelpers.getNestedValue(dados, 'data.banking_billet.nosso_numero') ??
      EfiHelpers.getNestedValue(dados, 'data.banking_billet.our_number') ??
      EfiHelpers.getNestedValue(dados, 'data.nosso_numero') ??
      EfiHelpers.getNestedValue(dados, 'data.our_number');
    const nossoNumero = typeof nossoNumeroRaw === 'string'
      ? nossoNumeroRaw
      : nossoNumeroRaw != null
        ? String(nossoNumeroRaw)
        : null;

    const tituloModel = titulo as unknown as Titulo & { __skipTituloUpdate?: boolean };
    if (!tituloModel.__skipTituloUpdate && typeof tituloModel.update === 'function') {
      await tituloModel.update({
        charge_id: chargeIdString,
        codigo_barras: codigoBarrasFinal,
        url_boleto: typeof url === 'string' ? url : null,
        linha_digitavel: linhaDigitavelFormatada,
        qrcode: typeof pixQrcode === 'string' ? pixQrcode : null,
        qrcode_image: typeof pixQrcodeImage === 'string' ? pixQrcodeImage : null,
        nosso_numero: nossoNumero,
        status: 'pendente'
      });
    }

    try {
      const baseUrl = banco.url_retorno;
      if (baseUrl && chargeIdString) {
        const metadataEndpoint = `${baseUrlCobranca}/v1/charge/${chargeIdString}/metadata`;
        const metadataPayload = {
          notification_url: baseUrl,
          custom_id: `titulo_${titulo.id}`
        };
        await axios.put(metadataEndpoint, metadataPayload, { headers });
      }
    } catch (metadataError) {
      // Ignorar erro de metadados
    }

    return {
      success: true,
      message: 'Título gerado com sucesso',
      data: {
        charge_id: chargeIdString ?? undefined,
        codigo_barras: codigoBarrasFinal,
        url_boleto: typeof url === 'string' ? url : null,
        linha_digitavel: linhaDigitavelFormatada,
        pdf_url: pdfUrl,
        qrcode: pixQrcode,
        qrcode_image: pixQrcodeImage,
        nosso_numero: nossoNumero ?? undefined
      }
    };
  }

  /**
   * Cancelar título na Efi
   */
  static async cancelarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
    try {
      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Charge ID não encontrado'
        };
      }

      const baseUrlCobranca = banco.sandbox
        ? (efiConfig.sandbox_url || efiConfig.cobranca_base_url)
        : efiConfig.cobranca_base_url;

      const endpoint = `${baseUrlCobranca}${efiConfig.api_endpoints.cancelar.replace(':id', titulo.charge_id)}/cancel`;
      const headers = EfiHelpers.buildAuthHeaders(token);

      await axios.put(endpoint, {}, { headers, timeout: 30000 });
      await titulo.update({ status: 'cancelado' });

      return {
        success: true,
        message: 'Título cancelado com sucesso'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao cancelar título na Efi', {
        titulo_id: titulo.id,
        error: errorMessage
      });

      return {
        success: false,
        message: 'Erro ao cancelar título: ' + errorMessage
      };
    }
  }

  /**
   * Liquidar título na Efi
   */
  static async liquidarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
    try {
      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Charge ID não encontrado'
        };
      }

      const baseUrlCobranca = banco.sandbox
        ? efiConfig.sandbox_url
        : efiConfig.cobranca_base_url;

      const endpoint = `${baseUrlCobranca}${efiConfig.api_endpoints.liquidar.replace(':id', titulo.charge_id)}`;
      const headers = EfiHelpers.buildAuthHeaders(token);
      headers['Content-Type'] = 'application/json';

      await axios.put(endpoint, {}, { headers, timeout: 30000 });
      await titulo.update({ status: 'pago' });

      return {
        success: true,
        message: 'Título liquidado com sucesso'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao liquidar título na Efi', {
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
   * Consultar status do título na Efi
   */
  static async consultarStatus(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
    try {
      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Charge ID não encontrado'
        };
      }

      const baseUrlCobranca = banco.sandbox
        ? (efiConfig.sandbox_url || efiConfig.cobranca_base_url)
        : efiConfig.cobranca_base_url;

      const endpoint = `${baseUrlCobranca}${efiConfig.api_endpoints.consultar.replace(':id', titulo.charge_id)}`;
      const headers = EfiHelpers.buildAuthHeaders(token);

      const response = await axios.get(endpoint, { headers, timeout: 30000 });
      const dados = response.data as Record<string, JsonValue>;
      const status = EfiHelpers.getNestedValue(dados, efiConfig.api_response_mapping.status.status);

      return {
        success: true,
        message: 'Status consultado com sucesso',
        status: typeof status === 'string' ? status : undefined,
        data: dados
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao consultar status na Efi', {
        titulo_id: titulo.id,
        error: errorMessage
      });

      return {
        success: false,
        message: 'Erro ao consultar status: ' + errorMessage
      };
    }
  }
}
