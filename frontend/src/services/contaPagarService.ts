/**
 * ContaPagarService - Serviço para Contas a Pagar
 */
import { defaultApiClient } from './core';
import { ContaPagar, CreateContaPagar, UpdateContaPagar, ContaPagarFilters, PaginatedResponse, ApiResponse } from '../types';

/**
 * Classe de serviço para operações relacionadas a Contas a Pagar
 */
class ContaPagarServiceClass {
  protected apiClient = defaultApiClient;
  protected baseEndpoint = '/contas-pagar';

  /**
   * Listar contas a pagar com filtros e paginação
   */
  async list(filters: ContaPagarFilters = {}): Promise<PaginatedResponse<ContaPagar>> {
    try {
      const queryString = this.apiClient.buildQueryString(filters);
      const url = `${this.baseEndpoint}${queryString}`;
      const response = await this.apiClient.get<PaginatedResponse<ContaPagar>>(url);
      
      if (response && typeof response === 'object' && 'success' in response && 'data' in response && 'pagination' in response) {
        return response as PaginatedResponse<ContaPagar>;
      }
      
      if (response.data && typeof response.data === 'object' && 'data' in response.data && 'pagination' in response.data) {
        if ('success' in response.data) {
          const innerData = (response.data as { data?: ContaPagar[]; pagination?: Record<string, unknown> });
          return {
            data: innerData.data || [],
            pagination: innerData.pagination || {}
          } as PaginatedResponse<ContaPagar>;
        }
        return response.data as PaginatedResponse<ContaPagar>;
      }
      
      const innerData = response.data || response;
      let data: ContaPagar[] = [];
      let pagination: Record<string, string | number | boolean | null | undefined | object> = {};
      
      if (innerData && typeof innerData === 'object') {
        if ('data' in innerData && 'pagination' in innerData) {
          data = (innerData as PaginatedResponse<ContaPagar>).data || [];
          pagination = (innerData as PaginatedResponse<ContaPagar>).pagination || {};
        } else if (Array.isArray(innerData)) {
          data = innerData as ContaPagar[];
        } else if ('data' in innerData && Array.isArray((innerData as { data?: ContaPagar[] }).data)) {
          data = (innerData as { data: ContaPagar[] }).data;
          pagination = ('pagination' in innerData) ? (innerData as { pagination: Record<string, string | number | boolean | null | undefined | object> }).pagination : {};
        }
      }
      
      return {
        success: true,
        data,
        pagination
      } as PaginatedResponse<ContaPagar>;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar conta a pagar por ID
   */
  async getById(id: number): Promise<ApiResponse<ContaPagar>> {
    try {
      const url = `${this.baseEndpoint}/${id}`;
      const response = await this.apiClient.get<ContaPagar>(url);
      if (response && typeof response === 'object' && 'data' in response) {
        return response as ApiResponse<ContaPagar>;
      }
      return {
        success: true,
        data: response as unknown as ContaPagar
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Criar nova conta a pagar
   */
  async create(data: CreateContaPagar): Promise<ApiResponse<ContaPagar>> {
    try {
      const response = await this.apiClient.post<ContaPagar>(this.baseEndpoint, data);
      return {
        success: true,
        data: response as unknown as ContaPagar
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualizar conta a pagar
   */
  async update(id: number, data: UpdateContaPagar): Promise<ApiResponse<ContaPagar>> {
    try {
      const url = `${this.baseEndpoint}/${id}`;
      const response = await this.apiClient.put<ContaPagar>(url, data);
      return {
        success: true,
        data: response as unknown as ContaPagar
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Excluir conta a pagar
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

  /**
   * Pagar conta a pagar
   */
  async pagar(id: number, data: { data?: string; valor: number; tipo_pagamento: string; observacao?: string }): Promise<ApiResponse<ContaPagar>> {
    try {
      const url = `${this.baseEndpoint}/${id}/pagar`;
      const response = await this.apiClient.post<ContaPagar>(url, data);
      if (response && typeof response === 'object' && 'data' in response) {
        return response as ApiResponse<ContaPagar>;
      }
      return {
        success: true,
        data: response as unknown as ContaPagar
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Duplicar conta a pagar
   */
  async duplicar(id: number): Promise<ApiResponse<ContaPagar>> {
    try {
      const url = `${this.baseEndpoint}/${id}/duplicar`;
      const response = await this.apiClient.post<ContaPagar>(url);
      if (response && typeof response === 'object' && 'data' in response) {
        return response as ApiResponse<ContaPagar>;
      }
      return {
        success: true,
        data: response as unknown as ContaPagar
      };
    } catch (error) {
      throw error;
    }
  }
}

// Instância única do serviço
const contaPagarServiceInstance = new ContaPagarServiceClass();

/**
 * ContaPagarService - API estática para compatibilidade com código existente
 */
export class ContaPagarService {
  /**
   * Listar contas a pagar com filtros e paginação
   */
  static async list(filters: ContaPagarFilters = {}): Promise<PaginatedResponse<ContaPagar>> {
    return contaPagarServiceInstance.list(filters);
  }

  /**
   * Buscar conta a pagar por ID
   */
  static async getById(id: number): Promise<ContaPagar> {
    const response = await contaPagarServiceInstance.getById(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as ContaPagar;
  }

  /**
   * Criar nova conta a pagar
   */
  static async create(data: CreateContaPagar): Promise<ContaPagar> {
    const response = await contaPagarServiceInstance.create(data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as ContaPagar;
  }

  /**
   * Atualizar conta a pagar
   */
  static async update(id: number, data: UpdateContaPagar): Promise<ContaPagar> {
    const response = await contaPagarServiceInstance.update(id, data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as ContaPagar;
  }

  /**
   * Excluir conta a pagar
   */
  static async delete(id: number): Promise<void> {
    await contaPagarServiceInstance.delete(id);
  }

  /**
   * Pagar conta a pagar
   */
  static async pagar(id: number, data: { data?: string; valor: number; tipo_pagamento: string; observacao?: string }): Promise<ContaPagar> {
    const response = await contaPagarServiceInstance.pagar(id, data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as ContaPagar;
  }

  /**
   * Duplicar conta a pagar
   */
  static async duplicar(id: number): Promise<ContaPagar> {
    const response = await contaPagarServiceInstance.duplicar(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as ContaPagar;
  }
}

/**
 * Exportar também a instância do serviço para uso direto
 */
export const contaPagarService = contaPagarServiceInstance;

