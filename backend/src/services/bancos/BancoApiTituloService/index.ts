import axios, { type AxiosResponse } from 'axios';
import type { cadastros_bancos, financeiro_titulos } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import type { JsonValue } from '../../../types/index';
import { BancoApiAuthService } from '../BancoApiAuthService';
import { BancoApiRequestService } from '../BancoApiRequestService';
import { AsaasService } from '../AsaasService';
import { EfiService } from '../EfiService';
import { efiConfig } from '../../../config/bancos/efi';
import asaasConfig from '../../../config/bancos/asaas';

type Banco = cadastros_bancos;
type Titulo = financeiro_titulos;

interface TituloWithRelations extends Titulo {
  banco?: Banco;
}

interface ApiResponseData {
  charge_id?: string;
  [key: string]: JsonValue | undefined;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: ApiResponseData;
  status?: string;
}

interface AxiosErrorResponse {
  code?: string;
  response?: {
    status?: number;
    statusText?: string;
    data?: JsonValue;
  };
}

export class BancoApiTituloService {
  private static asaasService = new AsaasService();
  private static efiService = new EfiService();

  private static readonly BANCO_CREDENCIAIS_ATTRS = [
    'id',
    'nome',
    'tipo_banco',
    'api_key',
    'client_id_producao',
    'client_secret_producao',
    'identificador_conta',
    'sandbox',
    'url_retorno',
    'webhook_secret'
  ] as const;

  private static hasCredenciaisCarregadas(banco: Banco): boolean {
    const bancoLike = banco as Banco & {
      api_key?: string | null;
      client_id_producao?: string | null;
      client_secret_producao?: string | null;
    };

    if (banco.tipo_banco === 'asaas') {
      return !!bancoLike.api_key?.trim();
    }

    if (banco.tipo_banco === 'efi') {
      return !!(bancoLike.client_id_producao?.trim() && bancoLike.client_secret_producao?.trim());
    }

    return false;
  }

  private static async reloadBancoCredenciais(banco: Banco): Promise<Banco | null> {
    if (this.hasCredenciaisCarregadas(banco)) {
      return banco;
    }

    const instance = await prisma.cadastros_bancos.findUnique({
      where: { id: banco.id },
      select: {
        id: true,
        nome: true,
        tipo_banco: true,
        api_key: true,
        client_id_producao: true,
        client_secret_producao: true,
        sandbox: true,
        url_retorno: true,
        webhook_secret: true,
        percentual_multa: true,
        percentual_juros: true,
        desconto_tipo: true,
        desconto_valor: true,
      },
    });

    if (!instance) return null;
    return { ...banco, ...instance };
  }

  private static async obterToken(banco: Banco, config: typeof efiConfig | typeof asaasConfig): Promise<string | null> {
    if (banco.tipo_banco === 'asaas') {
      return this.asaasService.obterToken(banco);
    }

    if (banco.tipo_banco === 'efi') {
      return this.efiService.obterToken(banco);
    }

    return BancoApiAuthService.obterToken(banco, config);
  }

