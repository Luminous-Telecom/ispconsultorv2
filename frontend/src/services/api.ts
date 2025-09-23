import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '../types';
import { API_CONFIG } from '../config/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para requests
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

    // Interceptor para responses
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        // Garantir que sempre retornamos um valor válido
        const data = response.data;
        if (data === undefined || data === null) {
          console.warn('API response data is undefined/null:', response);
          return {};
        }
        return data;
      },
      (error) => {
        // Tratar erros globais
        if (error.response?.status === 401) {
          // Token expirado ou inválido
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Métodos HTTP genéricos
  async get<T>(url: string, params?: any, config?: any): Promise<T> {
    const response = await this.api.get(url, { params, ...config });
    return response as T;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.post(url, data);
    return response as T;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.put(url, data);
    return response as T;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete(url);
    return response as T;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.patch(url, data);
    return response as T;
  }

  // Métodos específicos para upload
  async upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post(url, formData, {
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

    return response as unknown as ApiResponse<T>;
  }
}

// Instância única do serviço
export const apiService = new ApiService();

// Função para configurar token de autenticação
export const setAuthToken = (token: string) => {
  localStorage.setItem('auth_token', token);
};

// Função para remover token de autenticação
export const removeAuthToken = () => {
  localStorage.removeItem('auth_token');
};

// Função para obter token de autenticação
export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};
