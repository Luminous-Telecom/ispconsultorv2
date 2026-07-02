/**
 * ContratoService - Serviço refatorado usando BaseService
 * Mantém compatibilidade com código existente através de métodos estáticos
 */
import { BaseService, defaultApiClient, BaseFilters, unwrapArrayResponse } from './core';
import { PaginatedResponse, ApiResponse } from '../types';
import { Contrato, CreateContratoData, UpdateContratoData } from '../hooks/useContratos';

/**
 * Filtros para listagem de contratos
 */
export interface ContratoFilters extends BaseFilters {
  status?: string;
  cliente_id?: number;
  isento_mensalidade?: boolean;
  plano_id?: number;
  tipo_servico?: string;
  em_atraso?: boolean;
  /** Lista só contratos sem título vencido não pago (alinhado à fatia "Ativos" do dashboard) */
  excluir_em_atraso?: boolean;
  searchField?: string;
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
  async getByCliente(clienteId: number, options?: { sortColumn?: string; sortDirection?: 'asc' | 'desc' }): Promise<ApiResponse<Contrato[]>> {
    const params = new URLSearchParams();
    if (options?.sortColumn) {
      params.append('sortColumn', options.sortColumn);
    }
    if (options?.sortDirection) {
      params.append('sortDirection', options.sortDirection);
    }
    
    const queryString = params.toString();
    const url = `/cliente/${clienteId}${queryString ? `?${queryString}` : ''}`;
    return this.customGet<Contrato[]>(url);
  }

  /**
   * Buscar contratos ativos
   */
  async getAtivos(): Promise<ApiResponse<Contrato[]>> {
    return this.customGet<Contrato[]>(`/ativos`);
  }

  /**
   * Gerar títulos do contrato manualmente
   */
  async gerarTitulos(id: number): Promise<ApiResponse<{ titulos_gerados: number; message: string }>> {
    return this.customPost<{ titulos_gerados: number; message: string }>(`/${id}/gerar-titulos`, {});
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
  static async getByCliente(clienteId: number, options?: { sortColumn?: string; sortDirection?: 'asc' | 'desc' }): Promise<Contrato[]> {
    const response = await contratoServiceInstance.getByCliente(clienteId, options);
    return unwrapArrayResponse<Contrato>(response, { fallback: [], throwOnFailure: false });
  }

  /**
   * Buscar contratos ativos
   */
  static async getAtivos(): Promise<Contrato[]> {
    const response = await contratoServiceInstance.getAtivos();
    return unwrapArrayResponse<Contrato>(response, { fallback: [], throwOnFailure: false });
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

  /**
   * Gerar títulos do contrato manualmente
   */
  static async gerarTitulos(id: number): Promise<{ titulos_gerados: number; message: string }> {
    const response = await contratoServiceInstance.gerarTitulos(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as { titulos_gerados: number; message: string };
  }
}
