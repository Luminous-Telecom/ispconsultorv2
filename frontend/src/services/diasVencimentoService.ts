import { apiService } from './api';
import type { ApiResponse } from '../types';

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

const normalizeResponse = <T>(response: ApiResponse<T>, fallback: T): { success: boolean; data: T; message: string } => ({
  success: response.success,
  data: response.data ?? fallback,
  message: response.message ?? '',
});

export class DiasVencimentoService {
  static async get(): Promise<{ success: boolean; data: DiasVencimento[]; message: string }> {
    const response = await apiService.get<DiasVencimento[]>('/dias-vencimento');
    return normalizeResponse(response, []);
  }

  static async create(data: CreateDiasVencimento): Promise<{ success: boolean; data: DiasVencimento; message: string }> {
    const response = await apiService.post<DiasVencimento>('/dias-vencimento', data);
    return normalizeResponse(response, {} as DiasVencimento);
  }

  static async update(data: UpdateDiasVencimento): Promise<{ success: boolean; data: DiasVencimento; message: string }> {
    const response = await apiService.put<DiasVencimento>('/dias-vencimento', data);
    return normalizeResponse(response, {} as DiasVencimento);
  }

  static async list(): Promise<{ success: boolean; data: DiasVencimento[]; message: string }> {
    const response = await apiService.get<DiasVencimento[]>('/dias-vencimento/historico');
    return normalizeResponse(response, []);
  }

  static async calculateNextDueDate(data: CalculateNextDueDateRequest): Promise<{ success: boolean; data: CalculateNextDueDateResponse; message: string }> {
    const response = await apiService.post<CalculateNextDueDateResponse>('/dias-vencimento/calcular-proximo', data);
    return normalizeResponse(response, {} as CalculateNextDueDateResponse);
  }

  static async validateDueDate(data: ValidateDueDateRequest): Promise<{ success: boolean; data: ValidateDueDateResponse; message: string }> {
    const response = await apiService.post<ValidateDueDateResponse>('/dias-vencimento/validar-data', data);
    return normalizeResponse(response, {} as ValidateDueDateResponse);
  }
}
