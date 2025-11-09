import { apiService } from './api';

export interface Parametros {
  id: number;
  validar_cpf_cnpj: boolean;
  gerar_titulos_automatico: boolean;
  titulos_vence_sabado: boolean;
  auto_lancamento_titulos: boolean;
  total_titulos_financeiro: number;
  created_at?: string;
  updated_at?: string;
}

export interface ParametrosResponse {
  success: boolean;
  data: Parametros;
}

export class ParametrosService {
  static async get(): Promise<ParametrosResponse> {
    const response = await apiService.get<Parametros>('/parametros');
    return {
      success: response.success,
      data: response.data as Parametros,
    };
  }

  static async update(data: Partial<Parametros>): Promise<{ success: boolean; message: string }> {
    const response = await apiService.put<void>('/parametros', data);
    return {
      success: response.success,
      message: response.message ?? '',
    };
  }
}

