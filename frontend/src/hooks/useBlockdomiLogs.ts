import { useQuery } from '@tanstack/react-query';
import { BlockdomiLogAcessoService } from '../services/blockdomiLogAcessoService';
import { CACHE_CONFIG } from '../config/api';
import type { BlockdomiLogAcessoFilters } from '../services/blockdomiLogAcessoService';

export const useBlockdomiLogs = (
  filters: BlockdomiLogAcessoFilters = {},
  options?: { refetchInterval?: number; enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['blockdomi-logs-acesso', filters],
    queryFn: () => BlockdomiLogAcessoService.list(filters),
    staleTime: 0,
    gcTime: CACHE_CONFIG.DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchInterval: options?.refetchInterval,
    refetchIntervalInBackground: !!options?.refetchInterval,
    enabled: options?.enabled !== false
  });
};
