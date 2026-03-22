import { defaultApiClient } from './core';
import type { Empresa, CreateEmpresa, UpdateEmpresa, ApiResponse, PaginatedResponse } from '../types';

export interface EmpresaFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
}

const emptyPagination: PaginatedResponse<Empresa>['pagination'] = {
  current_page: 1,
  per_page: 15,
  total: 0,
  last_page: 0,
  from: 0,
  to: 0,
};

/**
 * O backend envia sendSuccess({ success, data: rows, pagination }), gerando
 * { success, data: { success, data: rows, pagination } } — normaliza para PaginatedResponse.
 */
function normalizeEmpresaListResponse(res: ApiResponse<unknown>): PaginatedResponse<Empresa> {
  const outer = res.data;
  if (Array.isArray(outer)) {
    return { success: true, data: outer, pagination: { ...emptyPagination, total: outer.length } };
  }
  if (outer && typeof outer === 'object' && 'data' in outer) {
    const block = outer as { data?: unknown; pagination?: PaginatedResponse<Empresa>['pagination'] };
    if (Array.isArray(block.data)) {
      return {
        success: true,
        data: block.data,
        pagination: block.pagination
          ? { ...emptyPagination, ...block.pagination }
          : emptyPagination,
      };
    }
  }
  return { success: true, data: [], pagination: emptyPagination };
}

export const EmpresaService = {
  async list(filters: EmpresaFilters = {}): Promise<PaginatedResponse<Empresa>> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.searchField) params.append('searchField', filters.searchField);

    const query = params.toString() ? `?${params.toString()}` : '';
    const raw = await defaultApiClient.get<unknown>(`/empresas${query}`);
    return normalizeEmpresaListResponse(raw);
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
