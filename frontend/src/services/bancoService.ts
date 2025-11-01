import { apiService } from './api';
import { Banco, CreateBanco, UpdateBanco, BancoFilters, PaginatedResponse } from '../types';

export class BancoService {
  // Listar bancos com filtros e paginação
  static async list(filters: BancoFilters = {}): Promise<PaginatedResponse<Banco>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.tipo_banco) params.append('tipo_banco', filters.tipo_banco);
    if (filters.ativo !== undefined) params.append('ativo', filters.ativo.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    try {
      const response = await apiService.get<PaginatedResponse<Banco>>(`/bancos?${params.toString()}`);
      return response;
    } catch (error) {
      console.error('Erro ao listar bancos:', error);
      throw error;
    }
  }

  // Buscar banco por ID
  static async getById(id: number): Promise<Banco> {
    try {
      const response = await apiService.get<{success: boolean, data: Banco}>(`/bancos/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar banco:', error);
      throw error;
    }
  }

  // Criar novo banco
  static async create(data: CreateBanco): Promise<Banco> {
    try {
      const response = await apiService.post<{success: boolean, data: Banco}>('/bancos', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar banco:', error);
      throw error;
    }
  }

  // Atualizar banco
  static async update(id: number, data: UpdateBanco): Promise<Banco> {
    try {
      const response = await apiService.put<{success: boolean, data: Banco}>(`/bancos/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar banco:', error);
      throw error;
    }
  }

  // Excluir banco
  static async delete(id: number): Promise<void> {
    try {
      await apiService.delete(`/bancos/${id}`);
    } catch (error) {
      console.error('Erro ao excluir banco:', error);
      throw error;
    }
  }

  // Buscar bancos ativos
  static async findAtivos(): Promise<Banco[]> {
    try {
      const response = await apiService.get<{success: boolean, data: Banco[]}>('/bancos/ativos');
      
      // Extrair dados do objeto de resposta
      const bancos = response.success ? response.data : response;
      
      return Array.isArray(bancos) ? bancos : [];
    } catch (error) {
      console.error('Erro ao buscar bancos ativos:', error);
      throw error;
    }
  }

  // Testar conexão do banco
  static async testarConexao(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<{ success: boolean; message: string }>(`/bancos/${id}/testar-conexao`);
      return response;
    } catch (error) {
      console.error('Erro ao testar conexão do banco:', error);
      throw error;
    }
  }

  // Buscar dados da API do banco
  static async buscarDadosApi(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<{ success: boolean; message: string }>(`/bancos/${id}/buscar-dados-api`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar dados da API do banco:', error);
      throw error;
    }
  }

  // Obter URL padrão do banco
  static async urlPadrao(tipoBanco: string): Promise<{ url: string }> {
    try {
      const response = await apiService.get<{ url: string }>(`/api/bancos/${tipoBanco}/url-padrao`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar URL padrão do banco:', error);
      throw error;
    }
  }
}

export const bancoService = new BancoService();
