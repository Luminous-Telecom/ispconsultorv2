import axios, { type AxiosResponse } from 'axios';
import { Banco } from '../models/Banco';
import { Titulo } from '../models/Titulo';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { logger } from '../utils/logger';
import { efiConfig } from '../config/bancos/efi';
import asaasConfig from '../config/bancos/asaas';
import type { JsonValue } from '../types';
import { AsaasService } from './bancos/AsaasService';
import { EfiService } from './bancos/EfiService';

export interface BancoConfig {
  nome: string;
  codigo: string;
  api_url: string;
  sandbox_url: string;
  cobranca_base_url: string;
  api_base_url: string;
  api_endpoints: {
    auth: string;
    boleto: string;
    consultar: string;
    cancelar: string;
    liquidar: string;
    listar_cobrancas: string;
    notification: string;
    webhook?: string;
  };
  api_response_mapping: {
    boleto: {
      id: string;
      url: string;
      barcode: string;
      linha_digitavel: string;
      pdf: string;
      pix_qrcode: string;
      pix_qrcode_image: string;
    };
    status: {
      status: string;
    };
  };
  auth_config: {
    grant_type: string;
    auth_type: string;
  };
  auth_type: 'basic' | 'bearer';
  client_id_field: string;
  client_secret_field: string;
  token: string;
  notification: string;
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

interface TituloWithRelations extends Titulo {
  banco?: Banco;
  cliente?: Cliente;
  plano?: Plano;
}

interface AuthData {
  [key: string]: string | null | undefined;
}

interface AxiosErrorResponse {
  code?: string;
  response?: {
    status?: number;
    statusText?: string;
    data?: JsonValue;
  };
}

export class BancoApiService {
  private static readonly BANCO_CONFIGS: Record<string, BancoConfig | Partial<BancoConfig>> = {
    efi: efiConfig,
    asaas: asaasConfig as Partial<BancoConfig>
  };

  private static asaasService = new AsaasService();
  private static efiService = new EfiService();

  /**
   * Obter configuração do banco
   */
  private static getBancoConfig(tipoBanco: string): BancoConfig | null {
    const config = this.BANCO_CONFIGS[tipoBanco];
    if (!config) {
      return null;
    }
    // Se é Partial, assumir que tem as propriedades mínimas necessárias
    return config as BancoConfig;
  }

  /**
   * Obter código do banco baseado no tipo
   */
  public static getCodigoBanco(tipoBanco: string): string | null {
    const config = this.getBancoConfig(tipoBanco);
    return config?.codigo || null;
  }

  /**
   * Verificar se as credenciais estão configuradas
   */
  private static verificarCredenciais(banco: Banco, _config: BancoConfig): boolean {
    if (banco.tipo_banco === 'asaas') {
      return !!banco.api_key;
    }

    return !!(banco.client_id_producao && banco.client_secret_producao);
  }

  /**
   * Testar autenticação com o banco
   */
  static async testarAutenticacao(banco: Banco): Promise<ApiResponse> {
    try {
      // Carregar configurações do banco
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      // Verificar credenciais
      if (!this.verificarCredenciais(banco, config)) {
        return {
          success: false,
          message: 'Credenciais do banco não configuradas'
        };
      }
      
      // Obter token para testar autenticação
      const token = await this.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      return {
        success: true,
        message: 'Autenticação realizada com sucesso'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Exceção ao testar autenticação', {
        banco: banco.tipo_banco,
        error: errorMessage
      });
      return {
        success: false,
        message: 'Erro ao testar autenticação: ' + errorMessage
      };
    }
  }

