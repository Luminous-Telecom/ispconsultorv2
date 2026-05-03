import axios, { type AxiosResponse } from 'axios';
import { Banco } from '../../../models/cadastros/Banco';
import { Titulo } from '../../../models/financeiro/Titulo';
import type { InferAttributes } from 'sequelize';
import { Cliente } from '../../../models/clientes/Cliente';
import { Plano } from '../../../models/cadastros/Plano';
import { logger } from '../../../utils/logger';
import { efiConfig } from '../../../config/bancos/efi';
import asaasConfig from '../../../config/bancos/asaas';
import type { JsonValue } from '../../../types/index';
import { AsaasService } from '../AsaasService';
import { EfiService } from '../EfiService';
import { BancoApiAuthService } from '../BancoApiAuthService';
import { BancoApiRequestService } from '../BancoApiRequestService';
import { BancoApiTituloService } from '../BancoApiTituloService';

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

interface TituloWithRelations extends InferAttributes<Titulo> {
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

/**
 * Serviço responsável por integrar o sistema com APIs de bancos
 * Suporta múltiplos bancos (Efi/Gerencianet, Asaas, etc.) através de abstração
 * 
 * @class BancoApiService
 * 
 * @remarks
 * - Gerencia autenticação e tokens de acesso
 * - Abstrai diferenças entre APIs de diferentes bancos
 * - Suporta operações: criar boleto, consultar status, cancelar, liquidar
 * - Cache de tokens para reduzir chamadas de autenticação
 * 
 * @example
 * ```typescript
 * const banco = await Banco.findByPk(1);
 * const titulo = await Titulo.findByPk(1);
 * 
 * // Criar boleto no banco
 * const result = await BancoApiService.criarBoleto(banco, titulo);
 * ```
 */
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
   * Obter token de acesso (delegado para services específicos ou BancoApiAuthService)
   */
  private static async obterToken(banco: Banco, config: BancoConfig): Promise<string | null> {
    if (banco.tipo_banco === 'asaas') {
      return await this.asaasService.obterToken(banco);
    }
    if (banco.tipo_banco === 'efi') {
      return await this.efiService.obterToken(banco);
    }
    return await BancoApiAuthService.obterToken(banco, config);
  }

  /**
   * Preparar headers para requisições (delegado para BancoApiRequestService)
   */
  private static buildAuthHeaders(tipoBanco: string, token: string): Record<string, string> {
    return BancoApiRequestService.buildRequestHeaders(tipoBanco, token, this.getBancoConfig(tipoBanco)!);
  }

  /**
   * Obter valor aninhado de um objeto usando notação de ponto (delegado para BancoApiRequestService)
   */
  private static getNestedValue(obj: Record<string, JsonValue>, path: string): JsonValue | undefined {
    return BancoApiRequestService.getNestedValue(obj, path);
  }

