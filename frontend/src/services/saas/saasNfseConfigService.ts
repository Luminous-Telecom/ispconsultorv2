import { apiService } from '../api';
import type { ApiResponse } from 'types';

export interface SaasNFSeConfig {
  id: number;
  codigo_servico_municipal: string | null;
  aliquota_iss: number;
  descricao_servico: string | null;
  serie_nf: string | null;
  numero_dps: number | null;
  portal_nacional_ambiente: 'HOMOLOGACAO' | 'PRODUCAO';
  has_certificado?: boolean;
  certificado_titular?: string | null;
  certificado_cnpj?: string | null;
  certificado_validade?: string | null;
  op_simples_nacional?: number;
  regime_especial_tributacao?: number;
  regime_apuracao_sn?: number | null;
  tp_ret_issqn?: number;
  asaas_banco_habilitado: boolean;
  asaas_sandbox: boolean;
  provider: 'PORTAL_NACIONAL' | 'ASAAS';
  created_at: string;
  updated_at: string;
}

export interface SaasNFSeConfigUpdate {
  codigo_servico_municipal?: string | null;
  aliquota_iss?: number;
  descricao_servico?: string | null;
  serie_nf?: string | null;
  numero_dps?: number | null;
  portal_nacional_ambiente?: 'HOMOLOGACAO' | 'PRODUCAO';
  asaas_sandbox?: boolean;
  provider?: 'PORTAL_NACIONAL' | 'ASAAS';
  op_simples_nacional?: number;
  regime_especial_tributacao?: number;
  regime_apuracao_sn?: number | null;
  tp_ret_issqn?: number;
  certificado_pfx_base64?: string | null;
  certificado_senha?: string | null;
}

export interface SaasNFSeConfigTestAuth {
  provider?: 'PORTAL_NACIONAL' | 'ASAAS';
  portal_nacional_ambiente?: 'HOMOLOGACAO' | 'PRODUCAO';
  certificado_pfx_base64?: string;
  certificado_senha?: string;
  asaas_sandbox?: boolean;
}

const normalizeResponse = <T>(response: ApiResponse<T>, fallback: T): ApiResponse<T> => ({
  success: response.success,
  data: response.data ?? fallback,
  message: response.message ?? '',
  errors: response.errors,
});

export class SaasNFSeConfigService {
  static async get(): Promise<ApiResponse<SaasNFSeConfig>> {
    const response = await apiService.get<SaasNFSeConfig>('/saas/nfse-config');
    return normalizeResponse(response, {} as SaasNFSeConfig);
  }

  static async update(data: SaasNFSeConfigUpdate): Promise<ApiResponse<SaasNFSeConfig>> {
    const response = await apiService.put<SaasNFSeConfig>('/saas/nfse-config', data);
    return normalizeResponse(response, {} as SaasNFSeConfig);
  }

  static async testAuth(data: SaasNFSeConfigTestAuth): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const response = await apiService.post<{ success: boolean; message: string }>('/saas/nfse-config/test-auth', data);
    return normalizeResponse(response, { success: false, message: '' });
  }
}
