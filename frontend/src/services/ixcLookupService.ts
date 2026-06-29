/**
 * Serviços de lookup do IXC usados nos campos de seleção (lupa) de ordens de serviço.
 */
import { BaseService, defaultApiClient } from './core';
import type { BaseFilters } from './core/BaseService';
import { PaginatedResponse } from '../types';

export interface LookupItem {
  id: string;
  nome: string;
}

export type LookupFilters = BaseFilters & {
  cliente_id?: number;
  setor_id?: number | string;
  /** Quando false, a query não é executada (ex.: modal fechado). */
  enabled?: boolean;
};

function createLookupService(endpoint: string) {
  const service = new BaseService<LookupItem, never, never, LookupFilters>(
    defaultApiClient,
    endpoint
  );
  return {
    list: (filters: LookupFilters = {}) => service.list(filters),
  };
}

export const EstruturaLookupService = createLookupService('/ixc/estruturas');
export const FilialLookupService = createLookupService('/ixc/filiais');
export const TecnicoLookupService = createLookupService('/ixc/tecnicos');
export const AssuntoLookupService = createLookupService('/ixc/assuntos');
export const SetorLookupService = createLookupService('/ixc/setores');

export interface ClienteIntegracaoIxcStatus {
  configured: boolean;
}

export class IxcIntegracaoStatusService {
  static async getByClienteId(clienteId: number): Promise<ClienteIntegracaoIxcStatus> {
    const queryString = defaultApiClient.buildQueryString({ cliente_id: clienteId });
    const response = await defaultApiClient.get<{ data?: ClienteIntegracaoIxcStatus }>(
      `/ixc/integracao-status${queryString}`
    );
    return response.data?.data ?? (response.data as unknown as ClienteIntegracaoIxcStatus);
  }
}
