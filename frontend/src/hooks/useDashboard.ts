import { useQuery } from '@tanstack/react-query';
import { DashboardService, type DashboardFilters } from '../services/dashboardService';
import { CACHE_CONFIG } from '../config/api';

const { DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para buscar dados completos do dashboard
export const useDashboard = (filters?: DashboardFilters) => {
  return useQuery({
    queryKey: ['dashboard', filters?.startDate ?? null, filters?.endDate ?? null],
    queryFn: () => DashboardService.getDashboardData(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};
