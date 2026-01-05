import { useQuery } from '@tanstack/react-query';
import { NotaFiscalService } from '../services/notaFiscalService';
import { CACHE_CONFIG } from '../config/api';
import { NotaFiscalFilters } from '../types';

const { DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para listar notas fiscais
export const useNotasFiscais = (filters: NotaFiscalFilters = {}) => {
  return useQuery({
    queryKey: ['notas-fiscais', filters],
    queryFn: () => NotaFiscalService.list(filters),
    staleTime: 30 * 1000, // 30 segundos - dados ficam fresh por 30s
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

