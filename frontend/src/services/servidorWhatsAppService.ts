import { apiService } from './api';

export interface ServidorWhatsApp {
  id: number;
  evolution_api_url: string;
  evolution_api_key: string;
  instance_name: string;
  qr_code?: string;
  status_conexao: 'disconnected' | 'connecting' | 'connected' | 'qr_required';
  webhook_url?: string;
  webhook_events?: string;
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
  evolution_api_url: string;
  evolution_api_key: string;
  instance_name: string;
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

export class ServidorWhatsAppService {
  static async list(): Promise<{ success: boolean; data: ServidorWhatsApp[]; message: string }> {
    const response = await apiService.get<{ success: boolean; data: ServidorWhatsApp[]; message: string }>('/servidores-whatsapp');
    return response;
  }

  static async getById(id: number): Promise<{ success: boolean; data: ServidorWhatsApp; message: string }> {
    const response = await apiService.get<{ success: boolean; data: ServidorWhatsApp; message: string }>(`/servidores-whatsapp/${id}`);
    return response;
  }

  static async getActive(): Promise<{ success: boolean; data: ServidorWhatsApp; message: string } | null> {
    try {
      const response = await apiService.get<{ success: boolean; data: ServidorWhatsApp; message: string }>('/servidores-whatsapp/ativo');
      return response;
    } catch (error: any) {
      // Se não há servidor ativo, retornar null
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  static async create(data: CreateServidorWhatsApp): Promise<{ success: boolean; data: ServidorWhatsApp; message: string }> {
    const response = await apiService.post<{ success: boolean; data: ServidorWhatsApp; message: string }>('/servidores-whatsapp', data);
    return response;
  }

  static async update(id: number, data: UpdateServidorWhatsApp): Promise<{ success: boolean; data: ServidorWhatsApp; message: string }> {
    const response = await apiService.put<{ success: boolean; data: ServidorWhatsApp; message: string }>(`/servidores-whatsapp/${id}`, data);
    return response;
  }

  static async delete(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete<{ success: boolean; message: string }>(`/servidores-whatsapp/${id}`);
    return response;
  }

  static async createOrUpdate(data: CreateServidorWhatsApp): Promise<{ success: boolean; data: ServidorWhatsApp; message: string }> {
    const response = await apiService.post<{ success: boolean; data: ServidorWhatsApp; message: string }>('/servidores-whatsapp/configurar', data);
    return response;
  }

  static async connectInstance(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<{ success: boolean; message: string }>(`/servidores-whatsapp/${id}/conectar`);
    return response;
  }

  static async sendTestMessage(id: number, phone: string, message: string): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await apiService.post<{ success: boolean; message: string; data?: any }>(`/servidores-whatsapp/${id}/enviar-mensagem-teste`, {
      phone,
      message
    });
    return response;
  }
}
