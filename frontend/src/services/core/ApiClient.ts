import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG } from 'config/api';
import { ErrorHandler } from './ErrorHandler';
import { ResponseTransformer } from './ResponseTransformer';
import { ApiResponse } from 'types';

export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export interface ApiRequestConfig extends AxiosRequestConfig {
  /** Força barra de loading mesmo em rotas públicas (operações longas). */
  forceLoading?: boolean;
}

// Interface para estender AxiosRequestConfig com propriedade customizada de loading
interface ExtendedAxiosRequestConfig extends ApiRequestConfig {
  __shouldShowLoading?: boolean;
}

const AUTH_HEADER_SKIP_ROUTES = [
  '/api/dados-empresa',
  '/api/dados-empresa/logo',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/email-recuperacao/confirmar',
  '/api/auth/2fa/verify',
  '/api/auth/2fa/email/send',
  '/api/auth/2fa/webauthn/login-options',
  '/api/auth/2fa/webauthn/login-verify',
  '/api/health',
  '/api/pagamento/',
  '/central-assinante/',
];

const LOADING_SKIP_ROUTES = [
  ...AUTH_HEADER_SKIP_ROUTES,
];

export class ApiClient {
  private api: AxiosInstance;
  private static loadingCallbacks: Set<(loading: boolean) => void> = new Set();
  private static activeRequests: number = 0;

  constructor(config?: ApiClientConfig) {
    const baseURL = config?.baseURL || API_CONFIG.BASE_URL || '/api';

    this.api = axios.create({
      baseURL,
      timeout: config?.timeout || API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      // withCredentials: true envia o cookie HttpOnly auth_token automaticamente
      withCredentials: config?.withCredentials !== undefined ? config.withCredentials : true,
    });

    this.setupInterceptors();
  }

  /**
   * Registra um callback para ser notificado sobre mudanças no estado de loading
   */
  static registerLoadingCallback(callback: (loading: boolean) => void): () => void {
    ApiClient.loadingCallbacks.add(callback);
    
    // Retorna função para desregistrar
    return () => {
      ApiClient.loadingCallbacks.delete(callback);
    };
  }

  /**
   * Atualiza o estado de loading e notifica todos os callbacks registrados
   */
  private static updateLoadingState(loading: boolean): void {
    ApiClient.loadingCallbacks.forEach(callback => {
      try {
        callback(loading);
      } catch {
        // Silenciosamente ignorar erros nos callbacks para não quebrar o fluxo
      }
    });
  }

  /**
   * Incrementa o contador de requisições ativas e atualiza o loading
   */
  private static incrementActiveRequests(): void {
    ApiClient.activeRequests++;
    if (ApiClient.activeRequests === 1) {
      ApiClient.updateLoadingState(true);
    }
  }

  /**
   * Decrementa o contador de requisições ativas e atualiza o loading
   */
  private static decrementActiveRequests(): void {
    ApiClient.activeRequests = Math.max(0, ApiClient.activeRequests - 1);
    if (ApiClient.activeRequests === 0) {
      ApiClient.updateLoadingState(false);
    }
  }

  private static shouldShowLoading(url: string, forceLoading?: boolean): boolean {
    if (forceLoading) {
      return true;
    }
    return !LOADING_SKIP_ROUTES.some((route) => url.includes(route.toLowerCase()));
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(
      (config) => {
        const url = (config.url || '').toLowerCase();
        const extendedConfig = config as ExtendedAxiosRequestConfig;
        const skipAuthHeader = AUTH_HEADER_SKIP_ROUTES.some((route) => url.includes(route.toLowerCase()));

        // Cookie HttpOnly (ERP ou SaaS) — não enviar Authorization herdado do storage.
        if (skipAuthHeader) {
          delete config.headers?.Authorization;
        }

        // Se for FormData, remover Content-Type para axios definir automaticamente com boundary
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }

        extendedConfig.__shouldShowLoading = ApiClient.shouldShowLoading(url, extendedConfig.forceLoading);

        if (extendedConfig.__shouldShowLoading) {
          ApiClient.incrementActiveRequests();
        }

        return config;
      },
      (error) => {
        // Em caso de erro na requisição, verificar se deve decrementar
        const config = error.config as ExtendedAxiosRequestConfig;
        if (config?.__shouldShowLoading) {
          ApiClient.decrementActiveRequests();
        }
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        // Decrementar contador apenas se a requisição estava marcada para mostrar loading
        const config = response.config as ExtendedAxiosRequestConfig;
        if (config?.__shouldShowLoading) {
          ApiClient.decrementActiveRequests();
        }
        
        if (response.config.responseType === 'blob') {
          return response.data;
        }
        return response.data ?? {};
      },
      (error) => {
        // Decrementar contador apenas se a requisição estava marcada para mostrar loading
        const config = error.config as ExtendedAxiosRequestConfig;
        if (config?.__shouldShowLoading) {
          ApiClient.decrementActiveRequests();
        }
        
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get<T>(url, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  async post<T>(url: string, data?: ApiRequestConfig['data'], config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post<T>(url, data, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  async put<T>(url: string, data?: ApiRequestConfig['data'], config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put<T>(url, data, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  async patch<T>(url: string, data?: ApiRequestConfig['data'], config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.patch<T>(url, data, config);
      return ResponseTransformer.normalize<T>(response);
    } catch (error) {
      throw ErrorHandler.processError(error as AxiosError);
    }
  }

  async delete<T>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
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

// Estas funções são mantidas por compatibilidade mas delegam para auth.ts (sessionStorage/memória).
// O token JWT real fica no cookie HttpOnly — inacessível ao JavaScript.
export { setAuthToken, removeAuthToken, getAuthToken } from './auth';


