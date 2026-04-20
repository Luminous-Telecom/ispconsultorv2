// Classe base para serviços de API
import { AxiosError } from 'axios';
import { ApiClient } from './ApiClient';
import { ErrorHandler } from './ErrorHandler';
import { ResponseTransformer } from './ResponseTransformer';
import { ApiResponse, PaginatedResponse } from 'types';

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
      const response = await this.apiClient.get<PaginatedResponse<TEntity>>(url);
      
      // O ApiClient.get retorna ApiResponse<T>
      // Mas quando T é PaginatedResponse, o backend já retorna { success: true, data: [...], pagination: {...} }
      // E o ResponseTransformer.normalize vê que já tem 'success', então retorna como está
      // Então response pode ser PaginatedResponse diretamente OU ApiResponse<PaginatedResponse>
      
      // Verificar se response já é PaginatedResponse (tem success, data, pagination)
      if (response && typeof response === 'object' && 'success' in response && 'data' in response && 'pagination' in response) {
        // response já é PaginatedResponse completo
        return response as PaginatedResponse<TEntity>;
      }
      
      // Se response.data existe e tem estrutura PaginatedResponse
      if (response.data && typeof response.data === 'object') {
        // Se response.data já é PaginatedResponse (tem data e pagination)
        if ('data' in response.data && 'pagination' in response.data) {
          // Verificar se tem success também (ApiResponse<PaginatedResponse>)
          if ('success' in response.data) {
            // É ApiResponse<PaginatedResponse>, extrair o inner data mantendo success
            const innerData = response.data as PaginatedResponse<TEntity>;
            return {
              success: true,
              data: innerData.data || [],
              pagination: innerData.pagination || {
                current_page: 1,
                per_page: 15,
                total: 0,
                last_page: 0,
                from: 0,
                to: 0,
              }
            } as PaginatedResponse<TEntity>;
          }
          // É PaginatedResponse direto sem success wrapper
          const paginatedData = response.data as PaginatedResponse<TEntity>;
          return {
            success: paginatedData.success ?? true,
            data: paginatedData.data || [],
            pagination: paginatedData.pagination || {
              current_page: 1,
              per_page: 15,
              total: 0,
              last_page: 0,
              from: 0,
              to: 0,
            }
          } as PaginatedResponse<TEntity>;
        }
      }
      
      // Fallback: se response.data não tem a estrutura esperada, tentar extrair manualmente
      const innerData = response.data || response;
      let data: TEntity[] = [];
      let pagination: Record<string, string | number | boolean | null | undefined | object> = {};
      let fullListFromBareArray = false;

      if (innerData && typeof innerData === 'object') {
        // Se innerData tem 'data' e 'pagination', é PaginatedResponse
        if ('data' in innerData && 'pagination' in innerData) {
          data = (innerData as PaginatedResponse<TEntity>).data || [];
          const pag = (innerData as PaginatedResponse<TEntity>).pagination;
          if (pag && typeof pag === 'object') {
            pagination = pag;
          }
        }
        // Se innerData é um array, usar diretamente (lista completa no payload — paginação/ordenação no front)
        else if (Array.isArray(innerData)) {
          data = innerData as TEntity[];
          fullListFromBareArray = true;
        }
        // Se innerData tem propriedades que parecem dados e paginação
        else if ('data' in innerData && Array.isArray((innerData as { data?: TEntity[] }).data)) {
          data = (innerData as { data: TEntity[] }).data;
          pagination = ('pagination' in innerData) ? (innerData as { pagination: Record<string, string | number | boolean | null | undefined | object> }).pagination : {};
        }
      }

      // APIs que devolvem só o array em `data` (ex.: GET /ssh-manager/devices) não enviam pagination;
      // sem `total === rows`, o useTable não ordena em memória.
      if (fullListFromBareArray) {
        const f = (filters ?? {}) as TFilters;
        const page = Math.max(1, Number(f.page) || 1);
        const limit = Math.min(500, Math.max(1, Number(f.limit) || 15));
        const total = data.length;
        const lastPage = Math.max(1, Math.ceil(total / limit) || 1);
        pagination = {
          current_page: page,
          per_page: limit,
          total,
          last_page: lastPage,
          from: total > 0 ? (page - 1) * limit + 1 : 0,
          to: Math.min(page * limit, total),
        };
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

