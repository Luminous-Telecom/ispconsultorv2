import { apiService } from './api';
import { RotinaAgendada, RoutineExecutionLog } from '../types/entities';

export interface CreateRotinaData {
  nome: string;
  tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'outros';
  descricao?: string;
  configuracao?: Record<string, unknown>;
  frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  dia_execucao?: number;
  hora_execucao: string;
  dia_semana?: number;
  cron_expression?: string;
}

export interface UpdateRotinaData {
  nome?: string;
  descricao?: string;
  configuracao?: Record<string, unknown>;
  frequencia?: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  dia_execucao?: number;
  hora_execucao?: string;
  dia_semana?: number;
  cron_expression?: string;
  ativo?: boolean;
}

export interface SchedulerResponse {
  success: boolean;
  data: RotinaAgendada[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export class SchedulerService {
  static async getRotinas(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }): Promise<SchedulerResponse> {
    const response = await apiService.get<SchedulerResponse>('/scheduler', params);
    return response;
  }

  static async getRotinaById(id: number): Promise<{ success: boolean; data: RotinaAgendada }> {
    const response = await apiService.get<{ success: boolean; data: RotinaAgendada }>(`/scheduler/${id}`);
    return response;
  }

  static async createRotina(data: CreateRotinaData): Promise<{ success: boolean; message: string; data: RotinaAgendada }> {
    const response = await apiService.post<{ success: boolean; message: string; data: RotinaAgendada }>('/scheduler', data);
    return response;
  }

  static async updateRotina(id: number, data: UpdateRotinaData): Promise<{ success: boolean; message: string; data: RotinaAgendada }> {
    const response = await apiService.put<{ success: boolean; message: string; data: RotinaAgendada }>(`/scheduler/${id}`, data);
    return response;
  }

  static async deleteRotina(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete<{ success: boolean; message: string }>(`/scheduler/${id}`);
    return response;
  }

  static async toggleRotina(id: number, ativo: boolean): Promise<{ success: boolean; message: string }> {
    const response = await apiService.patch<{ success: boolean; message: string }>(`/scheduler/${id}/toggle`, { ativo });
    return response;
  }

  static async executeRotina(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<{ success: boolean; message: string }>(`/scheduler/${id}/execute`);
    return response;
  }

  static async getLogs(routineId: number): Promise<{ success: boolean; data: RoutineExecutionLog[] }> {
    const response = await apiService.get<{ success: boolean; data: RoutineExecutionLog[] }>(`/scheduler/logs/${routineId}`);
    return response;
  }

  static async getAllLogs(): Promise<{ success: boolean; data: RoutineExecutionLog[] }> {
    const response = await apiService.get<{ success: boolean; data: RoutineExecutionLog[] }>('/scheduler/logs');
    return response;
  }
}
