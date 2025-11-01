import { apiService } from './api';

export interface DiasVencimento {
  id: number;
  dia?: number;
  dia_padrao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateDiasVencimento {
  dias: number[];
}

export interface CreateDiasVencimento {
  dias: number[];
}

export interface CalculateNextDueDateRequest {
  data_referencia: string;
  dia_personalizado?: number;
}

export interface ValidateDueDateRequest {
  data_vencimento: string;
}

export interface CalculateNextDueDateResponse {
  proxima_data: string;
  dia_vencimento: number;
  valido: boolean;
}

export interface ValidateDueDateResponse {
  valido: boolean;
  motivo?: string;
}

export class DiasVencimentoService {
  static async get(): Promise<{ success: boolean; data: DiasVencimento[]; message: string }> {
    const response = await apiService.get<{ success: boolean; data: DiasVencimento[]; message: string }>('/dias-vencimento');
    return response;
  }

  static async create(data: CreateDiasVencimento): Promise<{ success: boolean; data: DiasVencimento; message: string }> {
    const response = await apiService.post<{ success: boolean; data: DiasVencimento; message: string }>('/dias-vencimento', data);
    return response;
  }

  static async update(data: UpdateDiasVencimento): Promise<{ success: boolean; data: DiasVencimento; message: string }> {
    const response = await apiService.put<{ success: boolean; data: DiasVencimento; message: string }>('/dias-vencimento', data);
    return response;
  }

  static async list(): Promise<{ success: boolean; data: DiasVencimento[]; message: string }> {
    const response = await apiService.get<{ success: boolean; data: DiasVencimento[]; message: string }>('/dias-vencimento/historico');
    return response;
  }

  static async calculateNextDueDate(data: CalculateNextDueDateRequest): Promise<{ success: boolean; data: CalculateNextDueDateResponse; message: string }> {
    const response = await apiService.post<{ success: boolean; data: CalculateNextDueDateResponse; message: string }>('/dias-vencimento/calcular-proximo', data);
    return response;
  }

  static async validateDueDate(data: ValidateDueDateRequest): Promise<{ success: boolean; data: ValidateDueDateResponse; message: string }> {
    const response = await apiService.post<{ success: boolean; data: ValidateDueDateResponse; message: string }>('/dias-vencimento/validar-data', data);
    return response;
  }
}
