import { apiService } from '../api';

export interface SaasParametros {
  id: number;
  validar_cpf_cnpj: boolean;
  validar_cep: boolean;
  titulos_vence_sabado: boolean;
  titulos_vence_domingo: boolean;
  manter_numeros_titulos: boolean;
  quantidade_titulos_manter: number | null;
  central_assinante_metodo_login: string;
  created_at?: string;
  updated_at?: string;
}

export interface SaasParametrosResponse {
  success: boolean;
  data: SaasParametros;
}

export class SaasParametrosService {
  static async get(): Promise<SaasParametrosResponse> {
    const response = await apiService.get<SaasParametros>('/saas/parametros');
    return {
      success: response.success,
      data: response.data as SaasParametros,
    };
  }

  static async update(data: Partial<SaasParametros>): Promise<{ success: boolean; message: string }> {
    const response = await apiService.put<void>('/saas/parametros', data);
    return {
      success: response.success,
      message: response.message ?? '',
    };
  }
}
