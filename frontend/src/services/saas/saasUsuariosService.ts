import { defaultApiClient } from '../core';
import type { ApiResponse } from '../../types';

export type SaasNivelAcesso = 'super' | 'admin' | 'suporte';

export interface SaasUsuarioSuper {
  id: number;
  nome: string;
  email: string;
  nivel_acesso: SaasNivelAcesso;
  ativo: boolean;
  precisa_trocar_senha: boolean;
  ultimo_login?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaasUsuarioListResponse {
  data: SaasUsuarioSuper[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SaasUsuarioFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export const saasUsuariosService = {
  async list(filters: SaasUsuarioFilters = {}): Promise<ApiResponse<SaasUsuarioListResponse>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    return defaultApiClient.get<SaasUsuarioListResponse>(`/saas/usuarios?${params.toString()}`);
  },

  async getById(id: number): Promise<ApiResponse<SaasUsuarioSuper>> {
    return defaultApiClient.get(`/saas/usuarios/${id}`);
  },

  async create(data: { nome: string; email: string; senha: string; nivel_acesso?: SaasNivelAcesso; ativo?: boolean }): Promise<ApiResponse<SaasUsuarioSuper>> {
    return defaultApiClient.post('/saas/usuarios', data);
  },

  async update(id: number, data: { nome?: string; email?: string; senha?: string; nivel_acesso?: SaasNivelAcesso; ativo?: boolean }): Promise<ApiResponse<null>> {
    return defaultApiClient.put(`/saas/usuarios/${id}`, data);
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    return defaultApiClient.delete(`/saas/usuarios/${id}`);
  },
};
