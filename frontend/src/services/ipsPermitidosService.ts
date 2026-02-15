import { defaultApiClient } from './core';
import type { PaginatedResponse } from '@/types';

export interface IpPermitido {
  id: number;
  cliente_id: number;
  faixa_ips: string;
  cliente_nome?: string;
  cliente?: { id: number; razao_social: string; nome_fantasia?: string; cnpj: string };
  created_at?: string;
}

export interface IpPermitidoFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: string;
}

export class IpsPermitidosService {
  static async list(filters: IpPermitidoFilters = {}): Promise<PaginatedResponse<IpPermitido>> {
    const response = await defaultApiClient.get<PaginatedResponse<IpPermitido>>('/ips-permitidos', {
      params: filters
    });
    const fallback: PaginatedResponse<IpPermitido> = {
      success: true,
      data: [],
      pagination: { current_page: 1, per_page: 15, total: 0, last_page: 0, from: 0, to: 0 }
    };
    if (response && typeof response === 'object' && 'success' in response && response.data && typeof response.data === 'object') {
      const payload = response.data as { data?: IpPermitido[]; pagination?: PaginatedResponse<IpPermitido>['pagination'] };
      if ('data' in payload && 'pagination' in payload) {
        return {
          success: true,
          data: payload.data ?? [],
          pagination: payload.pagination ?? fallback.pagination
        };
      }
      if ('pagination' in (response as PaginatedResponse<IpPermitido>)) {
        return response as PaginatedResponse<IpPermitido>;
      }
    }
    return fallback;
  }

  static async getById(id: number): Promise<IpPermitido> {
    const response = await defaultApiClient.get<IpPermitido>(`/ips-permitidos/${id}`);
    const data = (response as { data?: IpPermitido }).data;
    if (!data) throw new Error('Registro não encontrado');
    return data;
  }

  static async create(data: { cliente_id: number; faixa_ips: string }): Promise<IpPermitido> {
    const response = await defaultApiClient.post<IpPermitido>('/ips-permitidos', data);
    const resData = (response as { data?: IpPermitido }).data;
    if (!resData) throw new Error('Resposta inválida');
    return resData;
  }

  static async update(id: number, data: { faixa_ips: string }): Promise<IpPermitido> {
    const response = await defaultApiClient.put<IpPermitido>(`/ips-permitidos/${id}`, data);
    const resData = (response as { data?: IpPermitido }).data;
    if (!resData) throw new Error('Resposta inválida');
    return resData;
  }

  static async delete(id: number): Promise<void> {
    await defaultApiClient.delete(`/ips-permitidos/${id}`);
  }
}
