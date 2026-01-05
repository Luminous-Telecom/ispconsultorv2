import { apiService } from './api';
import type { ApiResponse } from '../types';

export interface NFSeConfig {
  id: number;
  codigo_servico_municipal: string | null;
  aliquota_iss: number;
  descricao_servico: string | null;
  serie_nf: string | null;
  numero_dps: number | null;
  portal_nacional_username: string | null;
  portal_nacional_password: string | null;
  portal_nacional_base_url: string | null;
  portal_nacional_ambiente: 'HOMOLOGACAO' | 'PRODUCAO';
  asaas_api_key: string | null;
  asaas_sandbox: boolean;
  provider: 'PORTAL_NACIONAL' | 'ASAAS';
  created_at: string;
  updated_at: string;
}

export interface NFSeConfigUpdate {
  codigo_servico_municipal?: string | null;
  aliquota_iss?: number;
  descricao_servico?: string | null;
  serie_nf?: string | null;
  numero_dps?: number | null;
  portal_nacional_username?: string | null;
  portal_nacional_password?: string | null;
  portal_nacional_base_url?: string | null;
  portal_nacional_ambiente?: 'HOMOLOGACAO' | 'PRODUCAO';
  asaas_api_key?: string | null;
  asaas_sandbox?: boolean;
  provider?: 'PORTAL_NACIONAL' | 'ASAAS';
}

export interface NFSeConfigTestAuth {
  provider?: 'PORTAL_NACIONAL' | 'ASAAS';
  portal_nacional_username?: string;
  portal_nacional_password?: string;
  portal_nacional_ambiente?: 'HOMOLOGACAO' | 'PRODUCAO';
  asaas_api_key?: string;
  asaas_sandbox?: boolean;
}

const normalizeResponse = <T>(response: ApiResponse<T>, fallback: T): ApiResponse<T> => ({
  success: response.success,
  data: response.data ?? fallback,
  message: response.message ?? '',
  errors: response.errors,
});

export class NFSeConfigService {
  // Obter configuração
  static async get(): Promise<ApiResponse<NFSeConfig>> {
    const response = await apiService.get<NFSeConfig>('/nfse-config');
    return normalizeResponse(response, {} as NFSeConfig);
  }

  // Atualizar configuração
  static async update(data: NFSeConfigUpdate): Promise<ApiResponse<NFSeConfig>> {
    const response = await apiService.put<NFSeConfig>('/nfse-config', data);
    return normalizeResponse(response, {} as NFSeConfig);
  }

  // Testar autenticação
  static async testAuth(data: NFSeConfigTestAuth): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const response = await apiService.post<{ success: boolean; message: string }>('/nfse-config/test-auth', data);
    return normalizeResponse(response, { success: false, message: '' });
  }
}

