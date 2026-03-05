import { useQuery } from '@tanstack/react-query';
import { SaasDashboardService, type SaasDashboardFilters } from '../services/saas/saasDashboardService';

export const useSaasDashboard = (filters?: SaasDashboardFilters) => {
  return useQuery({
    queryKey: ['saas-dashboard', filters?.startDate ?? null, filters?.endDate ?? null],
    queryFn: () => SaasDashboardService.getDashboardData(filters),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};
