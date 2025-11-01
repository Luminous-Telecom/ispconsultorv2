import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
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
              
              // Log para debugging
              if (config.url?.includes('pdf-teste-conteudo')) {
                console.log('DEBUG [apiService]: Request URL:', config.url);
                console.log('DEBUG [apiService]: Request method:', config.method);
                console.log('DEBUG [apiService]: Request data:', config.data);
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
              // Log para debugging
              if (response.config.url?.includes('pdf-teste-conteudo')) {
                console.log('DEBUG [apiService Response]: Status:', response.status);
                console.log('DEBUG [apiService Response]: responseType:', response.config.responseType);
                console.log('DEBUG [apiService Response]: data type:', typeof response.data);
              }
              
              // Para responseType 'blob', retornar diretamente o data (que já é o Blob)
              if (response.config.responseType === 'blob') {
                return response.data;
              }
              
              // Para outros tipos de resposta, garantir que sempre retornamos um valor válido
              const data = response.data;
              if (data === undefined || data === null) {
                return {};
              }
              return data;
            },
            (error) => {
              // Log para debugging
              if (error.config?.url?.includes('pdf-teste-conteudo')) {
                console.error('DEBUG [apiService Error]:', error.response?.status, error.response?.data);
              }
              
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
  async get<T>(url: string, params?: AxiosRequestConfig['params'], config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.get(url, { params, ...config });
    return response as T;
  }

  async post<T>(url: string, data?: AxiosRequestConfig['data'], config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.post(url, data, config);
    return response as T;
  }

  async put<T>(url: string, data?: AxiosRequestConfig['data'], config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.put(url, data, config);
    return response as T;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete(url);
    return response as T;
  }

  async patch<T>(url: string, data?: AxiosRequestConfig['data']): Promise<T> {
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
