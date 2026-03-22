import { defaultApiClient } from './core';

export type PlanoModuloId =
  | 'cadastros'
  | 'financeiro'
  | 'blockdomi'
  | 'equipamentos'
  | 'envio_notificacoes'
  | 'assinatura_digital'
  | 'nfse';

export interface PlanoModulosResponse {
  modulos: PlanoModuloId[] | null;
}

export const planoModulosService = {
  async get(): Promise<PlanoModulosResponse> {
    const res = await defaultApiClient.get<PlanoModulosResponse>('plano-modulos');
    return { modulos: res?.data?.modulos ?? null };
  },
};
