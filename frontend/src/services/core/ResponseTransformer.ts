// Transformação de respostas da API
import { AxiosResponse } from 'axios';
import { ApiResponse, PaginatedResponse } from '@/types';

/**
 * Classe para transformar respostas da API em formatos padronizados
 */
export class ResponseTransformer {
  /**
   * Transforma uma resposta genérica em formato ApiResponse
   */
  static toApiResponse<T>(response: AxiosResponse<T> | T): ApiResponse<T> {
    // Se já for um objeto ApiResponse, retornar como está
    if (response && typeof response === 'object' && 'success' in response) {
      return response as ApiResponse<T>;
    }

    // Se for AxiosResponse, extrair o data
    const data = (response as AxiosResponse<T>)?.data || (response as T);
    
    return {
      success: true,
      data: data as T,
      message: '',
    };
  }

  /**
   * Transforma uma resposta em formato paginado
   */
  static toPaginatedResponse<T>(
    response: AxiosResponse<PaginatedResponse<T>> | PaginatedResponse<T> | { data: T[]; pagination: Record<string, string | number | boolean | null | undefined | object> }
  ): PaginatedResponse<T> {
    // Se já for PaginatedResponse, retornar como está
    if (response && typeof response === 'object') {
      const resp = response as { data?: T[]; pagination?: Record<string, string | number | boolean | null | undefined | object> };
      
      if ('data' in resp && 'pagination' in resp) {
        const pagination = resp.pagination as { current_page?: number; per_page?: number; total?: number; last_page?: number; from?: number; to?: number };
        return {
          success: true,
          data: (resp.data || []) as T[],
          pagination: {
            current_page: pagination.current_page ?? 1,
            per_page: pagination.per_page ?? 15,
            total: pagination.total ?? 0,
            last_page: pagination.last_page ?? 0,
            from: pagination.from ?? 0,
            to: pagination.to ?? 0,
          },
        } as PaginatedResponse<T>;
      }

      // Se for AxiosResponse, extrair o data
      if ('data' in resp && typeof (resp as AxiosResponse).data === 'object') {
        const axiosResp = response as AxiosResponse<PaginatedResponse<T>>;
        return this.toPaginatedResponse(axiosResp.data);
      }
    }

    // Retornar formato padrão se não conseguir transformar
    return {
      success: true,
      data: [],
      pagination: {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 0,
        from: 0,
        to: 0,
      },
    };
  }

  /**
   * Normaliza uma resposta para sempre ter formato ApiResponse
   */
  static normalize<T>(response: AxiosResponse<T> | T | ApiResponse<T>): ApiResponse<T> {
    // Se já for ApiResponse
    if (response && typeof response === 'object' && 'success' in response) {
      return response as ApiResponse<T>;
    }

    // Se for AxiosResponse
    if (response && typeof response === 'object' && 'data' in response && 'status' in response) {
      const axiosResp = response as AxiosResponse<T>;
      return this.toApiResponse(axiosResp);
    }

    // Se for apenas os dados
    return {
      success: true,
      data: response as T,
      message: '',
    };
  }

  /**
   * Extrai apenas os dados de uma resposta
   */
  static extractData<T>(response: AxiosResponse<T> | ApiResponse<T> | T): T {
    // Se for ApiResponse, retornar data
    if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
      const apiResp = response as ApiResponse<T>;
      return (apiResp.data ?? apiResp) as T;
    }

    // Se for AxiosResponse, extrair data
    if (response && typeof response === 'object' && 'data' in response && 'status' in response && 'statusText' in response) {
      return (response as AxiosResponse<T>).data;
    }

    // Se for apenas os dados, retornar como está
    return response as T;
  }
}

