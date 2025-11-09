import { apiService } from './api';
import { AxiosError } from 'axios';
import type { ApiResponse } from '../types';

export interface ServidorEmail {
  id: number;
  host: string;
  porta: number;
  usuario: string;
  senha: string;
  ssl: boolean;
  tls: boolean;
  ativo: boolean;
  nome_remetente: string;
  email_remetente: string;
  timeout: number;
  tentativas: number;
  intervalo_tentativas: number;
  created_at: string;
  updated_at: string;
}

export interface CreateServidorEmail {
  host: string;
  porta: number;
  usuario: string;
  senha: string;
  ssl?: boolean;
  tls?: boolean;
  ativo?: boolean;
  nome_remetente: string;
  email_remetente: string;
  timeout?: number;
  tentativas?: number;
  intervalo_tentativas?: number;
}

export interface UpdateServidorEmail extends Partial<CreateServidorEmail> {}

export interface MensagemEmail {
  id?: number;
  tipo: string;
  tipo_envio: 'desativado' | 'pdf';
  mensagem_padrao: string;
  ativo: boolean;
}

const normalizeResponse = <T>(response: ApiResponse<T>, fallback: T): ApiResponse<T> => ({
  success: response.success,
  data: response.data ?? fallback,
  message: response.message ?? '',
  errors: response.errors,
});

export class ServidorEmailService {
  static async list(): Promise<ApiResponse<ServidorEmail[]>> {
    const response = await apiService.get<ServidorEmail[]>('/servidores-email');
    return normalizeResponse(response, []);
  }

  static async getById(id: number): Promise<ApiResponse<ServidorEmail>> {
    const response = await apiService.get<ServidorEmail>(`/servidores-email/${id}`);
    return normalizeResponse(response, {} as ServidorEmail);
  }

  static async getActive(): Promise<ApiResponse<ServidorEmail>> {
    const response = await apiService.get<ServidorEmail>('/servidores-email/ativo');
    return normalizeResponse(response, {} as ServidorEmail);
  }

  static async create(data: CreateServidorEmail): Promise<ApiResponse<ServidorEmail>> {
    const response = await apiService.post<ServidorEmail>('/servidores-email', data);
    return normalizeResponse(response, {} as ServidorEmail);
  }

  static async update(id: number, data: UpdateServidorEmail): Promise<ApiResponse<ServidorEmail>> {
    const response = await apiService.put<ServidorEmail>(`/servidores-email/${id}`, data);
    return normalizeResponse(response, {} as ServidorEmail);
  }

  static async delete(id: number): Promise<ApiResponse<void>> {
    const response = await apiService.delete<void>(`/servidores-email/${id}`);
    return {
      success: response.success,
      message: response.message ?? '',
      data: response.data,
      errors: response.errors,
    };
  }

  static async testConnection(id: number): Promise<ApiResponse<Record<string, unknown>>> {
    const response = await apiService.post<Record<string, unknown>>(`/servidores-email/${id}/test`);
    return normalizeResponse(response, {});
  }

  static async sendTestEmail(id: number, emailTeste: string): Promise<ApiResponse<void>> {
    const response = await apiService.post<void>(`/servidores-email/${id}/teste-email`, {
      email_teste: emailTeste
    });
    return {
      success: response.success,
      message: response.message ?? '',
      data: response.data,
      errors: response.errors,
    };
  }

  static async createOrUpdate(data: CreateServidorEmail): Promise<ApiResponse<ServidorEmail>> {
    const response = await apiService.post<ServidorEmail>('/servidores-email/configurar', data);
    return normalizeResponse(response, {} as ServidorEmail);
  }

  static async getMensagemByTipo(mensagemType: string): Promise<MensagemEmail | null> {
    try {
      const response = await apiService.get<MensagemEmail>(`/mensagens-email/tipo/${mensagemType}`);
      return response.data ?? null;
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      if (axiosError.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  static async saveMensagem(data: MensagemEmail): Promise<ApiResponse<MensagemEmail>> {
    const response = await apiService.post<MensagemEmail>('/mensagens-email', data);
    return normalizeResponse(response, {} as MensagemEmail);
  }
}
