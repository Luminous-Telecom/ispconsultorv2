import { defaultApiClient } from '../core';
import type { ApiResponse } from '../../types';

export interface SaasConfigListResponse<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface SaasCrudFilters {
  page?: number;
  limit?: number;
  search?: string;
  empresa_id?: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  status?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
}

const buildParams = (f: SaasCrudFilters) => {
  const params = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  });
  return params.toString();
};

export function createSaasCrudService<T>(endpoint: string) {
  return {
    list: (f: SaasCrudFilters = {}) =>
      defaultApiClient.get<SaasConfigListResponse<T>>(`${endpoint}?${buildParams(f)}`),
    getById: (id: number) => defaultApiClient.get<ApiResponse<T>>(`${endpoint}/${id}`),
    create: (d: Partial<T>) => defaultApiClient.post(endpoint, d),
    update: (id: number, d: Partial<T>) => defaultApiClient.put(`${endpoint}/${id}`, d),
    delete: (id: number) => defaultApiClient.delete(`${endpoint}/${id}`),
  };
}
