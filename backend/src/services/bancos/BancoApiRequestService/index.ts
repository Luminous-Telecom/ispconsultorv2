import axios, { type AxiosResponse } from 'axios';
import { Banco } from '../../../models/cadastros/Banco';
import { logger } from '../../../utils/logger';
import type { BancoConfig } from '../BancoApiService';
import type { JsonValue } from '../../../types/index';
import { BancoApiAuthService } from '../BancoApiAuthService';

export class BancoApiRequestService {
  /**
   * Constrói headers para requisições
   */
  static buildRequestHeaders(tipoBanco: string, token: string, config: BancoConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.auth_type === 'bearer') {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (config.auth_type === 'basic') {
      const clientId = config.client_id_field;
      const clientSecret = config.client_secret_field;
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    if (tipoBanco === 'asaas') {
      headers['access_token'] = token;
    }

    return headers;
  }

  /**
   * Obtém valor aninhado de objeto
   */
  static getNestedValue(obj: Record<string, JsonValue>, path: string): JsonValue | undefined {
    const keys = path.split('.');
    let value: JsonValue = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        value = (value as Record<string, JsonValue>)[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Faz requisição HTTP para API do banco
   */
  static async makeRequest(
    banco: Banco,
    config: BancoConfig,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
    data?: Record<string, JsonValue>
  ): Promise<AxiosResponse> {
    const token = await BancoApiAuthService.obterToken(banco, config);
    if (!token) {
      throw new Error('Não foi possível obter token de autenticação');
    }

    const baseUrl = banco.sandbox ? config.sandbox_url : config.api_url;
    const url = `${baseUrl}${endpoint}`;
    const headers = this.buildRequestHeaders(banco.tipo_banco, token, config);

    logger.info('Fazendo requisição para API do banco', {
      banco_id: banco.id,
      banco_tipo: banco.tipo_banco,
      url,
      method
    });

    return await axios({
      method,
      url,
      headers,
      data
    });
  }

  /**
   * Mapeia resposta da API para formato padrão
   */
  static mapApiResponse(
    responseData: any,
    config: BancoConfig,
    tipoOperacao: 'boleto' | 'status'
  ): Record<string, JsonValue> {
    const mapping = config.api_response_mapping[tipoOperacao];
    const mapped: Record<string, JsonValue> = {};

    for (const [key, path] of Object.entries(mapping)) {
      const value = this.getNestedValue(responseData, path);
      if (value !== undefined) {
        mapped[key] = value;
      }
    }

    return mapped;
  }
}
