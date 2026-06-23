import { defaultApiClient } from './core';

export interface ContratoIntegracaoIxcLink {
  integracao_ixc_provedor_id?: number | null;
  integracao?: {
    id?: number;
    nome?: string;
    api_url?: string | null;
    ativo?: boolean;
    has_api_token?: boolean;
  } | null;
}

export class ContratoIntegracaoIxcService {
  static async getByContrato(contratoId: number): Promise<ContratoIntegracaoIxcLink> {
    const response = await defaultApiClient.get<{ data?: ContratoIntegracaoIxcLink }>(
      `/contratos/${contratoId}/integracao-ixc`
    );
    return response.data?.data ?? (response.data as unknown as ContratoIntegracaoIxcLink);
  }

  static async link(
    contratoId: number,
    integracaoIxcProvedorId: number | null
  ): Promise<ContratoIntegracaoIxcLink> {
    const response = await defaultApiClient.put<{ data?: ContratoIntegracaoIxcLink }>(
      `/contratos/${contratoId}/integracao-ixc`,
      { integracao_ixc_provedor_id: integracaoIxcProvedorId }
    );
    return response.data?.data ?? (response.data as unknown as ContratoIntegracaoIxcLink);
  }
}
