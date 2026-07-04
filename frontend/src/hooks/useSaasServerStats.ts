import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SaasServerStatsService } from '../services/saas/saasServerStatsService';

/** Intervalo de polling dos cards de monitoramento (RAM, CPU, disco, I/O, fila). */
const REFETCH_INTERVAL_MS = 3_000;

export const useSaasServerStats = () => {
  return useQuery({
    queryKey: ['saas-server-stats'],
    queryFn: () => SaasServerStatsService.getServerStats(),
    staleTime: 0,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
};
