import axios, { type AxiosResponse } from 'axios';
import { Banco } from '../../../models/cadastros/Banco';
import { Titulo } from '../../../models/financeiro/Titulo';
import type { InferAttributes } from 'sequelize';
import { logger } from '../../../utils/logger';
import type { JsonValue } from '../../../types/index';
import { BancoApiAuthService } from '../BancoApiAuthService';
import { BancoApiRequestService } from '../BancoApiRequestService';
import { AsaasService } from '../AsaasService';
import { EfiService } from '../EfiService';
import { efiConfig } from '../../../config/bancos/efi';
import asaasConfig from '../../../config/bancos/asaas';

interface TituloWithRelations extends InferAttributes<Titulo> {
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

      const token = await BancoApiAuthService.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      // Delegar para serviço específico do banco
      if (banco.tipo_banco === 'asaas') {
        return await this.asaasService.consultarStatus(titulo as unknown as Titulo, banco, token);
      }

      if (banco.tipo_banco === 'efi') {
        return await this.efiService.consultarStatus(titulo as unknown as Titulo, banco, token);
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

      const token = await BancoApiAuthService.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      // Delegar para serviço específico do banco
      if (banco.tipo_banco === 'asaas') {
        return await this.asaasService.cancelarTitulo(titulo as unknown as Titulo, banco, token);
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

      const token = await BancoApiAuthService.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      // Delegar para serviço específico do banco
      if (banco.tipo_banco === 'asaas') {
        return await this.asaasService.liquidarTitulo(titulo as unknown as Titulo, banco, token);
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

      // Para EFI, usar settle: true, para outros bancos usar payload padrão
      const payload = banco.tipo_banco === 'efi'
        ? { settle: true }
        : {
            paymentDate: new Date().toISOString().split('T')[0],
            value: Number(titulo.valor),
            notifyCustomer: false
          };

      const method = banco.tipo_banco === 'efi' ? 'put' : 'post';
      const response = await axios[method](endpoint, payload, { headers, timeout: 30000 });

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
