import { apiService } from './api';
import { Contrato, CreateContratoData, UpdateContratoData } from '../hooks/useContratos';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ContratoService {
  static async list(params: ListParams = {}): Promise<PaginatedResponse<Contrato>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);

    const url = queryParams.toString() ? `/contratos?${queryParams}` : '/contratos';
    const response = await apiService.get<PaginatedResponse<Contrato>>(url);
    return response || { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }

  static async getByCliente(clienteId: number): Promise<Contrato[]> {
    const response = await apiService.get<Contrato[]>(`/contratos/cliente/${clienteId}`);
    return response || [];
  }

  static async getById(id: number): Promise<Contrato> {
    const response = await apiService.get<Contrato>(`/contratos/${id}`);
    return response!;
  }

  static async create(data: CreateContratoData): Promise<Contrato> {
    const response = await apiService.post<{ success: boolean; message: string; data: Contrato }>('/contratos', data);
    return response.data;
  }

  static async update(id: number, data: UpdateContratoData): Promise<Contrato> {
    const response = await apiService.put<Contrato>(`/contratos/${id}`, data);
    return response!;
  }

  static async delete(id: number): Promise<void> {
    await apiService.delete(`/contratos/${id}`);
  }

  static async getAtivos(): Promise<Contrato[]> {
    const response = await apiService.get<Contrato[]>('/contratos/ativos');
    return response || [];
  }
}
