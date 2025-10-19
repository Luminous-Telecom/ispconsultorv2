import { apiService } from './api';

export interface ServidorSMS {
  id: number;
  provedor: string;
  api_key: string;
  api_secret?: string;
  sender_id: string;
  webhook_url?: string;
  ativo: boolean;
  timeout: number;
  tentativas: number;
  intervalo_tentativas: number;
  configuracao_extra?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateServidorSMS {
  provedor: string;
  api_key: string;
  api_secret?: string;
  sender_id: string;
  webhook_url?: string;
  ativo?: boolean;
  timeout?: number;
  tentativas?: number;
  intervalo_tentativas?: number;
  configuracao_extra?: string;
}

export interface UpdateServidorSMS extends Partial<CreateServidorSMS> {}

export class ServidorSMSService {
  static async list(): Promise<{ success: boolean; data: ServidorSMS[]; message: string }> {
    const response = await apiService.get<{ success: boolean; data: ServidorSMS[]; message: string }>('/servidores-sms');
    return response;
  }

  static async getById(id: number): Promise<{ success: boolean; data: ServidorSMS; message: string }> {
    const response = await apiService.get<{ success: boolean; data: ServidorSMS; message: string }>(`/servidores-sms/${id}`);
    return response;
  }

  static async getActive(): Promise<{ success: boolean; data: ServidorSMS; message: string }> {
    const response = await apiService.get<{ success: boolean; data: ServidorSMS; message: string }>('/servidores-sms/ativo');
    return response;
  }

  static async create(data: CreateServidorSMS): Promise<{ success: boolean; data: ServidorSMS; message: string }> {
    const response = await apiService.post<{ success: boolean; data: ServidorSMS; message: string }>('/servidores-sms', data);
    return response;
  }

  static async update(id: number, data: UpdateServidorSMS): Promise<{ success: boolean; data: ServidorSMS; message: string }> {
    const response = await apiService.put<{ success: boolean; data: ServidorSMS; message: string }>(`/servidores-sms/${id}`, data);
    return response;
  }

  static async delete(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete<{ success: boolean; message: string }>(`/servidores-sms/${id}`);
    return response;
  }

  static async testConnection(id: number): Promise<{ success: boolean; message: string; details?: any }> {
    const response = await apiService.post<{ success: boolean; message: string; details?: any }>(`/servidores-sms/${id}/test`);
    return response;
  }
}
