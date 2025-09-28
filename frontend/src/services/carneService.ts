import { apiService } from './api';
import { Carne, CreateCarne, UpdateCarne, CarneFilters, PaginatedResponse } from '../types';

export class CarneService {
  // Listar carnês com filtros e paginação
  static async list(filters: CarneFilters = {}): Promise<PaginatedResponse<Carne>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.cliente_id) params.append('cliente_id', filters.cliente_id.toString());
    if (filters.plano_id) params.append('plano_id', filters.plano_id.toString());
    if (filters.banco_id) params.append('banco_id', filters.banco_id.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    try {
      const response = await apiService.get<PaginatedResponse<Carne>>(`/carnes?${params.toString()}`);
      return response;
    } catch (error) {
      console.error('Erro ao listar carnês:', error);
      throw error;
    }
  }

  // Buscar carnê por ID
  static async getById(id: number): Promise<Carne> {
    try {
      const response = await apiService.get<Carne>(`/carnes/${id}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar carnê:', error);
      throw error;
    }
  }

  // Criar novo carnê
  static async create(data: CreateCarne): Promise<Carne> {
    try {
      const response = await apiService.post<Carne>('/carnes', data);
      return response;
    } catch (error) {
      console.error('Erro ao criar carnê:', error);
      throw error;
    }
  }

  // Atualizar carnê
  static async update(id: number, data: UpdateCarne): Promise<Carne> {
    try {
      const response = await apiService.put<Carne>(`/carnes/${id}`, data);
      return response;
    } catch (error) {
      console.error('Erro ao atualizar carnê:', error);
      throw error;
    }
  }

  // Excluir carnê
  static async delete(id: number): Promise<void> {
    try {
      await apiService.delete(`/carnes/${id}`);
    } catch (error) {
      console.error('Erro ao excluir carnê:', error);
      throw error;
    }
  }

  // Buscar carnês ativos
  static async findAtivos(): Promise<Carne[]> {
    try {
      const response = await apiService.get<Carne[]>('/carnes/ativos');
      return response;
    } catch (error) {
      console.error('Erro ao buscar carnês ativos:', error);
      throw error;
    }
  }


  // Consultar status no banco
  static async consultarStatus(id: number): Promise<{ status: string; message: string }> {
    try {
      const response = await apiService.post<{ status: string; message: string }>(`/carnes/${id}/consultar-status`);
      return response;
    } catch (error) {
      console.error('Erro ao consultar status:', error);
      throw error;
    }
  }

  // Registrar no banco
  static async registrarNoBanco(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<{ success: boolean; message: string }>(`/carnes/${id}/registrar-banco`);
      return response;
    } catch (error) {
      console.error('Erro ao registrar no banco:', error);
      throw error;
    }
  }

  // Cancelar no banco
  static async cancelarNoBanco(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<{ success: boolean; message: string }>(`/carnes/${id}/cancelar-banco`);
      return response;
    } catch (error) {
      console.error('Erro ao cancelar no banco:', error);
      throw error;
    }
  }

  // Imprimir carnê
  static async imprimir(id: number): Promise<string> {
    try {
      const response = await apiService.get<string>(`/carnes/${id}/imprimir`);
      return response;
    } catch (error) {
      console.error('Erro ao imprimir carnê:', error);
      throw error;
    }
  }

  // Gerar PDF do carnê
  static async gerarPdf(id: number): Promise<Blob> {
    try {
      const response = await apiService.get<Blob>(`/carnes/${id}/pdf`, {}, { responseType: 'blob' });
      return response;
    } catch (error) {
      console.error('Erro ao gerar PDF do carnê:', error);
      throw error;
    }
  }
}

export const carneService = new CarneService();
