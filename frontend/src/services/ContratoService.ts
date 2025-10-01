import { apiService } from './api';
import { Contrato, CreateContratoData, UpdateContratoData } from '../hooks/useContratos';

export class ContratoService {
  static async getByCliente(clienteId: number): Promise<Contrato[]> {
    const response = await apiService.get(`/contratos/cliente/${clienteId}`);
    return response.data;
  }

  static async getById(id: number): Promise<Contrato> {
    const response = await apiService.get(`/contratos/${id}`);
    return response.data;
  }

  static async create(data: CreateContratoData): Promise<Contrato> {
    const response = await apiService.post('/contratos', data);
    return response.data;
  }

  static async update(id: number, data: UpdateContratoData): Promise<Contrato> {
    const response = await apiService.put(`/contratos/${id}`, data);
    return response.data;
  }

  static async delete(id: number): Promise<void> {
    await apiService.delete(`/contratos/${id}`);
  }

  static async getAtivos(): Promise<Contrato[]> {
    const response = await apiService.get('/contratos/ativos');
    return response.data;
  }
}