  /**
   * Gerar título/boleto via API do banco.
   * @param titulo - Título com banco, cliente e plano
   * @param options - Se bancoTable='saas_saas_bancos', usa SaasBanco para credenciais (SaaS)
   */
  static async gerarTitulo(
    titulo: TituloWithRelations,
    options?: { bancoTable?: 'bancos' | 'saas_saas_bancos' }
  ): Promise<ApiResponse> {
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

      // Recarregar banco com credenciais completas (Banco ERP ou SaasBanco)
      const attrs = [
        'id',
        'nome',
        'tipo_banco',
        'api_key',
        'client_id_producao',
        'client_secret_producao',
        'sandbox',
        'url_retorno',
        'webhook_secret'
      ];
      const bancoInstanceCredenciais =
        options?.bancoTable === 'saas_saas_bancos'
          ? await (await import('../../../models/saas/SaasBanco')).SaasBanco.findByPk(banco.id, { attributes: attrs })
          : await Banco.findByPk(banco.id, { attributes: attrs });

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

      // Tipo para banco que pode ser instância do Model ou objeto plano
      // Isso é necessário porque Sequelize pode retornar tanto Model quanto objeto simples
      type BancoLike = Banco | (Banco & { webhook_secret?: string | null });
      
      // Verificar credenciais usando banco recarregado
      if (!this.verificarCredenciais(bancoComCredenciais as BancoLike, config)) {
        return {
          success: false,
          message: 'Credenciais do banco não configuradas'
        };
      }
      
      // Obter token usando banco recarregado
      const token = await this.obterToken(bancoComCredenciais as BancoLike, config);
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
      
      const tituloParaGeracao = options?.bancoTable === 'saas_saas_bancos'
        ? { ...titulo, __skipTituloUpdate: true }
        : titulo;

      if (isAsaas) {
        return this.asaasService.gerarTitulo(tituloParaGeracao, bancoComCredenciais as BancoLike, token);
      }

      if (banco.tipo_banco === 'efi') {
        return this.efiService.gerarTitulo(tituloParaGeracao, bancoComCredenciais as BancoLike, token);
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
    return await BancoApiTituloService.consultarStatus(titulo);
  }

  /**
   * Consultar status de um título (método antigo - delegado)
   */
  private static async consultarStatus_OLD(titulo: TituloWithRelations): Promise<ApiResponse> {
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
   * @param source - 'admin' ou 'saas' para fins de log
   */
  static async consultarNotificacaoPorToken(
    banco: Banco,
    notificationToken: string,
    source?: 'admin' | 'saas'
  ): Promise<ApiResponse> {
    const logCtx = {
      banco_id: banco.id,
      banco_nome: banco.nome,
      origem: source || 'admin',
      sandbox: banco.sandbox
    };

    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        logger.warn('Configurações do banco não encontradas', logCtx);
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      const token = await this.obterToken(banco, config);
      if (!token) {
        logger.warn('Falha ao obter token OAuth (verifique client_id e client_secret)', logCtx);
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
      const bancoWithIdentificador = banco as Banco & { identificador_conta?: string | null };
      const identificadorConta = bancoWithIdentificador.identificador_conta?.trim();

      logger.info('Chamando API EFI para consultar notificação', {
        ...logCtx,
        endpoint,
        ambiente: banco.sandbox ? 'sandbox' : 'producao',
        tem_identificador_conta: !!identificadorConta
      });

      const headers = this.buildAuthHeaders(banco.tipo_banco, token);
      if (identificadorConta) {
        headers['X-Identificador-Conta'] = identificadorConta;
      }

      // Implementar retry para lidar com erros temporários (como no PHP)
      const maxTentativas = 3;
      let delay = 1000; // 1 segundo
      let response: AxiosResponse<Record<string, JsonValue>> | null = null;

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
        
        // 401/500/3500010: esperado ao tentar vários bancos (token de outra conta ou expirado) — logar como warn
        const errorData = errorResponse?.data;
        const errorCode = errorData && typeof errorData === 'object' && !Array.isArray(errorData) && 'code' in errorData 
          ? (errorData as { code?: number }).code 
          : undefined;
        const status = errorResponse?.status;
        const isExpectedFailure = errorCode === 3500010 || status === 500 || status === 401;
        const bancoWithCreds = banco as { client_id_producao?: string | null; client_secret_producao?: string | null };
        const errorDetail = {
          ...logCtx,
          status,
          statusText: errorResponse?.statusText,
          response_data: errorResponse?.data,
          has_client_id: !!(bancoWithCreds.client_id_producao?.trim?.()),
          has_client_secret: !!(bancoWithCreds.client_secret_producao?.trim?.()),
          hint: status === 401
            ? '401 = credenciais inválidas ou token de outra conta EFI. Verifique client_id, client_secret e ambiente (sandbox/produção).'
            : undefined
        };
        if (isExpectedFailure) {
          logger.warn('Token de notificação não encontrado neste banco', errorDetail);
        } else {
          logger.error('Erro ao consultar notificação por token', {
            ...errorDetail,
            token: notificationToken.substring(0, 20) + '...',
            error: errorMessage
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
    return await BancoApiTituloService.cancelarTitulo(titulo);
  }

  /**
   * Cancelar título individual (método antigo - delegado)
   */
  private static async cancelarTitulo_OLD(titulo: TituloWithRelations): Promise<ApiResponse> {
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
        return (this.asaasService as any).cancelarTitulo(titulo as unknown as Titulo, banco, token);
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
    return await BancoApiTituloService.liquidarTitulo(titulo);
  }

  /**
   * Liquidar título individual (método antigo - delegado)
   */
  private static async liquidarTitulo_OLD(titulo: TituloWithRelations): Promise<ApiResponse> {
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
        return (this.asaasService as any).liquidarTitulo(titulo as unknown as Titulo, banco, token);
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
