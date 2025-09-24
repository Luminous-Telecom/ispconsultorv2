import { apiService } from './api';
import { Plano, CreatePlano, UpdatePlano, PlanoFilters, PaginatedResponse } from '../types';

export class PlanoService {
  // Listar planos com filtros e paginação
  static async list(filters: PlanoFilters = {}): Promise<PaginatedResponse<Plano>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.tipo_servico) params.append('tipo_servico', filters.tipo_servico);
    if (filters.cliente_id) params.append('cliente_id', filters.cliente_id.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    try {
      const response = await apiService.get<PaginatedResponse<Plano>>(`/planos?${params.toString()}`);
      return response;
    } catch (error) {
      console.error('Erro ao listar planos:', error);
      throw error;
    }
  }

  // Buscar plano por ID
  static async getById(id: number): Promise<Plano> {
    try {
      const response = await apiService.get<Plano>(`/planos/${id}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar plano:', error);
      throw error;
    }
  }

  // Criar novo plano
  static async create(data: CreatePlano): Promise<Plano> {
    try {
      const response = await apiService.post<Plano>('/planos', data);
      return response;
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      throw error;
    }
  }

  // Atualizar plano
  static async update(id: number, data: UpdatePlano): Promise<Plano> {
    try {
      const response = await apiService.put<Plano>(`/planos/${id}`, data);
      return response;
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      throw error;
    }
  }

  // Excluir plano
  static async delete(id: number): Promise<void> {
    try {
      await apiService.delete(`/planos/${id}`);
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      throw error;
    }
  }

  // Buscar planos ativos
  static async findAtivos(): Promise<Plano[]> {
    try {
      const response = await apiService.get<Plano[]>('/planos/ativos');
      return response;
    } catch (error) {
      console.error('Erro ao buscar planos ativos:', error);
      throw error;
    }
  }

  // Buscar planos por cliente
  static async findByCliente(clienteId: number): Promise<Plano[]> {
    try {
      const response = await apiService.get<Plano[]>(`/planos/cliente/${clienteId}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar planos por cliente:', error);
      throw error;
    }
  }
}

export const planoService = new PlanoService();
