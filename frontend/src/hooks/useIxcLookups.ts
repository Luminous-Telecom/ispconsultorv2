import { useQuery } from '@tanstack/react-query';
import {
  EstruturaLookupService,
  FilialLookupService,
  TecnicoLookupService,
  AssuntoLookupService,
  SetorLookupService,
  type LookupFilters,
} from '../services/ixcLookupService';
import { CACHE_CONFIG } from '../config/api';

const { DEFAULT_CACHE_TIME } = CACHE_CONFIG;

export const useEstruturas = (filters: LookupFilters = {}) => {
  return useQuery({
    queryKey: ['ixc-estruturas', filters],
    queryFn: () => EstruturaLookupService.list(filters),
    staleTime: 60 * 1000,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useFiliais = (filters: LookupFilters = {}) => {
  return useQuery({
    queryKey: ['ixc-filiais', filters],
    queryFn: () => FilialLookupService.list(filters),
    staleTime: 60 * 1000,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useTecnicos = (filters: LookupFilters = {}) => {
  return useQuery({
    queryKey: ['ixc-tecnicos', filters],
    queryFn: () => TecnicoLookupService.list(filters),
    staleTime: 60 * 1000,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useAssuntos = (filters: LookupFilters = {}) => {
  return useQuery({
    queryKey: ['ixc-assuntos', filters],
    queryFn: () => AssuntoLookupService.list(filters),
    staleTime: 60 * 1000,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useSetores = (filters: LookupFilters = {}) => {
  return useQuery({
    queryKey: ['ixc-setores', filters],
    queryFn: () => SetorLookupService.list(filters),
    staleTime: 60 * 1000,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
