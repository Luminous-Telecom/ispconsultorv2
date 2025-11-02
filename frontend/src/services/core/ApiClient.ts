// Cliente HTTP unificado para serviços de API
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG } from '../../config/api';
import { ErrorHandler } from './ErrorHandler';
import { ResponseTransformer } from './ResponseTransformer';
import { ApiResponse } from '../../types';

/**
 * Configurações do cliente HTTP
 */
export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

/**
 * Classe para cliente HTTP unificado
 */
export class ApiClient {
  private api: AxiosInstance;

  constructor(config?: ApiClientConfig) {
    this.api = axios.create({
      baseURL: config?.baseURL || API_CONFIG.BASE_URL,
      timeout: config?.timeout || API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      withCredentials: config?.withCredentials || false,
    });

    this.setupInterceptors();
  }

  /**
   * Configura interceptors de request e response
   */
  private setupInterceptors(): void {
    // Interceptor de request
    this.api.interceptors.request.use(
      (config) => {
        // Adicionar token de autenticação se existir
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor de response
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        // Para responseType 'blob', retornar diretamente o data
        if (response.config.responseType === 'blob') {
          return response.data;
        }
        
        // Para outros tipos, garantir que sempre retornamos um valor válido
        const data = response.data;
        if (data === undefined || data === null) {
          return {};
        }
        return data;
      },
      (error) => {
        // Tratamento de erro 401 (não autenticado) já está no ErrorHandler
        // Aqui apenas rejeitamos para que o ErrorHandler processe
        return Promise.reject(error);
      }
    );
  }

  /**
   * Método GET genérico
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get<T>(url, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  /**
   * Método POST genérico
   */
  async post<T>(url: string, data?: AxiosRequestConfig['data'], config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post<T>(url, data, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  /**
   * Método PUT genérico
   */
  async put<T>(url: string, data?: AxiosRequestConfig['data'], config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put<T>(url, data, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  /**
   * Método PATCH genérico
   */
  async patch<T>(url: string, data?: AxiosRequestConfig['data'], config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.patch<T>(url, data, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  /**
   * Método DELETE genérico
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete<T>(url, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  /**
   * Método para upload de arquivos
   */
  async upload<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.api.post<T>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });

      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  /**
   * Método para construir query string de parâmetros
   */
  buildQueryString(params: Record<string, string | number | boolean | null | undefined>): string {
    const searchParams = new URLSearchParams();
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }
}

// Instância padrão do cliente API
export const defaultApiClient = new ApiClient();

// Funções utilitárias para gerenciamento de token
export const setAuthToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('auth_token');
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

