import { defaultApiClient } from '../core';
import type { ApiResponse } from '../../types';
export interface SaasTenantUsuario {
  id: number;
  nome: string;
  email: string;
  role: 'admin' | 'user';
  ativo: boolean;
  empresa_id?: number | null;
  created_at?: string;
}

export interface SaasTenantUsuarioFilters {
  page?: number;
  limit?: number;
  search?: string;
  ativo?: string;
  empresa_id: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

const buildParams = (f: SaasTenantUsuarioFilters) => {
  const params = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  });
  return params.toString();
};

export const saasTenantUsuariosService = {
  list: (f: SaasTenantUsuarioFilters) =>
    defaultApiClient.get<{ success: boolean; data: SaasTenantUsuario[]; pagination?: object }>(
      `/saas/tenant-usuarios?${buildParams(f)}`
    ),
  getById: (id: number) => defaultApiClient.get<ApiResponse<SaasTenantUsuario>>(`/saas/tenant-usuarios/${id}`),
  create: (d: { empresa_id: number; nome: string; email: string; password: string; role?: 'admin' | 'user'; ativo?: boolean }) =>
    defaultApiClient.post<ApiResponse<SaasTenantUsuario>>('/saas/tenant-usuarios', d),
  update: (id: number, d: Partial<{ nome: string; email: string; password: string; role: 'admin' | 'user'; ativo: boolean }>) =>
    defaultApiClient.put<ApiResponse<SaasTenantUsuario>>(`/saas/tenant-usuarios/${id}`, d),
  delete: (id: number) => defaultApiClient.delete(`/saas/tenant-usuarios/${id}`),
};
