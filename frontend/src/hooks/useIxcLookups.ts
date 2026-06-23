import { useQuery } from '@tanstack/react-query';
import {
  EstruturaLookupService,
  FilialLookupService,
  TecnicoLookupService,
  AssuntoLookupService,
  SetorLookupService,
  IxcIntegracaoStatusService,
  type LookupFilters,
} from '../services/ixcLookupService';
import { CACHE_CONFIG } from '../config/api';

const { DEFAULT_CACHE_TIME } = CACHE_CONFIG;

const lookupQueryOptions = (filters: LookupFilters) => ({
  staleTime: 60 * 1000,
  gcTime: DEFAULT_CACHE_TIME,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  retry: false,
  enabled: filters.enabled !== false && (filters.cliente_id ?? 0) > 0,
});

export const useEstruturas = (filters: LookupFilters = {}) => {
  return useQuery({
    queryKey: ['ixc-estruturas', filters],
    queryFn: () => EstruturaLookupService.list(filters),
    ...lookupQueryOptions(filters),
  });
};

export const useFiliais = (filters: LookupFilters = {}) => {
  return useQuery({
    queryKey: ['ixc-filiais', filters],
    queryFn: () => FilialLookupService.list(filters),
    ...lookupQueryOptions(filters),
  });
};

export const useTecnicos = (filters: LookupFilters = {}) => {
  return useQuery({
    queryKey: ['ixc-tecnicos', filters],
    queryFn: () => TecnicoLookupService.list(filters),
    ...lookupQueryOptions(filters),
  });
};

export const useAssuntos = (filters: LookupFilters = {}) => {
  return useQuery({
    queryKey: ['ixc-assuntos', filters],
    queryFn: () => AssuntoLookupService.list(filters),
    ...lookupQueryOptions(filters),
  });
};

export const useSetores = (filters: LookupFilters = {}) => {
  return useQuery({
    queryKey: ['ixc-setores', filters],
    queryFn: () => SetorLookupService.list(filters),
    ...lookupQueryOptions(filters),
  });
};

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
