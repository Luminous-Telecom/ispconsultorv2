import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG } from '../../config/api';
import { ErrorHandler } from './ErrorHandler';
import { ResponseTransformer } from './ResponseTransformer';
import { ApiResponse } from '../../types';

export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export class ApiClient {
  private api: AxiosInstance;

  constructor(config?: ApiClientConfig) {
    const baseURL = config?.baseURL || API_CONFIG.BASE_URL || '/api';

    this.api = axios.create({
      baseURL,
      timeout: config?.timeout || API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      withCredentials: config?.withCredentials || false,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(
      (config) => {
        // Lista de rotas públicas que não precisam de autenticação
        const publicRoutes = [
          '/api/dados-empresa',
          '/api/dados-empresa/logo',
          '/api/auth/login',
          '/api/health',
          '/api/pagamento/',
        ];
        
        // Verificar se a URL é uma rota pública
        const url = (config.url || '').toLowerCase();
        const isPublicRoute = publicRoutes.some(route => url.includes(route.toLowerCase()));
        
        // Só adicionar token se não for rota pública
        if (isPublicRoute) {
          delete config.headers?.Authorization;
        } else {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        
        // Se for FormData, remover Content-Type para axios definir automaticamente com boundary
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        if (response.config.responseType === 'blob') {
          return response.data;
        }
        
        // Log para debug: verificar dados recebidos do backend
        if (response.config.url && (response.config.url.includes('/titulos') || response.config.url.includes('/dashboard'))) {
          const data = response.data?.data;
          if (data && Array.isArray(data) && data.length > 0) {
            const primeiroItem = data[0];
            if (primeiroItem.data_vencimento || primeiroItem.created_at) {
              console.log('DEBUG - ApiClient - Dados recebidos do backend:', {
                url: response.config.url,
                primeiro_item_id: primeiroItem.id,
                data_vencimento_raw: primeiroItem.data_vencimento,
                data_vencimento_type: typeof primeiroItem.data_vencimento,
                created_at_raw: primeiroItem.created_at,
                created_at_type: typeof primeiroItem.created_at,
                updated_at_raw: primeiroItem.updated_at,
                updated_at_type: typeof primeiroItem.updated_at,
              });
            }
          } else if (data && typeof data === 'object' && !Array.isArray(data)) {
            // Para dashboard que retorna objeto
            if (data.titulosRecentes && data.titulosRecentes.length > 0) {
              const primeiroTitulo = data.titulosRecentes[0];
              console.log('DEBUG - ApiClient - Dashboard recebido:', {
                url: response.config.url,
                titulo_id: primeiroTitulo.id,
                data_vencimento_raw: primeiroTitulo.data_vencimento,
                data_vencimento_type: typeof primeiroTitulo.data_vencimento,
                created_at_raw: primeiroTitulo.created_at,
                created_at_type: typeof primeiroTitulo.created_at,
              });
            }
          }
        }
        
        return response.data ?? {};
      },
      (error) => Promise.reject(error)
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get<T>(url, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  async post<T>(url: string, data?: AxiosRequestConfig['data'], config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post<T>(url, data, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  async put<T>(url: string, data?: AxiosRequestConfig['data'], config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put<T>(url, data, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  async patch<T>(url: string, data?: AxiosRequestConfig['data'], config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.patch<T>(url, data, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete<T>(url, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  async upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.api.post<T>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

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

export const defaultApiClient = new ApiClient();

export const setAuthToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('auth_token');
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};