  /**
   * Obter token de acesso com retry para timeouts
   */
  private static async obterToken(banco: Banco, config: BancoConfig): Promise<string | null> {
    if (banco.tipo_banco === 'asaas') {
      // Tentar pegar api_key de várias formas
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

    const maxTentativas = 3;
    let delay = 2000; // 2 segundos inicial
    
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        // Usar URL correta baseada no ambiente (sandbox vs produção)
        const baseUrl = banco.sandbox 
          ? config.sandbox_url
          : config.cobranca_base_url;
        const endpoint = baseUrl + config.token;
        
        let authData: AuthData = {};
        
        if (config.auth_type === 'basic') {
          // Usar sempre as mesmas credenciais, independente de sandbox ou produção
          // A diferença entre sandbox e produção é apenas a URL
          authData = {
            [config.client_id_field]: banco.client_id_producao || null,
            [config.client_secret_field]: banco.client_secret_producao || null,
            grant_type: 'client_credentials'
          };
        }

        const response = await axios.post(endpoint, authData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 segundos de timeout
        });

        if (response.data && response.data.access_token) {
          if (tentativa > 1) {
            logger.info('Token obtido com sucesso após retry', {
              tentativa,
              banco_id: banco.id
            });
          }
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
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        const errorResponse = axiosError.response;
        
        if (tentativa < maxTentativas && isTimeout) {
          logger.warn(`Tentativa ${tentativa} falhou por timeout, tentando novamente em ${delay}ms`, {
            banco_id: banco.id,
            error: errorMessage,
            status: errorResponse?.status,
            tentativa
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }
        
        // Se for erro 401 (token expirado), logar como warn, caso contrário como error
        const isAuthError = errorResponse?.status === 401 || errorResponse?.status === 403;
        
        if (isAuthError) {
          logger.warn('Token expirado/inválido, será renovado na próxima requisição', {
            banco_id: banco.id,
            status: errorResponse?.status,
            statusText: errorResponse?.statusText,
            tentativa,
            isTimeout
          });
        } else {
          logger.error('Erro ao obter token', { 
            banco_id: banco.id,
            error: errorMessage,
            status: errorResponse?.status,
            statusText: errorResponse?.statusText,
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
   * Preparar headers para requisições
   */
  private static buildAuthHeaders(tipoBanco: string, token: string): Record<string, string> {
    if (tipoBanco === 'asaas') {
      return {
        'access_token': token,
        'Accept': 'application/json'
      };
    }
    
    return {
      'Authorization': `Bearer ${token}`
    };
  }


  /**
   * Obter valor aninhado de um objeto usando notação de ponto
   */
  private static getNestedValue(obj: Record<string, JsonValue>, path: string): JsonValue | undefined {
    return path.split('.').reduce<JsonValue | undefined>((current, key) => {
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        return (current as Record<string, JsonValue>)[key];
      }
      return undefined;
    }, obj as JsonValue);
  }

  /**
   * Gerar título/boleto via API do banco
   */
  static async gerarTitulo(titulo: TituloWithRelations): Promise<ApiResponse> {
    const banco = titulo.banco;
    const cliente = titulo.cliente;
    const plano = titulo.plano;
    
    if (!banco) {
      return {
        success: false,
        message: 'Banco não encontrado para o título'
      };
    }
    
    if (!cliente) {
      return {
        success: false,
        message: 'Cliente não encontrado para o título'
      };
    }
    
    try {
      // Carregar configurações do banco
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      logger.info('Registrando título via gateway bancário', {
        titulo_id: titulo.id,
        banco_id: banco.id,
        banco_tipo: banco.tipo_banco,
        banco_nome: banco.nome,
        cliente_id: cliente.id,
        contrato_id: titulo.contrato_id ?? null,
        plano_id: plano?.id ?? null,
        titulo_banco_id: titulo.banco_id
      });


      // Verificar se já foi gerado
      if (titulo.charge_id) {
        return {
          success: true,
          message: 'Título já foi gerado anteriormente',
          data: { charge_id: titulo.charge_id }
        };
      }

      // Recarregar banco com credenciais completas
      const bancoInstanceCredenciais = await Banco.findByPk(banco.id, {
        attributes: [
          'id',
          'nome',
          'tipo_banco',
          'api_key',
          'client_id_producao',
          'client_secret_producao',
          'sandbox',
          'url_retorno',
          'webhook_secret'
        ]
      });
      
      if (!bancoInstanceCredenciais) {
        return {
          success: false,
          message: 'Banco não encontrado'
        };
      }

      const bancoComCredenciais = bancoInstanceCredenciais.get({ plain: true }) as Banco & {
        webhook_secret?: string | null;
      };

      const isAsaas = banco.tipo_banco === 'asaas';

      // Verificar credenciais usando banco recarregado
      if (!this.verificarCredenciais(bancoComCredenciais as any, config)) {
        return {
          success: false,
          message: 'Credenciais do banco não configuradas'
        };
      }
      
      // Obter token usando banco recarregado
      const token = await this.obterToken(bancoComCredenciais as any, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      // Preparar dados do boleto
      if (!plano) {
        return {
          success: false,
          message: 'Plano não encontrado para o título'
        };
      }
      
      if (isAsaas) {
        return this.asaasService.gerarTitulo(titulo, bancoComCredenciais as any, token);
      }

      if (banco.tipo_banco === 'efi') {
        return this.efiService.gerarTitulo(titulo, bancoComCredenciais as any, token);
      }

      // Fallback para outros bancos (não deveria chegar aqui)
      return {
        success: false,
        message: 'Tipo de banco não suportado'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const axiosError = error as Error & AxiosErrorResponse;
      const errorResponse = axiosError.response;

      logger.error('Erro ao gerar título', {
        titulo_id: titulo.id,
        error: errorMessage,
        status: errorResponse?.status
      });

      return {
        success: false,
        message: 'Erro ao gerar título: ' + errorMessage
      };
    }
  }


  /**
   * Consultar status de um título
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

      const token = await this.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }
      
      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Charge ID não encontrado'
        };
      }
      
      // Usar URL correta baseada no ambiente (sandbox vs produção)
      const baseUrlCobranca = banco.sandbox 
        ? (config.sandbox_url || config.cobranca_base_url)
        : config.cobranca_base_url;
      
      const endpoint = baseUrlCobranca + config.api_endpoints.consultar.replace(':id', titulo.charge_id);
      
      logger.info('Consultando status do título', {
        endpoint,
        charge_id: titulo.charge_id,
        titulo_id: titulo.id,
        token_length: token ? token.length : 0
      });
      
      // Implementar retry para consulta de status
      const maxTentativas = 3;
      let delay = 2000;
      let response: AxiosResponse<Record<string, JsonValue>> | null = null;
      
      const headers = this.buildAuthHeaders(banco.tipo_banco, token);

      for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
          response = await axios.get(endpoint, {
            headers,
            timeout: 30000
          });
          break; // Sucesso, sair do loop
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
            throw error; // Re-throw se não é erro temporário ou é última tentativa
          }
        }
      }
      
      if (response?.status && response.status >= 200 && response.status < 300) {
        const dados = response.data;
        const status = this.getNestedValue(dados, config.api_response_mapping.status.status);
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
      logger.error('Erro ao consultar status', { 
        titulo_id: titulo.id,
        error: errorMessage 
      });
      return {
        success: false,
        message: "Erro ao consultar status: " + errorMessage
      };
    }
  }

  /**
   * Consultar notificação por token
   */
  static async consultarNotificacaoPorToken(banco: Banco, notificationToken: string): Promise<ApiResponse> {
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      const token = await this.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      if (banco.tipo_banco === 'asaas') {
        return {
          success: false,
          message: 'Consulta de notificação não suportada para Asaas'
        };
      }

      // Usar URL sandbox se estiver configurado
      const baseUrlCobranca = banco.sandbox 
        ? (config.sandbox_url || config.cobranca_base_url)
        : config.cobranca_base_url;
      
      const endpoint = baseUrlCobranca + config.notification + '/' + notificationToken;
      
      logger.info('Consultando notificação por token', {
        endpoint: endpoint,
        token: notificationToken
      });
      
      // Implementar retry para lidar com erros temporários (como no PHP)
      const maxTentativas = 3;
      let delay = 1000; // 1 segundo
      let response: AxiosResponse<Record<string, JsonValue>> | null = null;
      
      const headers = this.buildAuthHeaders(banco.tipo_banco, token);

      for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
          response = await axios.get(endpoint, {
            headers,
            timeout: 30000
          });
          
          if (response?.status && response.status >= 200 && response.status < 300) {
            break; // Sucesso, sair do loop
          }
        } catch (error) {
          const axiosError = error as Error & AxiosErrorResponse;
          const errorResponse = axiosError.response;
          // Se não é a última tentativa e é erro temporário (502, 503, 504), tentar novamente
          if (tentativa < maxTentativas && 
              errorResponse?.status && 
              [502, 503, 504].includes(errorResponse.status)) {
            
            logger.warn(`Tentativa ${tentativa} falhou, tentando novamente em ${delay}ms`, {
              status: errorResponse.status,
              endpoint: endpoint
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            continue;
          } else {
            throw error; // Re-throw se não é erro temporário ou é última tentativa
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
          data: response.data as ApiResponseData
        };
      }
      
      return {
        success: false,
        message: 'Erro ao consultar notificação'
      };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        const axiosError = error as Error & AxiosErrorResponse;
        const errorResponse = axiosError.response;
        
        // Se é erro de token inválido/expirado, logar como warning em vez de error
        const errorData = errorResponse?.data;
        const errorCode = errorData && typeof errorData === 'object' && !Array.isArray(errorData) && 'code' in errorData 
          ? (errorData as { code?: number }).code 
          : undefined;
        if (errorCode === 3500010 || errorResponse?.status === 500) {
          logger.warn('Token de notificação inválido ou expirado', {
            banco_id: banco.id,
            token: notificationToken,
            status: errorResponse?.status
          });
        } else {
          logger.error('Erro ao consultar notificação por token', {
            banco_id: banco.id,
            token: notificationToken,
            error: errorMessage,
            status: errorResponse?.status,
            statusText: errorResponse?.statusText,
            data: errorResponse?.data
          });
        }
      
      // Se o erro for 3500010 (propriedade não existe), o token pode ter expirado
      if (errorCode === 3500010) {
        return {
          success: false,
          message: 'Token de notificação não encontrado ou expirado'
        };
      }
      
      return {
        success: false,
        message: "Erro ao consultar notificação: " + errorMessage
      };
    }
  }





  /**
   * Cancelar título individual
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

      const token = await this.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      const baseUrlCobranca = banco.sandbox 
        ? (config.sandbox_url || config.cobranca_base_url)
        : config.cobranca_base_url;
      
      let endpoint = baseUrlCobranca + config.api_endpoints.cancelar.replace(':id', titulo.charge_id);
      if (banco.tipo_banco === 'efi') {
        endpoint = `${endpoint}/cancel`;
      }

      logger.info('Enviando requisição para cancelar título individual', {
        endpoint,
        charge_id: titulo.charge_id,
        titulo_id: titulo.id
      });

      if (banco.tipo_banco === 'asaas') {
        return this.asaasService.cancelarTitulo(titulo, banco, token);
      }

      const headers = this.buildAuthHeaders(banco.tipo_banco, token);

      // Implementar retry para cancelamento de título (EFI)
      const maxTentativas = 3;
      let delay = 2000;
      let response: AxiosResponse<Record<string, JsonValue>> | null = null;
      
      for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
          response = await axios.put(endpoint, {}, {
            headers,
            timeout: 30000
          });
          break; // Sucesso, sair do loop
        } catch (error) {
          const axiosError = error as Error & AxiosErrorResponse;
          const errorResponse = axiosError.response;
          const isTimeout = axiosError.code === 'ECONNABORTED' || 
                           errorResponse?.status === 504 || 
                           errorResponse?.status === 502 || 
                           errorResponse?.status === 503;
          
          if (tentativa < maxTentativas && isTimeout) {
            logger.warn(`Tentativa ${tentativa} falhou por timeout no cancelamento, tentando novamente em ${delay}ms`, {
              titulo_id: titulo.id,
              status: errorResponse?.status,
              tentativa
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          } else {
            throw error; // Re-throw se não é erro temporário ou é última tentativa
          }
        }
      }

      if (!response) {
        return {
          success: false,
          message: 'Nenhuma resposta recebida do servidor'
        };
      }

      logger.info('Resposta do cancelamento de título individual', {
        endpoint,
        status: response.status,
        data: response.data
      });

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          message: 'Título cancelado com sucesso'
        };
      }

      return {
        success: false,
        message: 'Erro ao cancelar título: ' + response.status
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao cancelar título individual', {
        titulo_id: titulo.id,
        charge_id: titulo.charge_id,
        error: errorMessage
      });
      return {
        success: false,
        message: "Erro ao cancelar título: " + errorMessage
      };
    }
  }






  /**
   * Liquidar título individual no banco externo
   */
  static async liquidarTitulo(titulo: TituloWithRelations): Promise<ApiResponse> {
    try {
      const banco = titulo.banco;
      if (!banco) {
        return {
          success: false,
          message: 'Banco não encontrado para o título'
        };
      }

      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      // Obter token
      const token = await this.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      logger.info('Liquidando título no banco', {
        titulo_id: titulo.id,
        charge_id: titulo.charge_id
      });

      // Fazer requisição para liquidar título
      const baseUrlCobranca = banco.sandbox 
        ? config.sandbox_url
        : config.cobranca_base_url;
      const chargeIdStr = titulo.charge_id || '';
      const endpoint = baseUrlCobranca + config.api_endpoints.liquidar
        .replace(':id', chargeIdStr);

      if (banco.tipo_banco === 'asaas') {
        return this.asaasService.liquidarTitulo(titulo, banco, token);
      }

      const headers = this.buildAuthHeaders(banco.tipo_banco, token);
      headers['Content-Type'] = 'application/json';

      const dadosLiquidacao = {
        settle: true
      };

      const response = await axios.put(endpoint, dadosLiquidacao, {
        headers,
        timeout: 30000
      });

      if (response.status === 200) {
        logger.info('Título liquidado com sucesso', {
          titulo_id: titulo.id,
          charge_id: titulo.charge_id
        });

        return {
          success: true,
          message: 'Título liquidado com sucesso',
          data: response.data
        };
      }

      return {
        success: false,
        message: 'Falha ao liquidar título no banco'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao liquidar título', {
        titulo_id: titulo.id,
        error: errorMessage
      });

      return {
        success: false,
        message: 'Erro ao liquidar título: ' + errorMessage
      };
    }
  }

}
