// Classe base para serviços de API
import { AxiosError } from 'axios';
import { ApiClient } from './ApiClient';
import { ErrorHandler } from './ErrorHandler';
import { ResponseTransformer } from './ResponseTransformer';
import { ApiResponse, PaginatedResponse } from '@/types';

/**
 * Interface para filtros genéricos
 */
export interface BaseFilters extends Record<string, string | number | boolean | null | undefined> {
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Classe base abstrata para serviços de API
 */
export abstract class BaseService<TEntity, TCreateData, TUpdateData, TFilters extends BaseFilters = BaseFilters> {
  protected apiClient: ApiClient;
  protected baseEndpoint: string;

  constructor(apiClient: ApiClient, baseEndpoint: string) {
    this.apiClient = apiClient;
    this.baseEndpoint = baseEndpoint;
  }

  /**
   * Lista entidades com filtros e paginação
   */
  async list(filters?: TFilters): Promise<PaginatedResponse<TEntity>> {
    try {
      const queryString = this.apiClient.buildQueryString(filters || {});
      const url = `${this.baseEndpoint}${queryString}`;
      // O backend pode retornar PaginatedResponse diretamente ou dentro de ApiResponse
      // Passamos o tipo esperado do backend (que pode ser objeto com data e pagination)
      // ApiClient.get sempre retorna ApiResponse<T>, então se T for PaginatedResponse,
      // a resposta será ApiResponse<PaginatedResponse<TEntity>>
      const response = await this.apiClient.get<PaginatedResponse<TEntity>>(url);
      
      // ApiClient.get retorna ApiResponse<T>
      // O interceptor do axios retorna response.data diretamente
      // O ResponseTransformer.normalize envolve em ApiResponse
      // Então response é { success: true, data: { success: true, data: [...], pagination: {...} } }
      
      // Verificar se response já é PaginatedResponse (tem success, data, pagination)
      if (response && typeof response === 'object' && 'success' in response && 'data' in response && 'pagination' in response) {
        // response já é PaginatedResponse
        return response as PaginatedResponse<TEntity>;
      }
      
      // Se response.data existe e tem estrutura PaginatedResponse
      if (response.data && typeof response.data === 'object') {
        // Se response.data já é PaginatedResponse (tem data e pagination)
        if ('data' in response.data && 'pagination' in response.data) {
          // Verificar se tem success também (ApiResponse<PaginatedResponse>)
          if ('success' in response.data) {
            // É ApiResponse<PaginatedResponse>, extrair o inner data
            const innerData = (response.data as { data?: TEntity[]; pagination?: Record<string, unknown> });
            return {
              data: innerData.data || [],
              pagination: innerData.pagination || {}
            } as PaginatedResponse<TEntity>;
          }
          // É PaginatedResponse direto
          return response.data as PaginatedResponse<TEntity>;
        }
      }
      
      // Fallback: se response.data não tem a estrutura esperada, tentar extrair manualmente
      const innerData = response.data || response;
      let data: TEntity[] = [];
      let pagination: Record<string, string | number | boolean | null | undefined | object> = {};
      
      if (innerData && typeof innerData === 'object') {
        // Se innerData tem 'data' e 'pagination', é PaginatedResponse
        if ('data' in innerData && 'pagination' in innerData) {
          data = (innerData as PaginatedResponse<TEntity>).data || [];
          pagination = (innerData as PaginatedResponse<TEntity>).pagination || {};
        } 
        // Se innerData é um array, usar diretamente
        else if (Array.isArray(innerData)) {
          data = innerData as TEntity[];
        }
        // Se innerData tem propriedades que parecem dados e paginação
        else if ('data' in innerData && Array.isArray((innerData as { data?: TEntity[] }).data)) {
          data = (innerData as { data: TEntity[] }).data;
          pagination = ('pagination' in innerData) ? (innerData as { pagination: Record<string, string | number | boolean | null | undefined | object> }).pagination : {};
        }
      }
      
      // Transformar para formato PaginatedResponse garantido
      return ResponseTransformer.toPaginatedResponse<TEntity>({ data, pagination });
    } catch (error) {
      const apiError = ErrorHandler.processError(error as AxiosError);
      throw apiError;
    }
  }

  /**
   * Busca uma entidade por ID
   */
  async getById(id: number): Promise<ApiResponse<TEntity>> {
    try {
      const url = `${this.baseEndpoint}/${id}`;
      const response = await this.apiClient.get<TEntity>(url);
      // O ApiClient já retorna ApiResponse<T>, então só precisamos normalizar
      return ResponseTransformer.normalize<TEntity>(response);
    } catch (error) {
      const apiError = ErrorHandler.processError(error as AxiosError);
      throw apiError;
    }
  }

  /**
   * Cria uma nova entidade
   */
  async create(data: TCreateData): Promise<ApiResponse<TEntity>> {
    try {
      const response = await this.apiClient.post<TEntity>(this.baseEndpoint, data);
      // O ApiClient já retorna ApiResponse<T>, então só precisamos normalizar
      return ResponseTransformer.normalize<TEntity>(response);
    } catch (error) {
      const apiError = ErrorHandler.processError(error as AxiosError);
      throw apiError;
    }
  }

  /**
   * Atualiza uma entidade existente
   */
  async update(id: number, data: TUpdateData): Promise<ApiResponse<TEntity>> {
    try {
      const url = `${this.baseEndpoint}/${id}`;
      const response = await this.apiClient.put<TEntity>(url, data);
      // O ApiClient já retorna ApiResponse<T>, então só precisamos normalizar
      return ResponseTransformer.normalize<TEntity>(response);
    } catch (error) {
      const apiError = ErrorHandler.processError(error as AxiosError);
      throw apiError;
    }
  }

  /**
   * Deleta uma entidade
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      const url = `${this.baseEndpoint}/${id}`;
      const response = await this.apiClient.delete<void>(url);
      // O ApiClient já retorna ApiResponse<T>, então só precisamos normalizar
      return ResponseTransformer.normalize<void>(response);
    } catch (error) {
      const apiError = ErrorHandler.processError(error as AxiosError);
      throw apiError;
    }
  }

  /**
   * Método para permitir que serviços específicos adicionem métodos customizados
   */
  protected async customGet<T>(endpoint: string, config?: Record<string, string | number | boolean | null | undefined>): Promise<ApiResponse<T>> {
    try {
      const queryString = this.apiClient.buildQueryString(config || {});
      const url = `${this.baseEndpoint}${endpoint}${queryString}`;
      const response = await this.apiClient.get<T>(url);
      // O ApiClient já retorna ApiResponse<T>, então só precisamos normalizar
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      const apiError = ErrorHandler.processError(error as AxiosError);
      throw apiError;
    }
  }

  /**
   * Método para permitir que serviços específicos adicionem métodos customizados POST
   */
  protected async customPost<T>(endpoint: string, data?: Record<string, string | number | boolean | null | undefined | object>): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseEndpoint}${endpoint}`;
      const response = await this.apiClient.post<T>(url, data);
      // O ApiClient já retorna ApiResponse<T>, então só precisamos normalizar
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      const apiError = ErrorHandler.processError(error as AxiosError);
      throw apiError;
    }
  }
}

