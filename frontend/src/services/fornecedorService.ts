/**
 * FornecedorService - Serviço para Fornecedores
 */
import { defaultApiClient } from './core';
import { Fornecedor, CreateFornecedor, UpdateFornecedor, FornecedorFilters, PaginatedResponse, ApiResponse } from '../types';

/**
 * Classe de serviço para operações relacionadas a Fornecedores
 * Estende BaseService mas sobrescreve métodos que usam ID (string ao invés de number)
 */
class FornecedorServiceClass {
  protected apiClient = defaultApiClient;
  protected baseEndpoint = '/fornecedores';

  /**
   * Listar fornecedores com filtros e paginação
   */
  async list(filters: FornecedorFilters = {}): Promise<PaginatedResponse<Fornecedor>> {
    try {
      const queryString = this.apiClient.buildQueryString(filters);
      const url = `${this.baseEndpoint}${queryString}`;
      const response = await this.apiClient.get<PaginatedResponse<Fornecedor>>(url);
      
      if (response && typeof response === 'object' && 'success' in response && 'data' in response && 'pagination' in response) {
        return response as PaginatedResponse<Fornecedor>;
      }
      
      if (response.data && typeof response.data === 'object' && 'data' in response.data && 'pagination' in response.data) {
        if ('success' in response.data) {
          const innerData = (response.data as { data?: Fornecedor[]; pagination?: Record<string, unknown> });
          return {
            data: innerData.data || [],
            pagination: innerData.pagination || {}
          } as PaginatedResponse<Fornecedor>;
        }
        return response.data as PaginatedResponse<Fornecedor>;
      }
      
      const innerData = response.data || response;
      let data: Fornecedor[] = [];
      let pagination: Record<string, string | number | boolean | null | undefined | object> = {};
      
      if (innerData && typeof innerData === 'object') {
        if ('data' in innerData && 'pagination' in innerData) {
          data = (innerData as PaginatedResponse<Fornecedor>).data || [];
          pagination = (innerData as PaginatedResponse<Fornecedor>).pagination || {};
        } else if (Array.isArray(innerData)) {
          data = innerData as Fornecedor[];
        } else if ('data' in innerData && Array.isArray((innerData as { data?: Fornecedor[] }).data)) {
          data = (innerData as { data: Fornecedor[] }).data;
          pagination = ('pagination' in innerData) ? (innerData as { pagination: Record<string, string | number | boolean | null | undefined | object> }).pagination : {};
        }
      }
      
      return {
        success: true,
        data,
        pagination
      } as PaginatedResponse<Fornecedor>;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar fornecedor por ID
   */
  async getById(id: number): Promise<ApiResponse<Fornecedor>> {
    try {
      const url = `${this.baseEndpoint}/${id}`;
      const response = await this.apiClient.get<Fornecedor>(url);
      // apiClient.get retorna ApiResponse<T>, então response já tem { success, data }
      // Se response.data existe, usar response.data, senão usar response diretamente
      if (response && typeof response === 'object' && 'data' in response) {
        return response as ApiResponse<Fornecedor>;
      }
      return {
        success: true,
        data: response as unknown as Fornecedor
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Criar novo fornecedor
   */
  async create(data: CreateFornecedor): Promise<ApiResponse<Fornecedor>> {
    try {
      const response = await this.apiClient.post<Fornecedor>(this.baseEndpoint, data);
      return {
        success: true,
        data: response as unknown as Fornecedor
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualizar fornecedor
   */
  async update(id: number, data: UpdateFornecedor): Promise<ApiResponse<Fornecedor>> {
    try {
      const url = `${this.baseEndpoint}/${id}`;
      const response = await this.apiClient.put<Fornecedor>(url, data);
      return {
        success: true,
        data: response as unknown as Fornecedor
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Excluir fornecedor
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      const url = `${this.baseEndpoint}/${id}`;
      await this.apiClient.delete<void>(url);
      return {
        success: true
      };
    } catch (error) {
      throw error;
    }
  }
}

// Instância única do serviço
const fornecedorServiceInstance = new FornecedorServiceClass();

/**
 * FornecedorService - API estática para compatibilidade com código existente
 */
export class FornecedorService {
  /**
   * Listar fornecedores com filtros e paginação
   */
  static async list(filters: FornecedorFilters = {}): Promise<PaginatedResponse<Fornecedor>> {
    return fornecedorServiceInstance.list(filters);
  }

  /**
   * Buscar fornecedor por ID
   */
  static async getById(id: number): Promise<Fornecedor> {
    const response = await fornecedorServiceInstance.getById(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Fornecedor;
  }

  /**
   * Criar novo fornecedor
   */
  static async create(data: CreateFornecedor): Promise<Fornecedor> {
    const response = await fornecedorServiceInstance.create(data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Fornecedor;
  }

  /**
   * Atualizar fornecedor
   */
  static async update(id: number, data: UpdateFornecedor): Promise<Fornecedor> {
    const response = await fornecedorServiceInstance.update(id, data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Fornecedor;
  }

  /**
   * Excluir fornecedor
   */
  static async delete(id: number): Promise<void> {
    await fornecedorServiceInstance.delete(id);
  }
}

/**
 * Exportar também a instância do serviço para uso direto
 */
export const fornecedorService = fornecedorServiceInstance;

