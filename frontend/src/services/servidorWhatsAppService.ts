import { apiService } from './api';
import { AxiosError } from 'axios';
import type { ApiResponse } from '../types';

export interface ServidorWhatsApp {
  id: number;
  tipo_api: 'evolution' | 'whatsapp_cloud';
  evolution_api_url: string;
  evolution_api_key: string;
  instance_name: string;
  qr_code?: string;
  status_conexao: 'disconnected' | 'connecting' | 'connected' | 'qr_required';
  webhook_url?: string;
  webhook_events?: string;
  whatsapp_cloud_token?: string;
  whatsapp_cloud_phone_number_id?: string;
  whatsapp_cloud_business_account_id?: string;
  template_mapping?: string;
  ativo: boolean;
  notificacoes_automaticas: boolean;
  timeout: number;
  tentativas: number;
  intervalo_tentativas: number;
  configuracao_extra?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateServidorWhatsApp {
  tipo_api?: 'evolution' | 'whatsapp_cloud';
  evolution_api_url?: string;
  evolution_api_key?: string;
  instance_name?: string;
  whatsapp_cloud_token?: string;
  whatsapp_cloud_phone_number_id?: string;
  whatsapp_cloud_business_account_id?: string;
  template_mapping?: string;
  webhook_url?: string;
  webhook_events?: string;
  ativo?: boolean;
  notificacoes_automaticas?: boolean;
  timeout?: number;
  tentativas?: number;
  intervalo_tentativas?: number;
  configuracao_extra?: string;
}

export interface UpdateServidorWhatsApp extends Partial<CreateServidorWhatsApp> {}

export interface MensagemWhatsApp {
  id?: number;
  tipo: string;
  tipo_envio: 'desativado' | 'pdf';
  mensagem_padrao: string;
  mensagem_manual?: string;
  interacao1?: string;
  interacao2?: string;
  interacao3?: string;
  template_mapping?: string;
  ativo: boolean;
}

const normalizeResponse = <T>(response: ApiResponse<T>, fallback: T): ApiResponse<T> => ({
  success: response.success,
  data: response.data ?? fallback,
  message: response.message ?? '',
  errors: response.errors,
});

export class ServidorWhatsAppService {
  static async getByTipo(mensagemType: string): Promise<MensagemWhatsApp | null> {
    try {
      const response = await apiService.get<MensagemWhatsApp>(`/mensagens-whatsapp/tipo/${mensagemType}`);
      return response.data ?? null;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string; type?: string }> & { type?: string };
      // Se for 404 ou NOT_FOUND_ERROR, retornar null (mensagem não configurada)
      if (axiosError.response?.status === 404 || 
          axiosError.type === 'NOT_FOUND_ERROR' ||
          axiosError.response?.data?.message?.includes('não encontrado')) {
        return null;
      }
      // Para outros erros, verificar se é erro de autenticação antes de lançar
      if (axiosError.response?.status === 401) {
        throw error;
      }
      // Para erros diferentes de autenticação, retornar null (tratar como não configurado)
      return null;
    }
  }

  static async saveMensagem(data: MensagemWhatsApp): Promise<ApiResponse<MensagemWhatsApp>> {
    const response = await apiService.post<MensagemWhatsApp>('/mensagens-whatsapp', data);
    return normalizeResponse(response, {} as MensagemWhatsApp);
  }

  static async list(): Promise<ApiResponse<ServidorWhatsApp[]>> {
    const response = await apiService.get<ServidorWhatsApp[]>('/servidores-whatsapp');
    return normalizeResponse(response, []);
  }

  static async getById(id: number): Promise<ApiResponse<ServidorWhatsApp>> {
    const response = await apiService.get<ServidorWhatsApp>(`/servidores-whatsapp/${id}`);
    return normalizeResponse(response, {} as ServidorWhatsApp);
  }

  static async getActive(): Promise<ApiResponse<ServidorWhatsApp> | null> {
    try {
      const response = await apiService.get<ServidorWhatsApp>('/servidores-whatsapp/ativo');
      return normalizeResponse(response, {} as ServidorWhatsApp);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string; type?: string }> & { type?: string };
      // Se for 404, retornar resposta vazia (servidor não configurado)
      if (axiosError.response?.status === 404 || axiosError.type === 'NOT_FOUND_ERROR') {
        return { success: true, data: null as unknown as ServidorWhatsApp };
      }
      throw error;
    }
  }

  static async create(data: CreateServidorWhatsApp): Promise<ApiResponse<ServidorWhatsApp>> {
    const response = await apiService.post<ServidorWhatsApp>('/servidores-whatsapp', data);
    return normalizeResponse(response, {} as ServidorWhatsApp);
  }

  static async update(id: number, data: UpdateServidorWhatsApp): Promise<ApiResponse<ServidorWhatsApp>> {
    const response = await apiService.put<ServidorWhatsApp>(`/servidores-whatsapp/${id}`, data);
    return normalizeResponse(response, {} as ServidorWhatsApp);
  }

  static async delete(id: number): Promise<ApiResponse<void>> {
    const response = await apiService.delete<void>(`/servidores-whatsapp/${id}`);
    return {
      success: response.success,
      message: response.message ?? '',
      data: response.data,
      errors: response.errors,
    };
  }

  static async createOrUpdate(data: CreateServidorWhatsApp): Promise<ApiResponse<ServidorWhatsApp>> {
    const response = await apiService.post<ServidorWhatsApp>('/servidores-whatsapp/configurar', data);
    return normalizeResponse(response, {} as ServidorWhatsApp);
  }

  static async connectInstance(id: number): Promise<ApiResponse<void>> {
    const response = await apiService.post<void>(`/servidores-whatsapp/${id}/conectar`);
    return {
      success: response.success,
      message: response.message ?? '',
      data: response.data,
      errors: response.errors,
    };
  }

  static async sendTestMessage(id: number, phone: string, message: string): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
    try {
      const response = await apiService.post<Record<string, unknown>>(`/servidores-whatsapp/${id}/enviar-mensagem-teste`, {
        phone,
        message
      });
      return {
        success: response.success,
        message: response.message ?? 'Mensagem enviada com sucesso.',
        data: response.data,
      };
    } catch {
      throw new Error('Não foi possível enviar a mensagem de teste. Verifique as configurações do servidor e tente novamente.');
    }
  }
}
