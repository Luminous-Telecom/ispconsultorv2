import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  EstruturaLookupService,
  FilialLookupService,
  TecnicoLookupService,
  AssuntoLookupService,
  SetorLookupService,
  IxcIntegracaoStatusService,
  type LookupFilters,
  type LookupItem,
} from '../services/ixcLookupService';
import { CACHE_CONFIG } from '../config/api';
import type { PaginatedResponse } from '../types';

const { DEFAULT_CACHE_TIME } = CACHE_CONFIG;

function lookupQueryOptions(filters: LookupFilters, operadorScoped = false) {
  return {
    staleTime: operadorScoped ? 0 : 60 * 1000,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: operadorScoped,
    retry: false,
    enabled: filters.enabled !== false && (filters.cliente_id ?? 0) > 0,
  };
}

function createLookupHook(
  key: string,
  list: (filters: LookupFilters) => Promise<PaginatedResponse<LookupItem>>
) {
  return (filters: LookupFilters = {}): UseQueryResult<PaginatedResponse<LookupItem>> =>
    useQuery({
      queryKey: [key, filters],
      queryFn: () => list(filters),
      ...lookupQueryOptions(filters),
    });
}

export const useEstruturas = createLookupHook('ixc-estruturas', EstruturaLookupService.list);
export const useFiliais = createLookupHook('ixc-filiais', FilialLookupService.list);
export const useSetores = (filters: LookupFilters = {}) =>
  useQuery({
    queryKey: ['ixc-setores', filters],
    queryFn: () => SetorLookupService.list(filters),
    ...lookupQueryOptions(filters, true),
  });

export const useTecnicos = (filters: LookupFilters = {}) =>
  useQuery({
    queryKey: ['ixc-tecnicos', filters],
    queryFn: () => TecnicoLookupService.list(filters),
    ...lookupQueryOptions(filters, Boolean(filters.setor_id)),
  });

export const useAssuntos = (filters: LookupFilters = {}) =>
  useQuery({
    queryKey: ['ixc-assuntos', filters],
    queryFn: () => AssuntoLookupService.list(filters),
    ...lookupQueryOptions(filters, Boolean(filters.setor_id)),
  });

export const useClienteIxcIntegracao = (clienteId: number, enabled = true) => {
  return useQuery({
    queryKey: ['cliente-ixc-integracao', clienteId],
    queryFn: () => IxcIntegracaoStatusService.getByClienteId(clienteId),
    enabled: enabled && clienteId > 0,
    staleTime: 60 * 1000,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    retry: false,
  });
};
