import { useQuery } from '@tanstack/react-query';
import { SaasServerStatsService } from '../services/saas/saasServerStatsService';

const REFETCH_INTERVAL_MS = 30_000;

export const useSaasServerStats = () => {
  return useQuery({
    queryKey: ['saas-server-stats'],
    queryFn: () => SaasServerStatsService.getServerStats(),
    staleTime: 0,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
};
