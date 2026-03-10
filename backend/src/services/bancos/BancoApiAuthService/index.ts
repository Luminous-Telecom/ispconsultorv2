import axios from 'axios';
import { Banco } from '../../../models/cadastros/Banco';
import { logger } from '../../../utils/logger';
import type { BancoConfig } from '../BancoApiService';
import type { JsonValue } from '../../../types/index';

export class BancoApiAuthService {
  private static tokenCache: Map<number, { token: string; expiresAt: number }> = new Map();
  private static readonly TOKEN_CACHE_TTL = 50 * 60 * 1000; // 50 minutos

  /**
   * Obtém token de autenticação do banco
   */
  static async obterToken(banco: Banco, config: BancoConfig): Promise<string | null> {
    // Asaas não usa OAuth, retorna API key diretamente
    if (banco.tipo_banco === 'asaas') {
      let apiKey = banco.api_key;

      // Banco pode vir como instância do Sequelize Model ou como objeto simples
      interface BancoModelLike {
        dataValues?: { api_key?: string | null };
        getDataValue?: (key: string) => string | null;
      }
      const bancoModel = banco as BancoModelLike;

      if (!apiKey && bancoModel.dataValues) {
        apiKey = bancoModel.dataValues.api_key || null;
      }

      if (!apiKey && typeof bancoModel.getDataValue === 'function') {
        const value = bancoModel.getDataValue('api_key');
        apiKey = value || null;
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

    // Para outros bancos (EFI, etc), usa OAuth
    const cacheKey = banco.id;
    const cached = this.tokenCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    try {
      const authData = this.buildAuthData(banco, config);
      const authUrl = this.getAuthUrl(banco, config);
      const authHeaders = this.buildAuthHeaders(banco.tipo_banco, config);

      logger.info('Obtendo token de autenticação', {
        banco_id: banco.id,
        banco_tipo: banco.tipo_banco,
        auth_url: authUrl,
        sandbox: banco.sandbox
      });

      const response = await axios.post(authUrl, authData, { headers: authHeaders });

      const token = this.extractToken(response.data, banco.tipo_banco);
      
      if (token) {
        const expiresAt = Date.now() + this.TOKEN_CACHE_TTL;
        this.tokenCache.set(cacheKey, { token, expiresAt });
        return token;
      }

      logger.error('Token não encontrado na resposta de autenticação', {
        banco_id: banco.id,
        response_data: response.data
      });
      return null;
    } catch (error: unknown) {
      logger.error('Erro ao obter token de autenticação', {
        banco_id: banco.id,
        banco_tipo: banco.tipo_banco,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    }
  }

  /**
   * Limpa cache de tokens
   */
  static clearTokenCache(bancoId?: number): void {
    if (bancoId) {
      this.tokenCache.delete(bancoId);
    } else {
      this.tokenCache.clear();
    }
  }

  /**
   * Constrói dados de autenticação
   */
  private static buildAuthData(banco: Banco, config: BancoConfig): Record<string, string | null> {
    const authData: Record<string, string | null> = {};

    if (banco.tipo_banco === 'efi') {
      const bancoLike = banco as Banco & { client_id_producao?: string | null; client_secret_producao?: string | null; identificador_conta?: string | null };
      authData.grant_type = 'client_credentials';
      authData[config.client_id_field] = bancoLike.client_id_producao || null;
      authData[config.client_secret_field] = bancoLike.client_secret_producao || null;
      const identificadorConta = bancoLike.identificador_conta?.trim();
      if (identificadorConta) {
        authData.identificador_conta = identificadorConta;
      }
    } else if (banco.tipo_banco === 'asaas') {
      // Asaas não usa autenticação OAuth, usa API key diretamente
      return {};
    }

    return authData;
  }

  /**
   * Obtém URL de autenticação
   */
  private static getAuthUrl(banco: Banco, config: BancoConfig): string {
    const baseUrl = banco.sandbox ? config.sandbox_url : config.api_url;
    return `${baseUrl}${config.api_endpoints.auth}`;
  }

  /**
   * Constrói headers de autenticação
   */
  private static buildAuthHeaders(_tipoBanco: string, _config: BancoConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Extrai token da resposta
   */
  private static extractToken(responseData: any, tipoBanco: string): string | null {
    if (tipoBanco === 'efi') {
      return responseData?.access_token || null;
    }
    return null;
  }
}
