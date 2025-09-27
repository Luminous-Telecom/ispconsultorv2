import { apiService } from './api';

export interface RotinaAgendada {
  id: number;
  nome: string;
  tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'outros';
  descricao?: string;
  frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  hora_execucao: string;
  ativo: boolean;
  ultima_execucao?: string;
  proxima_execucao?: string;
  total_execucoes: number;
  execucoes_com_sucesso: number;
  execucoes_com_erro: number;
  created_at: string;
}

export interface CreateRotinaData {
  nome: string;
  tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'outros';
  descricao?: string;
  configuracao?: any;
  frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  dia_execucao?: number;
  hora_execucao: string;
  dia_semana?: number;
  cron_expression?: string;
}

export interface UpdateRotinaData {
  nome?: string;
  descricao?: string;
  configuracao?: any;
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
    const response = await apiService.get<any>('/scheduler', { params });
    return response;
  }

  static async getRotinaById(id: number): Promise<{ success: boolean; data: RotinaAgendada }> {
    const response = await apiService.get<any>(`/scheduler/${id}`);
    return response;
  }

  static async createRotina(data: CreateRotinaData): Promise<{ success: boolean; message: string; data: RotinaAgendada }> {
    const response = await apiService.post<any>('/scheduler', data);
    return response;
  }

  static async updateRotina(id: number, data: UpdateRotinaData): Promise<{ success: boolean; message: string; data: RotinaAgendada }> {
    const response = await apiService.put<any>(`/scheduler/${id}`, data);
    return response;
  }

  static async deleteRotina(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete<any>(`/scheduler/${id}`);
    return response;
  }

  static async toggleRotina(id: number, ativo: boolean): Promise<{ success: boolean; message: string }> {
    const response = await apiService.patch<any>(`/scheduler/${id}/toggle`, { ativo });
    return response;
  }

  static async executeRotina(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<any>(`/scheduler/${id}/execute`);
    return response;
  }

  static async getLogs(routineId: number): Promise<{ success: boolean; data: any[] }> {
    const response = await apiService.get<any>(`/scheduler/logs/${routineId}`);
    return response;
  }

  static async getAllLogs(): Promise<{ success: boolean; data: any[] }> {
    const response = await apiService.get<any>('/scheduler/logs');
    return response;
  }
}
