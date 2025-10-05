import { apiService } from './api';
import { ApiResponse } from '../types';
import { Contrato, CreateContratoData, UpdateContratoData } from '../hooks/useContratos';

export class ContratoService {
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
