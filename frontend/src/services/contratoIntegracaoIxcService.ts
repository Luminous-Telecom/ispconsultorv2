import { defaultApiClient } from './core';

export interface ContratoIntegracaoIxcItem {
  id: number;
  nome: string;
  api_url?: string | null;
  ativo?: boolean;
  has_api_token?: boolean;
}

export interface ContratoIntegracaoIxcResponse {
  integracoes: ContratoIntegracaoIxcItem[];
}

export class ContratoIntegracaoIxcService {
  static async getByContrato(contratoId: number): Promise<ContratoIntegracaoIxcResponse> {
    const response = await defaultApiClient.get<{ data?: ContratoIntegracaoIxcResponse }>(
      `/contratos/${contratoId}/integracao-ixc`
    );
    const data = response.data?.data ?? (response.data as unknown as ContratoIntegracaoIxcResponse);
    return {
      integracoes: Array.isArray(data?.integracoes) ? data.integracoes : [],
    };
  }

  static async link(
    contratoId: number,
    integracaoIxcProvedorId: number
  ): Promise<ContratoIntegracaoIxcResponse> {
    const response = await defaultApiClient.post<{ data?: ContratoIntegracaoIxcResponse }>(
      `/contratos/${contratoId}/integracao-ixc`,
      { integracao_ixc_provedor_id: integracaoIxcProvedorId }
    );
    const data = response.data?.data ?? (response.data as unknown as ContratoIntegracaoIxcResponse);
    return {
      integracoes: Array.isArray(data?.integracoes) ? data.integracoes : [],
    };
  }

  static async unlink(
    contratoId: number,
    integracaoIxcProvedorId: number
  ): Promise<ContratoIntegracaoIxcResponse> {
    const response = await defaultApiClient.delete<{ data?: ContratoIntegracaoIxcResponse }>(
      `/contratos/${contratoId}/integracao-ixc/${integracaoIxcProvedorId}`
    );
    const data = response.data?.data ?? (response.data as unknown as ContratoIntegracaoIxcResponse);
    return {
      integracoes: Array.isArray(data?.integracoes) ? data.integracoes : [],
    };
  }
}
