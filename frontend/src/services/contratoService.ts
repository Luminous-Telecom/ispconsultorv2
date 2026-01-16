/**
 * ContratoService - Serviço refatorado usando BaseService
 * Mantém compatibilidade com código existente através de métodos estáticos
 */
import { BaseService, defaultApiClient, BaseFilters } from './core';
import { PaginatedResponse, ApiResponse } from '../types';
import { Contrato, CreateContratoData, UpdateContratoData } from '../hooks/useContratos';

/**
 * Filtros para listagem de contratos
 */
export interface ContratoFilters extends BaseFilters {
  status?: string;
  cliente_id?: number;
}

/**
 * Classe de serviço para operações relacionadas a Contratos
 * Usa BaseService para operações CRUD padrão
 * Nota: Usa o tipo Contrato de useContratos.ts para compatibilidade
 */
class ContratoServiceClass extends BaseService<Contrato, CreateContratoData, UpdateContratoData, ContratoFilters> {
  constructor() {
    super(defaultApiClient, '/contratos');
  }

  /**
   * Buscar contratos por cliente
   */
  async getByCliente(clienteId: number): Promise<ApiResponse<Contrato[]>> {
    return this.customGet<Contrato[]>(`/cliente/${clienteId}`);
  }

  /**
   * Buscar contratos ativos
   */
  async getAtivos(): Promise<ApiResponse<Contrato[]>> {
    return this.customGet<Contrato[]>(`/ativos`);
  }
}

// Instância única do serviço
const contratoServiceInstance = new ContratoServiceClass();

/**
 * ContratoService - API estática para compatibilidade com código existente
 * Todos os métodos delegam para a instância do serviço
 */
export class ContratoService {
  /**
   * Listar contratos com filtros e paginação
   */
  static async list(params: ContratoFilters = {}): Promise<PaginatedResponse<Contrato>> {
    return contratoServiceInstance.list(params);
  }

  /**
   * Buscar contrato por ID
   */
  static async getById(id: number): Promise<Contrato> {
    const response = await contratoServiceInstance.getById(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Contrato;
  }

  /**
   * Buscar contratos por cliente
   */
  static async getByCliente(clienteId: number): Promise<Contrato[]> {
    const response = await contratoServiceInstance.getByCliente(clienteId);
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  /**
   * Buscar contratos ativos
   */
  static async getAtivos(): Promise<Contrato[]> {
    const response = await contratoServiceInstance.getAtivos();
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  /**
   * Criar novo contrato
   */
  static async create(data: CreateContratoData): Promise<Contrato> {
    const response = await contratoServiceInstance.create(data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Contrato;
  }

  /**
   * Atualizar contrato
   */
  static async update(id: number, data: UpdateContratoData): Promise<Contrato> {
    const response = await contratoServiceInstance.update(id, data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Contrato;
  }

  /**
   * Excluir contrato
   */
  static async delete(id: number): Promise<void> {
    await contratoServiceInstance.delete(id);
  }
}
