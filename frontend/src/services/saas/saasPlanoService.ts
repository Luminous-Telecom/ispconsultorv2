import { defaultApiClient } from '../core';
import type { ApiResponse } from '../../types';

export interface SaasPlano {
  id: number;
  nome: string;
  descricao?: string;
  valor_mensal: number;
  valor_anual?: number;
  limite_usuarios: number;
  recursos?: Record<string, unknown>;
  ativo: boolean;
  mostrar_hotsite?: boolean;
  desconto_percentual?: number;
  created_at: string;
}

export const saasPlanoService = {
  async list(): Promise<ApiResponse<SaasPlano[]>> {
    return defaultApiClient.get('/saas/planos');
  },

  async getById(id: number): Promise<ApiResponse<SaasPlano>> {
    return defaultApiClient.get<SaasPlano>(`/saas/planos/${id}`);
  },

  async create(data: Partial<SaasPlano>): Promise<ApiResponse<SaasPlano>> {
    return defaultApiClient.post('/saas/planos', data);
  },

  async update(id: number, data: Partial<SaasPlano>): Promise<ApiResponse<null>> {
    return defaultApiClient.put(`/saas/planos/${id}`, data);
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    return defaultApiClient.delete(`/saas/planos/${id}`);
  },
};
