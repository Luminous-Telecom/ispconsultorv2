import { apiService } from './api';

export interface Parametros {
  id: number;
  validar_cpf_cnpj: boolean;
  validar_cep: boolean;
  titulos_vence_sabado: boolean;
  titulos_vence_domingo: boolean;
  central_assinante_metodo_login?: string;
  assinatura_digital_habilitado?: boolean;
  assinatura_digital_api_provider?: string;
  assinatura_digital_api_key?: string;
  assinatura_digital_api_url?: string;
  assinatura_digital_account_id?: string;
  assinatura_digital_dias_expiracao_padrao?: number;
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

