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
        const url = config.url || '';
        const baseURL = config.baseURL || '';
        
        // Construir string de URL completa para verificação
        let urlToCheck = url;
        
        // Se a URL não é completa e há baseURL, combinar
        if (!url.startsWith('http://') && !url.startsWith('https://') && baseURL) {
          const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
          const path = url.startsWith('/') ? url : `/${url}`;
          urlToCheck = `${base}${path}`;
        }
        
        // Extrair apenas o pathname para verificação (remover protocolo, host, query params)
        let pathname = urlToCheck;
        try {
          if (urlToCheck.startsWith('http://') || urlToCheck.startsWith('https://')) {
            const urlObj = new URL(urlToCheck);
            pathname = urlObj.pathname;
          } else {
            // Remover query params se houver
            pathname = urlToCheck.split('?')[0];
          }
        } catch {
          // Se falhar, remover query params manualmente
          pathname = urlToCheck.split('?')[0];
        }
        
        // Normalizar pathname
        pathname = pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
        
        // Verificar se é rota pública
        // Primeiro verificar diretamente na URL completa (para URLs absolutas)
        const urlString = urlToCheck.toLowerCase();
        const isPublicRouteByUrl = publicRoutes.some(route => {
          return urlString.includes(route.toLowerCase()) || 
                 urlString.includes(`/api${route.toLowerCase()}`);
        });
        
        // Depois verificar pelo pathname normalizado
        const isPublicRouteByPath = publicRoutes.some(route => {
          const normalizedRoute = route.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
          // Verificar correspondência exata ou se pathname contém a rota
          return pathname === normalizedRoute ||
                 pathname === `/${normalizedRoute}` ||
                 pathname.endsWith(`/${normalizedRoute}`) ||
                 pathname.includes(`/${normalizedRoute}/`) ||
                 pathname.includes(`/${normalizedRoute}`);
        });
        
        const isPublicRoute = isPublicRouteByUrl || isPublicRouteByPath;
        
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


