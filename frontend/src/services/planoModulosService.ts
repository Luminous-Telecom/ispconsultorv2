import { defaultApiClient } from './core';
import type { PlanoModuloId } from 'constants/planoModulos';
export type { PlanoModuloId } from 'constants/planoModulos';

export interface PlanoModulosResponse {
  modulos: PlanoModuloId[] | null;
}

export const planoModulosService = {
  async get(): Promise<PlanoModulosResponse> {
    const res = await defaultApiClient.get<PlanoModulosResponse>('plano-modulos');
    return { modulos: res?.data?.modulos ?? null };
  },
};
