import { apiService } from './api';

export interface DiasVencimento {
  id: number;
  dia_padrao: number;
  dias_tolerancia: number;
  percentual_multa: number;
  juros_por_dia: number;
  vence_sabado: boolean;
  vence_domingo: boolean;
  considera_feriados: boolean;
  feriados_fixos?: string;
  feriados_moveis?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateDiasVencimento {
  dia_padrao?: number;
  dias_tolerancia?: number;
  percentual_multa?: number;
  juros_por_dia?: number;
  vence_sabado?: boolean;
  vence_domingo?: boolean;
  considera_feriados?: boolean;
  feriados_fixos?: string;
  feriados_moveis?: string;
  ativo?: boolean;
}

export interface CreateDiasVencimento extends UpdateDiasVencimento {
  dia_padrao: number;
  dias_tolerancia: number;
  percentual_multa: number;
  juros_por_dia: number;
  vence_sabado: boolean;
  vence_domingo: boolean;
  considera_feriados: boolean;
}

export interface CalculateNextDueDateRequest {
  data_referencia: string;
  dia_personalizado?: number;
}

export interface ValidateDueDateRequest {
  data_vencimento: string;
}

export class DiasVencimentoService {
  static async get(): Promise<{ success: boolean; data: DiasVencimento; message: string }> {
    const response = await apiService.get<{ success: boolean; data: DiasVencimento; message: string }>('/dias-vencimento');
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

  static async calculateNextDueDate(data: CalculateNextDueDateRequest): Promise<{ success: boolean; data: any; message: string }> {
    const response = await apiService.post<{ success: boolean; data: any; message: string }>('/dias-vencimento/calcular-proximo', data);
    return response;
  }

  static async validateDueDate(data: ValidateDueDateRequest): Promise<{ success: boolean; data: any; message: string }> {
    const response = await apiService.post<{ success: boolean; data: any; message: string }>('/dias-vencimento/validar-data', data);
    return response;
  }
}
