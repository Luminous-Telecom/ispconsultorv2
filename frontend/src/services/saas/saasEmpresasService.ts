import { defaultApiClient } from '../core';
import type { ApiResponse } from 'types';

export interface SaasConfigListResponse<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface SaasEmpresa {
  id: number;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  email: string;
  telefone: string | null;
  celular: string | null;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  total_usuarios?: number;
  created_at?: string;
  updated_at?: string;
}

const buildParams = (f: Record<string, unknown>) => {
  const params = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  });
  return params.toString();
};

export const saasEmpresasService = {
  list: (f: { page?: number; limit?: number; search?: string; sortColumn?: string; sortDirection?: 'asc' | 'desc'; created_at_inicio?: string; created_at_fim?: string; plano_id?: number } = {}) =>
    defaultApiClient.get<SaasConfigListResponse<SaasEmpresa>>(`/saas/empresas?${buildParams(f)}`),
  getById: (id: number) => defaultApiClient.get<ApiResponse<SaasEmpresa>>(`/saas/empresas/${id}`),
  create: (d: Partial<SaasEmpresa>) => defaultApiClient.post('/saas/empresas', d),
  update: (id: number, d: Partial<SaasEmpresa>) => defaultApiClient.put(`/saas/empresas/${id}`, d),
  delete: (id: number) => defaultApiClient.delete(`/saas/empresas/${id}`),
  getStats: () =>
    defaultApiClient.get<{ success: boolean; data: { total: number; totalUsuarios: number } }>('/saas/empresas/stats'),
  desbloquearManual: (id: number) =>
    defaultApiClient.post<{ success: boolean; message: string; data?: { data_fim_desbloqueio_manual: string } }>(`/saas/empresas/${id}/desbloquear-manual`),
  updateDataFimDesbloqueioManual: (id: number, dataFimDesbloqueioManual: string | null) =>
    defaultApiClient.patch<ApiResponse<{ data_fim_desbloqueio_manual: string | null }>>(`/saas/empresas/${id}/data-fim-desbloqueio-manual`, { data_fim_desbloqueio_manual: dataFimDesbloqueioManual }),
};