  /**
   * Consulta status do título
   */
  static async consultarStatus(titulo: TituloWithRelations): Promise<ApiResponse> {
    const banco = titulo.banco;
    
    if (!banco) {
      return {
        success: false,
        message: 'Banco não encontrado para o título'
      };
    }
    
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Charge ID não encontrado'
        };
      }

      const bancoComCredenciais = await this.reloadBancoCredenciais(banco);
      if (!bancoComCredenciais) {
        return {
          success: false,
          message: 'Banco não encontrado'
        };
      }

      const token = await this.obterToken(bancoComCredenciais, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      // Delegar para serviço específico do banco
      if (bancoComCredenciais.tipo_banco === 'asaas') {
        return await this.asaasService.consultarStatus(titulo as unknown as Titulo, bancoComCredenciais, token);
      }

      if (bancoComCredenciais.tipo_banco === 'efi') {
        return await this.efiService.consultarStatus(titulo as unknown as Titulo, bancoComCredenciais, token);
      }

      // Implementação genérica para outros bancos
      const baseUrlCobranca = banco.sandbox 
        ? (config.sandbox_url || config.cobranca_base_url)
        : config.cobranca_base_url;
      
      const endpoint = `${baseUrlCobranca}${config.api_endpoints.consultar.replace(':id', titulo.charge_id)}`;

      logger.info('Consultando status do título', {
        endpoint,
        charge_id: titulo.charge_id,
        titulo_id: titulo.id
      });

      const headers = BancoApiRequestService.buildRequestHeaders(banco.tipo_banco, token, config);

      // Implementar retry para consulta de status
      const maxTentativas = 3;
      let delay = 2000;
      let response: AxiosResponse<Record<string, JsonValue>> | null = null;

      for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
          response = await axios.get(endpoint, {
            headers,
            timeout: 30000
          });
          break;
        } catch (error) {
          const axiosError = error as Error & AxiosErrorResponse;
          const errorResponse = axiosError.response;
          const isTimeout = axiosError.code === 'ECONNABORTED' || 
                           errorResponse?.status === 504 || 
                           errorResponse?.status === 502 || 
                           errorResponse?.status === 503;
          
          if (tentativa < maxTentativas && isTimeout) {
            logger.warn(`Tentativa ${tentativa} falhou por timeout na consulta de status, tentando novamente em ${delay}ms`, {
              titulo_id: titulo.id,
              status: errorResponse?.status,
              tentativa
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          } else {
            throw error;
          }
        }
      }
      
      if (response?.status && response.status >= 200 && response.status < 300) {
        const dados = response.data;
        const status = BancoApiRequestService.getNestedValue(dados, config.api_response_mapping.status.status);
        const statusNorm = typeof status === 'string' ? status.toLowerCase() : null;
        
        const responseData: ApiResponseData = {};
        if (dados && typeof dados === 'object' && !Array.isArray(dados)) {
          Object.assign(responseData, dados);
        }
        
        return {
          success: true,
          status: statusNorm || undefined,
          data: responseData
        };
      }

      return {
        success: false,
        message: 'Erro ao consultar status'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao consultar status do título', {
        titulo_id: titulo.id,
        banco_id: banco.id,
        error: errorMessage
      });

      return {
        success: false,
        message: 'Erro ao consultar status: ' + errorMessage
      };
    }
  }

  /**
   * Cancela título
   */
  static async cancelarTitulo(titulo: TituloWithRelations): Promise<ApiResponse> {
    const banco = titulo.banco;
    
    if (!banco) {
      return {
        success: false,
        message: 'Banco não encontrado para o título'
      };
    }
    
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Charge ID não encontrado'
        };
      }

      const bancoComCredenciais = await this.reloadBancoCredenciais(banco);
      if (!bancoComCredenciais) {
        return {
          success: false,
          message: 'Banco não encontrado'
        };
      }

      const token = await this.obterToken(bancoComCredenciais, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      // Delegar para serviço específico do banco
      if (bancoComCredenciais.tipo_banco === 'asaas') {
        return await this.asaasService.cancelarTitulo(titulo as unknown as Titulo, bancoComCredenciais, token);
      }

      if (bancoComCredenciais.tipo_banco === 'efi') {
        return await this.efiService.cancelarTitulo(titulo as unknown as Titulo, bancoComCredenciais, token);
      }

      const baseUrlCobranca = banco.sandbox 
        ? (config.sandbox_url || config.cobranca_base_url)
        : config.cobranca_base_url;
      
      let endpoint = `${baseUrlCobranca}${config.api_endpoints.cancelar.replace(':id', titulo.charge_id)}`;
      if (banco.tipo_banco === 'efi') {
        endpoint = `${endpoint}/cancel`;
      }

      logger.info('Enviando requisição para cancelar título', {
        endpoint,
        charge_id: titulo.charge_id,
        titulo_id: titulo.id
      });

      const headers = BancoApiRequestService.buildRequestHeaders(banco.tipo_banco, token, config);

      // Implementar retry para cancelamento (EFI)
      const maxTentativas = 3;
      let delay = 2000;
      let response: AxiosResponse<Record<string, JsonValue>> | null = null;
      
      for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
          response = await axios.put(endpoint, {}, {
            headers,
            timeout: 30000
          });
          
          if (response?.status && response.status >= 200 && response.status < 300) {
            break;
          }
        } catch (error) {
          const axiosError = error as Error & AxiosErrorResponse;
          const errorResponse = axiosError.response;
          
          if (tentativa < maxTentativas && 
              errorResponse?.status && 
              [502, 503, 504].includes(errorResponse.status)) {
            
            logger.warn(`Tentativa ${tentativa} falhou, tentando novamente em ${delay}ms`, {
              status: errorResponse.status,
              endpoint
            });
            
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

      logger.error('Erro ao cancelar título', {
        titulo_id: titulo.id,
        banco_id: banco.id,
        error: errorMessage,
        status: errorResponse?.status
      });

      return {
        success: false,
        message: 'Erro ao cancelar título: ' + errorMessage
      };
    }
  }

  /**
   * Liquida título
   */
  static async liquidarTitulo(titulo: TituloWithRelations): Promise<ApiResponse> {
    const banco = titulo.banco;
    
    if (!banco) {
      return {
        success: false,
        message: 'Banco não encontrado para o título'
      };
    }
    
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Charge ID não encontrado'
        };
      }

      const bancoComCredenciais = await this.reloadBancoCredenciais(banco);
      if (!bancoComCredenciais) {
        return {
          success: false,
          message: 'Banco não encontrado'
        };
      }

      const token = await this.obterToken(bancoComCredenciais, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      // Delegar para serviço específico do banco
      if (bancoComCredenciais.tipo_banco === 'asaas') {
        return await this.asaasService.liquidarTitulo(titulo as unknown as Titulo, bancoComCredenciais, token);
      }

      if (bancoComCredenciais.tipo_banco === 'efi') {
        return await this.efiService.liquidarTitulo(titulo as unknown as Titulo, bancoComCredenciais, token);
      }

      const baseUrlCobranca = banco.sandbox 
        ? (config.sandbox_url || config.cobranca_base_url)
        : config.cobranca_base_url;
      
      const endpoint = `${baseUrlCobranca}${config.api_endpoints.liquidar.replace(':id', titulo.charge_id)}`;

      logger.info('Liquidando título no banco', {
        titulo_id: titulo.id,
        charge_id: titulo.charge_id
      });

      const headers = BancoApiRequestService.buildRequestHeaders(banco.tipo_banco, token, config);

      const payload = {
        paymentDate: new Date().toISOString().split('T')[0],
        value: Number(titulo.valor),
        notifyCustomer: false
      };

      const response = await axios.post(endpoint, payload, { headers, timeout: 30000 });

      if (response.status >= 200 && response.status < 300) {
        logger.info('Título liquidado com sucesso', {
          titulo_id: titulo.id,
          charge_id: titulo.charge_id
        });

        return {
          success: true,
          message: 'Título liquidado com sucesso',
          data: response.data as ApiResponseData
        };
      }

      return {
        success: false,
        message: `Erro ao liquidar título: ${response.status}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const axiosError = error as Error & AxiosErrorResponse;
      const errorResponse = axiosError.response;

      logger.error('Erro ao liquidar título', {
        titulo_id: titulo.id,
        banco_id: banco.id,
        error: errorMessage,
        status: errorResponse?.status
      });

      return {
        success: false,
        message: 'Erro ao liquidar título: ' + errorMessage
      };
    }
  }

  /**
   * Obtém configuração do banco
   */
  private static getBancoConfig(tipoBanco: string): typeof efiConfig | typeof asaasConfig | null {
    if (tipoBanco === 'efi') {
      return efiConfig;
    }
    if (tipoBanco === 'asaas') {
      return asaasConfig;
    }
    return null;
  }
}
