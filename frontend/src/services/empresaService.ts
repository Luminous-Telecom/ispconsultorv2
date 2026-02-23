import { defaultApiClient } from './core';
import type { Empresa, CreateEmpresa, UpdateEmpresa, ApiResponse, PaginatedResponse } from '../types';

export interface EmpresaFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export const EmpresaService = {
  async list(filters: EmpresaFilters = {}): Promise<PaginatedResponse<Empresa>> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);


    const query = params.toString() ? `?${params.toString()}` : '';
    return defaultApiClient.get<PaginatedResponse<Empresa>>(`/empresas${query}`) as Promise<PaginatedResponse<Empresa>>;
  },

  async getById(id: number): Promise<ApiResponse<Empresa>> {
    return defaultApiClient.get<Empresa>(`/empresas/${id}`);
  },

  async create(data: CreateEmpresa): Promise<ApiResponse<Empresa>> {
    return defaultApiClient.post<Empresa>('/empresas', data);
  },

  async update(id: number, data: UpdateEmpresa): Promise<ApiResponse<Empresa>> {
    return defaultApiClient.put<Empresa>(`/empresas/${id}`, data);
  },

  async delete(id: number): Promise<ApiResponse<void>> {
    return defaultApiClient.delete<void>(`/empresas/${id}`);
  },
};
