import axios from 'axios';
import { Banco } from '../../models/Banco';
import { Titulo } from '../../models/Titulo';
import { Cliente } from '../../models/Cliente';
import { logger } from '../../utils/logger';
import { efiConfig } from '../../config/bancos/efi';
import type { JsonValue } from '../../types/index';
import type { ApiResponse, TituloWithRelations, AxiosErrorResponse, IBancoService } from './types';

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

interface BoletoData {
  items: Array<{
    name: string;
    value: number;
    amount: number;
  }>;
  metadata?: {
    custom_id?: string;
    notification_url?: string;
  };
  payment?: {
    banking_billet?: {
      customer?: JsonValue;
      expire_at?: string;
      configurations?: {
        fine?: number;
        interest?: number;
      };
      message?: string;
      [key: string]: JsonValue | undefined;
    };
  };
}

interface CustomerData {
  name: string;
  phone_number: string;
  juridical_person: {
    corporate_name: string;
    cnpj: string;
  };
  address: {
    street: string;
    number: string;
    neighborhood: string;
    zipcode: string;
    city: string;
    complement?: string;
    state: string;
  };
}

export class EfiService implements IBancoService {
  /**
   * Obter token OAuth da Efi
   */
  async obterToken(banco: Banco): Promise<string | null> {
    const maxTentativas = 3;
    let delay = 2000;

    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        const baseUrl = banco.sandbox ? efiConfig.sandbox_url : efiConfig.api_url;
        const endpoint = baseUrl + efiConfig.api_endpoints.auth;

        const authData = {
          [efiConfig.client_id_field]: banco.client_id_producao || null,
          [efiConfig.client_secret_field]: banco.client_secret_producao || null,
          grant_type: 'client_credentials'
        };

        const response = await axios.post(endpoint, authData, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        });

        if (response.data && response.data.access_token) {
          return response.data.access_token;
        }

