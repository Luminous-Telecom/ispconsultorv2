import { useQuery } from '@tanstack/react-query';
import { DashboardService, DashboardData, DashboardStats } from '../services/dashboardService';
import { CACHE_CONFIG } from '../config/api';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para buscar dados completos do dashboard
export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => DashboardService.getDashboardData(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

// Hook para buscar apenas estatísticas
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => DashboardService.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

// Hook para buscar carnês recentes
export const useCarnesRecentes = (limit: number = 5) => {
  return useQuery({
    queryKey: ['dashboard-carnes-recentes', limit],
    queryFn: () => DashboardService.getCarnesRecentes(limit),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

// Hook para buscar clientes por status
export const useClientesPorStatus = () => {
  return useQuery({
    queryKey: ['dashboard-clientes-status'],
    queryFn: () => DashboardService.getClientesPorStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

// Hook para buscar relatório de vendas
export const useRelatorioVendas = (periodo: 'dia' | 'semana' | 'mes' | 'ano') => {
  return useQuery({
    queryKey: ['dashboard-relatorio-vendas', periodo],
    queryFn: () => DashboardService.getRelatorioVendas(periodo),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};
