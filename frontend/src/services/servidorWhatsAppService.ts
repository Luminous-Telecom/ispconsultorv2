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

export interface MensagemWhatsApp {
  id?: number;
  tipo: string;
  tipo_envio: 'desativado' | 'pdf';
  mensagem_padrao: string;
  interacao1?: string;
  interacao2?: string;
  interacao3?: string;
  ativo: boolean;
}

export class ServidorWhatsAppService {
  static async getByTipo(mensagemType: string): Promise<MensagemWhatsApp | null> {
    try {
      const response = await apiService.get<{ success: boolean; data: MensagemWhatsApp }>(`/mensagens-whatsapp/tipo/${mensagemType}`);
      return response.data;
    } catch (error: unknown) {
      const errorResponse = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { status?: number } }).response 
        : null;
      if (errorResponse?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  static async saveMensagem(data: MensagemWhatsApp): Promise<{ success: boolean; message: string; data: MensagemWhatsApp }> {
    const response = await apiService.post<{ success: boolean; message: string; data: MensagemWhatsApp }>('/mensagens-whatsapp', data);
    return response;
  }

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
    } catch (error: unknown) {
      // Se não há servidor ativo, retornar null
      const errorResponse = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { status?: number } }).response 
        : null;
      if (errorResponse?.status === 404) {
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

  static async sendTestMessage(id: number, phone: string, message: string): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
    const response = await apiService.post<{ success: boolean; message: string; data?: Record<string, unknown> }>(`/servidores-whatsapp/${id}/enviar-mensagem-teste`, {
      phone,
      message
    });
    return response;
  }
}