        logger.warn('Token não encontrado na resposta', {
          response_keys: Object.keys(response.data || {}),
          tentativa
        });
        return null;
      } catch (error) {
        const axiosError = error as Error & AxiosErrorResponse;
        const isTimeout = axiosError.code === 'ECONNABORTED' ||
          axiosError.response?.status === 504 ||
          axiosError.response?.status === 502 ||
          axiosError.response?.status === 503;
        const errorResponse = axiosError.response;

        if (tentativa < maxTentativas && isTimeout) {
          logger.warn(`Tentativa ${tentativa} falhou por timeout, tentando novamente em ${delay}ms`, {
            banco_id: banco.id,
            status: errorResponse?.status,
            tentativa
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        if (errorResponse?.status === 401) {
          logger.warn('Token expirado/inválido, será renovado na próxima requisição', {
            banco_id: banco.id,
            status: errorResponse?.status,
            tentativa,
            isTimeout
          });
        } else {
          logger.error('Erro ao obter token', {
            banco_id: banco.id,
            tipo_banco: banco.tipo_banco,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            status: errorResponse?.status,
            tentativa,
            isTimeout
          });
        }
        return null;
      }
    }

    return null;
  }

  /**
   * Gerar título/boleto na Efi
   */
  async gerarTitulo(titulo: TituloWithRelations, banco: Banco, token: string): Promise<ApiResponse> {
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

      const dadosBoleto = await this.prepararDadosBoleto(banco, titulo, clienteForBoleto, planoForBoleto);

      const baseUrlCobranca = banco.sandbox 
        ? efiConfig.sandbox_url
        : efiConfig.cobranca_base_url;
      const endpoint = baseUrlCobranca + efiConfig.api_endpoints.boleto;

      const headers = this.buildAuthHeaders(token);
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
        const dados = response.data;
        const chargeId = this.getNestedValue(dados, efiConfig.api_response_mapping.boleto.id);
        const chargeIdString = chargeId != null ? String(chargeId) : null;
        const barcode = this.getNestedValue(dados, efiConfig.api_response_mapping.boleto.barcode);
        const url = this.getNestedValue(dados, efiConfig.api_response_mapping.boleto.url);
        // Importar BarcodeService para conversão correta (antes de usar)
        const { BarcodeService } = await import('./BarcodeService');
        
        const linhaDigitavelPath = efiConfig.api_response_mapping.boleto.linha_digitavel || '';
        const linhaDigitavelRaw = linhaDigitavelPath ? this.getNestedValue(dados, linhaDigitavelPath) : null;
        const linhaDigitavel = (typeof linhaDigitavelRaw === 'string' ? linhaDigitavelRaw : null) || (typeof barcode === 'string' ? barcode : null);
        const linhaDigitavelFormatada = linhaDigitavel ? BarcodeService.formatarLinhaDigitavel(linhaDigitavel) : null;
        const pdfUrl = this.getNestedValue(dados, efiConfig.api_response_mapping.boleto.pdf);
        const pixQrcode = this.getNestedValue(dados, efiConfig.api_response_mapping.boleto.pix_qrcode);
        const pixQrcodeImage = this.getNestedValue(dados, efiConfig.api_response_mapping.boleto.pix_qrcode_image);
        const nossoNumeroRaw =
          this.getNestedValue(dados, 'data.banking_billet.nosso_numero') ??
          this.getNestedValue(dados, 'data.banking_billet.our_number') ??
          this.getNestedValue(dados, 'data.nosso_numero') ??
          this.getNestedValue(dados, 'data.our_number');
        const nossoNumero = typeof nossoNumeroRaw === 'string'
          ? nossoNumeroRaw
          : nossoNumeroRaw != null
            ? String(nossoNumeroRaw)
            : null;

        let codigoBarrasFinal: string | null = null;
        if (barcode && typeof barcode === 'string') {
          const barcodeLimpo = barcode.replace(/\D/g, '');
          codigoBarrasFinal = BarcodeService.converterLinhaDigitavelParaCodigoBarras(barcodeLimpo);
        }

        const tituloModel = titulo as unknown as Titulo;
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

        // Atualizar metadados com notification_url
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
            codigo_barras: typeof barcode === 'string' ? barcode : null,
            url_boleto: typeof url === 'string' ? url : null,
            linha_digitavel: linhaDigitavel,
            pdf_url: pdfUrl,
            qrcode: pixQrcode,
            qrcode_image: pixQrcodeImage,
            nosso_numero: nossoNumero ?? undefined
          }
        };
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
   * Preparar dados do boleto para API da Efi
   */
  private async prepararDadosBoleto(
    banco: Banco,
    titulo: TituloWithRelations,
    cliente: ClienteForBoleto,
    plano: PlanoForBoleto
  ): Promise<BoletoData> {
    // Buscar dados da empresa (recebedor)
    const { DadosEmpresa } = await import('../../models/DadosEmpresa');
    const dadosEmpresa = await DadosEmpresa.findOne();

    if (!dadosEmpresa) {
      throw new Error('Dados da empresa não configurados');
    }

    // Validar dados obrigatórios do cliente
    if (!cliente.razao_social) throw new Error('Cliente deve ter razão social preenchida');
    if (!cliente.telefone) throw new Error('Cliente deve ter telefone preenchido');
    if (!cliente.cnpj) throw new Error('Cliente deve ter CNPJ preenchido');
    if (!cliente.endereco) throw new Error('Cliente deve ter endereço preenchido');
    if (!cliente.numero) throw new Error('Cliente deve ter número do endereço preenchido');
    if (!cliente.bairro) throw new Error('Cliente deve ter bairro preenchido');
    if (!cliente.cep) throw new Error('Cliente deve ter CEP preenchido');
    if (!cliente.cidade) throw new Error('Cliente deve ter cidade preenchida');
    if (!cliente.estado) throw new Error('Cliente deve ter estado preenchido');

    // Converter valor para centavos
    const valorCentavos = Math.round(Number(titulo.valor) * 100);

    // Multa/Juros em basis points (ex.: 2.00% => 200)
    const fineBp = Math.round(Number(banco.percentual_multa || 0) * 100);
    const interestBp = Math.round(Number(banco.percentual_juros || 0) * 100);

    // Garantir que nome tenha espaço (exigência da API EFI)
    const nomeCliente = cliente.razao_social || 'Cliente';
    const nomeFormatado = nomeCliente.includes(' ') ? nomeCliente : `${nomeCliente}  `;

    const customerData: CustomerData = {
      name: nomeFormatado,
      phone_number: this.formatarTelefoneEFI(cliente.telefone, titulo.id),
      juridical_person: {
        corporate_name: nomeFormatado,
        cnpj: cliente.cnpj.replace(/\D/g, ''),
      },
      address: {
        street: cliente.endereco,
        number: cliente.numero,
        neighborhood: cliente.bairro,
        zipcode: cliente.cep.replace(/\D/g, ''),
        city: cliente.cidade,
        complement: cliente.complemento,
        state: cliente.estado
      }
    };

    // Criar mensagem do boleto (máximo 4 linhas, 100 caracteres cada)
    const mensagem = `Cobrança referente ao serviço ${plano.nome_plano || 'Internet'} - Título ${titulo.numero_titulo}`;
    const mensagemFormatada = this.formatarMensagemEFI(mensagem);

    return {
      items: [{
        name: plano.nome_plano || 'Serviço de Internet',
        value: valorCentavos,
        amount: 1
      }],
      payment: {
        banking_billet: {
          customer: JSON.parse(JSON.stringify(customerData)) as JsonValue,
          expire_at: new Date(titulo.data_vencimento).toISOString().split('T')[0],
          configurations: {
            fine: fineBp,
            interest: interestBp
          },
          message: mensagemFormatada
        }
      },
      metadata: {
        custom_id: `titulo_${titulo.id}`
      }
    };
  }

  /**
   * Formatar telefone para EFI: formato ^[1-9]{2}9?[0-9]{8}$
   */
  private formatarTelefoneEFI(telefone: string, tituloId?: number): string {
    let numero = telefone.replace(/\D/g, '');

    if (numero.length > 11) {
      numero = numero.substring(numero.length - 11);
    }

    if (numero.length === 11) {
      const regex11 = /^[1-9]{1}[1-9]{1}9[0-9]{8}$/;
      if (regex11.test(numero)) {
        return numero;
      }

      const ddd = numero.substring(0, 2);
      const resto = numero.substring(2);

      if (resto.length === 9) {
        const primeiroDigito = resto.substring(0, 1);

        if (primeiroDigito === '9') {
          const numeroFormatado = resto.substring(1);
          numero = ddd + '9' + numeroFormatado;
        } else {
          numero = ddd + '9' + resto.substring(0, 8);
        }
      }
    }

    if (numero.length === 10) {
      const regex10 = /^[1-9]{1}[1-9]{1}[0-9]{8}$/;
      if (regex10.test(numero)) {
        return numero;
      }
    }

    if (numero.length < 10) {
      logger.warn('Telefone muito curto, usando formato genérico', {
        telefone_original: telefone,
        telefone_limpo: numero,
        titulo_id: tituloId
      });
      return '11999999999';
    }

    if (numero.length > 10) {
      numero = numero.substring(0, 2) + numero.substring(numero.length - 8);
    }

    return numero;
  }

  /**
   * Formatar mensagem para EFI (máximo 4 linhas, 100 caracteres cada)
   */
  private formatarMensagemEFI(mensagem: string): string {
    const maxCharsPorLinha = 100;
    const maxLinhas = 4;

    const texto = mensagem.replace(/\s+/g, ' ').trim();

    if (texto.length <= maxCharsPorLinha) {
      return texto;
    }

    const palavras = texto.split(' ');
    const linhas: string[] = [];
    let linhaAtual = '';

    for (const palavra of palavras) {
      const novaLinha = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;

      if (novaLinha.length <= maxCharsPorLinha) {
        linhaAtual = novaLinha;
      } else {
        if (linhaAtual) {
          linhas.push(linhaAtual);
          linhaAtual = palavra;
        } else {
          linhas.push(palavra.substring(0, maxCharsPorLinha));
          linhaAtual = palavra.substring(maxCharsPorLinha);
        }

        if (linhas.length >= maxLinhas - 1) {
          const linhaRestante = linhaAtual.length > maxCharsPorLinha 
            ? linhaAtual.substring(0, maxCharsPorLinha)
            : linhaAtual;
          linhas.push(linhaRestante);
          return linhas.join('\n');
        }
      }
    }

    if (linhaAtual && linhas.length < maxLinhas) {
      linhas.push(linhaAtual);
    }

    return linhas.join('\n');
  }

  /**
   * Cancelar título na Efi
   */
  async cancelarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
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

      const headers = this.buildAuthHeaders(token);

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
  async liquidarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
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

      const headers = this.buildAuthHeaders(token);
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
  async consultarStatus(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
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

      const headers = this.buildAuthHeaders(token);

      const response = await axios.get(endpoint, { headers, timeout: 30000 });

      const dados = response.data as Record<string, JsonValue>;
      const status = this.getNestedValue(dados, efiConfig.api_response_mapping.status.status);

      return {
        success: true,
        message: 'Status consultado com sucesso',
        status: typeof status === 'string' ? status : undefined
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

  /**
   * Construir headers de autenticação
   */
  private buildAuthHeaders(token: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Obter valor aninhado de um objeto usando notação de ponto
   */
  private getNestedValue(obj: Record<string, JsonValue>, path: string): JsonValue | undefined {
    return path.split('.').reduce<JsonValue | undefined>((current, key) => {
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        return (current as Record<string, JsonValue>)[key];
      }
      return undefined;
    }, obj as JsonValue);
  }
}
