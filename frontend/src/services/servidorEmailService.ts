import { apiService } from './api';

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

export class ServidorEmailService {
  static async list(): Promise<{ success: boolean; data: ServidorEmail[]; message: string }> {
    const response = await apiService.get<{ success: boolean; data: ServidorEmail[]; message: string }>('/servidores-email');
    return response;
  }

  static async getById(id: number): Promise<{ success: boolean; data: ServidorEmail; message: string }> {
    const response = await apiService.get<{ success: boolean; data: ServidorEmail; message: string }>(`/servidores-email/${id}`);
    return response;
  }

  static async getActive(): Promise<{ success: boolean; data: ServidorEmail; message: string }> {
    const response = await apiService.get<{ success: boolean; data: ServidorEmail; message: string }>('/servidores-email/ativo');
    return response;
  }

  static async create(data: CreateServidorEmail): Promise<{ success: boolean; data: ServidorEmail; message: string }> {
    const response = await apiService.post<{ success: boolean; data: ServidorEmail; message: string }>('/servidores-email', data);
    return response;
  }

  static async update(id: number, data: UpdateServidorEmail): Promise<{ success: boolean; data: ServidorEmail; message: string }> {
    const response = await apiService.put<{ success: boolean; data: ServidorEmail; message: string }>(`/servidores-email/${id}`, data);
    return response;
  }

  static async delete(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete<{ success: boolean; message: string }>(`/servidores-email/${id}`);
    return response;
  }

  static async testConnection(id: number): Promise<{ success: boolean; message: string; details?: Record<string, unknown> }> {
    const response = await apiService.post<{ success: boolean; message: string; details?: Record<string, unknown> }>(`/servidores-email/${id}/test`);
    return response;
  }

  static async sendTestEmail(id: number, emailTeste: string): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<{ success: boolean; message: string }>(`/servidores-email/${id}/teste-email`, {
      email_teste: emailTeste
    });
    return response;
  }

  static async createOrUpdate(data: CreateServidorEmail): Promise<{ success: boolean; data: ServidorEmail; message: string }> {
    const response = await apiService.post<{ success: boolean; data: ServidorEmail; message: string }>('/servidores-email/configurar', data);
    return response;
  }

  static async getMensagemByTipo(mensagemType: string): Promise<MensagemEmail | null> {
    try {
      const response = await apiService.get<{ success: boolean; data: MensagemEmail }>(`/mensagens-email/tipo/${mensagemType}`);
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

  static async saveMensagem(data: MensagemEmail): Promise<{ success: boolean; message: string; data: MensagemEmail }> {
    const response = await apiService.post<{ success: boolean; message: string; data: MensagemEmail }>('/mensagens-email', data);
    return response;
  }
}
