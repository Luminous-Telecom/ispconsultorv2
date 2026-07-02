import { apiService } from './api';
import { unwrapArrayResponse } from './core';

export interface TipoCobrancaContrato {
  id: number;
  nome: string;
  quantidade_titulos: number;
  periodicidade: 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | 'quinzenal' | 'semanal';
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TipoCobrancaContratoFilters {
  search?: string;
  searchField?: string;
  ativo?: string;
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortDirection?: string;
}

export interface PaginatedTipoCobrancaContrato {
  success: boolean;
  data: TipoCobrancaContrato[];
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class TipoCobrancaContratoService {
  static async list(filters: TipoCobrancaContratoFilters = {}): Promise<PaginatedTipoCobrancaContrato> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.searchField) params.append('searchField', filters.searchField);
    if (filters.ativo) params.append('ativo', filters.ativo);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.sortColumn) params.append('sortColumn', filters.sortColumn);
    if (filters.sortDirection) params.append('sortDirection', filters.sortDirection);
    const qs = params.toString();
    const response = await apiService.get<PaginatedTipoCobrancaContrato | { data: PaginatedTipoCobrancaContrato }>(
      `/tipos-cobranca-contrato${qs ? `?${qs}` : ''}`
    );
    const raw = response as unknown as PaginatedTipoCobrancaContrato | { data: PaginatedTipoCobrancaContrato };
    if (raw && typeof raw === 'object' && 'data' in raw && !Array.isArray((raw as { data: unknown }).data)) {
      const inner = (raw as { data: PaginatedTipoCobrancaContrato }).data;
      return {
        success: inner?.success ?? true,
        data: Array.isArray(inner?.data) ? inner.data : [],
        pagination: inner?.pagination,
      };
    }
    const data = (raw as PaginatedTipoCobrancaContrato)?.data;
    return {
      success: (raw as PaginatedTipoCobrancaContrato)?.success ?? true,
      data: Array.isArray(data) ? data : [],
      pagination: (raw as PaginatedTipoCobrancaContrato)?.pagination,
    };
  }

  static async getById(id: number): Promise<TipoCobrancaContrato> {
    const response = await apiService.get<TipoCobrancaContrato>(`/tipos-cobranca-contrato/${id}`);
    return (response as unknown as { data?: TipoCobrancaContrato }).data ?? (response as unknown as TipoCobrancaContrato);
  }

  static async findAtivos(): Promise<TipoCobrancaContrato[]> {
    const response = await apiService.get<TipoCobrancaContrato[]>('/tipos-cobranca-contrato/ativos');
    return unwrapArrayResponse<TipoCobrancaContrato>(response, { fallback: [], throwOnFailure: false });
  }

  static async create(data: Partial<TipoCobrancaContrato>): Promise<TipoCobrancaContrato> {
    const response = await apiService.post<TipoCobrancaContrato>('/tipos-cobranca-contrato', data);
    return (response as unknown as { data?: TipoCobrancaContrato }).data ?? (response as unknown as TipoCobrancaContrato);
  }

  static async update(id: number, data: Partial<TipoCobrancaContrato>): Promise<TipoCobrancaContrato> {
    const response = await apiService.put<TipoCobrancaContrato>(`/tipos-cobranca-contrato/${id}`, data);
    return (response as unknown as { data?: TipoCobrancaContrato }).data ?? (response as unknown as TipoCobrancaContrato);
  }

  static async delete(id: number): Promise<void> {
    await apiService.delete(`/tipos-cobranca-contrato/${id}`);
  }
}
