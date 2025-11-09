import { apiService } from './api';
import type { RotinaAgendada, RoutineExecutionLog } from '../types/entities';
import type { ApiResponse } from '../types';

export type { RotinaAgendada, RoutineExecutionLog };

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
    const response = await apiService.get<SchedulerResponse>('/scheduler', { params });
    
    // apiService.get já retorna response.data do axios, que contém { success, data, pagination }
    if (response.success && response.data) {
      return response as unknown as SchedulerResponse;
    }

    return {
      success: false,
      data: [],
      pagination: {
        total: 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 15,
        pages: 0,
      },
    };
  }

  static async getRotinaById(id: number): Promise<ApiResponse<RotinaAgendada>> {
    const response = await apiService.get<RotinaAgendada>(`/scheduler/${id}`);
    return {
      success: response.success,
      data: response.data,
      message: response.message,
      errors: response.errors,
    };
  }

  static async createRotina(data: CreateRotinaData): Promise<ApiResponse<RotinaAgendada>> {
    const response = await apiService.post<RotinaAgendada>('/scheduler', data);
    return {
      success: response.success,
      data: response.data,
      message: response.message,
      errors: response.errors,
    };
  }

  static async updateRotina(id: number, data: UpdateRotinaData): Promise<ApiResponse<RotinaAgendada>> {
    const response = await apiService.put<RotinaAgendada>(`/scheduler/${id}`, data);
    return {
      success: response.success,
      data: response.data,
      message: response.message,
      errors: response.errors,
    };
  }

  static async deleteRotina(id: number): Promise<ApiResponse<void>> {
    const response = await apiService.delete<void>(`/scheduler/${id}`);
    return {
      success: response.success,
      message: response.message,
      data: response.data,
      errors: response.errors,
    };
  }

  static async toggleRotina(id: number, ativo: boolean): Promise<ApiResponse<void>> {
    const response = await apiService.patch<void>(`/scheduler/${id}/toggle`, { ativo });
    return {
      success: response.success,
      message: response.message,
      data: response.data,
      errors: response.errors,
    };
  }

  static async executeRotina(id: number): Promise<ApiResponse<void>> {
    const response = await apiService.post<void>(`/scheduler/${id}/execute`);
    return {
      success: response.success,
      message: response.message,
      data: response.data,
      errors: response.errors,
    };
  }

  static async getLogs(routineId: number): Promise<ApiResponse<RoutineExecutionLog[]>> {
    const response = await apiService.get<RoutineExecutionLog[]>(`/scheduler/logs/${routineId}`);
    return {
      success: response.success,
      data: response.data ?? [],
      message: response.message,
      errors: response.errors,
    };
  }

  static async getAllLogs(): Promise<ApiResponse<RoutineExecutionLog[]>> {
    const response = await apiService.get<RoutineExecutionLog[]>('/scheduler/logs');
    return {
      success: response.success,
      data: response.data ?? [],
      message: response.message,
      errors: response.errors,
    };
  }
}
