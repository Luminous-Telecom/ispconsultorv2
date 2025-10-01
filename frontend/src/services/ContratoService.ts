import { apiService } from './api';
import { ApiResponse } from '../types';
import { Contrato, CreateContratoData, UpdateContratoData } from '../hooks/useContratos';

export class ContratoService {
  static async getByCliente(clienteId: number): Promise<Contrato[]> {
    const response = await apiService.get<ApiResponse<Contrato[]>>(`/contratos/cliente/${clienteId}`);
    return response.data || [];
  }

  static async getById(id: number): Promise<Contrato> {
    const response = await apiService.get<ApiResponse<Contrato>>(`/contratos/${id}`);
    return response.data!;
  }

  static async create(data: CreateContratoData): Promise<Contrato> {
    const response = await apiService.post<ApiResponse<Contrato>>('/contratos', data);
    return response.data!;
  }

  static async update(id: number, data: UpdateContratoData): Promise<Contrato> {
    const response = await apiService.put<ApiResponse<Contrato>>(`/contratos/${id}`, data);
    return response.data!;
  }

  static async delete(id: number): Promise<void> {
    await apiService.delete(`/contratos/${id}`);
  }

  static async getAtivos(): Promise<Contrato[]> {
    const response = await apiService.get<ApiResponse<Contrato[]>>('/contratos/ativos');
    return response.data || [];
  }
}
