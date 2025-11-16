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
        // Incluir tanto com /api quanto sem /api para garantir compatibilidade
        const publicRoutes = [
          '/dados-empresa',
          '/dados-empresa/logo',
          '/api/dados-empresa',
          '/api/dados-empresa/logo',
          '/auth/login',
          '/api/auth/login',
          '/health',
          '/api/health',
        ];
        
        // Verificar se a URL é uma rota pública
        // Extrair pathname de URLs completas ou usar URL relativa
        const url = config.url || '';
        const baseURL = config.baseURL || '';
        
        // Tentar extrair pathname se for URL completa
        let pathname = url;
        try {
          // Se a URL começa com http:// ou https://, extrair pathname
          if (url.startsWith('http://') || url.startsWith('https://')) {
            const urlObj = new URL(url);
            pathname = urlObj.pathname;
          } else if (baseURL && (baseURL.startsWith('http://') || baseURL.startsWith('https://'))) {
            // Se baseURL é completa, construir URL completa e extrair pathname
            const fullUrl = `${baseURL}${url}`;
            const urlObj = new URL(fullUrl);
            pathname = urlObj.pathname;
          } else {
            // URL relativa, usar como está
            pathname = url.startsWith('/') ? url : `/${url}`;
          }
        } catch {
          // Se falhar ao parsear, usar URL original
          pathname = url;
        }
        
        // Normalizar pathname (remover barras duplicadas e finais)
        const normalizePath = (p: string) => p.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
        const normalizedPath = normalizePath(pathname);
        
        const isPublicRoute = publicRoutes.some(route => {
          const normalizedRoute = normalizePath(route);
          // Verificar se o pathname corresponde à rota pública
          return normalizedPath === normalizedRoute ||
                 normalizedPath.endsWith(normalizedRoute) ||
                 normalizedPath.includes(normalizedRoute) ||
                 pathname.includes(route);
        });
        
        // Só adicionar token se não for rota pública
        if (!isPublicRoute) {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } else {
          // Remover token se for rota pública (caso tenha sido adicionado anteriormente)
          delete config.headers.Authorization;
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


