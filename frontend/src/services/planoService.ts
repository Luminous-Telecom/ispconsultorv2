/**
 * PlanoService - Serviço refatorado usando BaseService
 * Mantém compatibilidade com código existente através de métodos estáticos
 */
import { BaseService, defaultApiClient, unwrapArrayResponse } from './core';
import { Plano, CreatePlano, UpdatePlano, PlanoFilters, PaginatedResponse, ApiResponse } from '../types';

/**
 * Classe de serviço para operações relacionadas a Planos
 * Usa BaseService para operações CRUD padrão
 */
class PlanoServiceClass extends BaseService<Plano, CreatePlano, UpdatePlano, PlanoFilters> {
  constructor() {
    super(defaultApiClient, '/planos');
  }

  /**
   * Buscar planos ativos
   */
  async findAtivos(): Promise<ApiResponse<Plano[]>> {
    return this.customGet<Plano[]>(`/ativos`);
  }

  /**
   * Buscar planos por cliente
   */
  async findByCliente(clienteId: number): Promise<ApiResponse<Plano[]>> {
    return this.customGet<Plano[]>(`/cliente/${clienteId}`);
  }

  /**
   * Alterar status do plano (desativar/ativar)
   */
  async toggleStatus(id: number, status: 'ativo' | 'inativo'): Promise<ApiResponse<Plano>> {
    return this.customPost<Plano>(`/${id}/status`, { status });
  }
}

// Instância única do serviço
const planoServiceInstance = new PlanoServiceClass();

/**
 * PlanoService - API estática para compatibilidade com código existente
 * Todos os métodos delegam para a instância do serviço
 */
export class PlanoService {
  /**
   * Listar planos com filtros e paginação
   */
  static async list(filters: PlanoFilters = {}): Promise<PaginatedResponse<Plano>> {
    return planoServiceInstance.list(filters);
  }

  /**
   * Buscar plano por ID
   */
  static async getById(id: number): Promise<Plano> {
    const response = await planoServiceInstance.getById(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Plano;
  }

  /**
   * Criar novo plano
   */
  static async create(data: CreatePlano): Promise<Plano> {
    const response = await planoServiceInstance.create(data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Plano;
  }

  /**
   * Atualizar plano
   */
  static async update(id: number, data: UpdatePlano): Promise<Plano> {
    const response = await planoServiceInstance.update(id, data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Plano;
  }

  /**
   * Excluir plano
   */
  static async delete(id: number): Promise<void> {
    await planoServiceInstance.delete(id);
  }

  /**
   * Buscar planos ativos
   */
  static async findAtivos(): Promise<Plano[]> {
    const response = await planoServiceInstance.findAtivos();
    return unwrapArrayResponse<Plano>(response, { fallback: [], throwOnFailure: false });
  }

  /**
   * Buscar planos por cliente
   */
  static async findByCliente(clienteId: number): Promise<Plano[]> {
    const response = await planoServiceInstance.findByCliente(clienteId);
    return unwrapArrayResponse<Plano>(response, { fallback: [], throwOnFailure: false });
  }

  /**
   * Alterar status do plano (desativar/ativar)
   */
  static async toggleStatus(id: number, status: 'ativo' | 'inativo'): Promise<Plano> {
    const response = await planoServiceInstance.toggleStatus(id, status);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Plano;
  }
}

/**
 * Exportar também a instância do serviço para uso direto (opcional)
 */
export const planoService = planoServiceInstance;
