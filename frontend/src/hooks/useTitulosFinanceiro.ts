import { useQuery } from '@tanstack/react-query';
import { BaseService, defaultApiClient } from '../services/core';
import { CACHE_CONFIG } from '../config/api';
import { TituloFilters, Titulo } from '../types';

const { DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Criar uma instância temporária de BaseService para usar o método list
class TituloFinanceiroService extends BaseService<Titulo, never, never, TituloFilters> {
  constructor() {
    super(defaultApiClient, '/titulos');
  }
}

const tituloFinanceiroService = new TituloFinanceiroService();

export const useTitulosFinanceiro = (filters: TituloFilters = {}, enabled = true) => {
  return useQuery({
    queryKey: ['titulos-financeiro', filters],
    queryFn: () => tituloFinanceiroService.list(filters),
    enabled,
    staleTime: 0,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

