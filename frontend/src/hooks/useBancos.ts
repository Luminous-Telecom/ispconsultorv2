import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BancoService } from '../services/bancoService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { BancoFilters, PaginatedResponse, Banco } from '../types';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

const { DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para listar bancos
export const useBancos = (filters: BancoFilters = {}) => {
  return useQuery<PaginatedResponse<Banco>>({
    queryKey: ['bancos', filters],
    queryFn: () => BancoService.list(filters),
    staleTime: 0, // Sempre considerar dados como stale para permitir refresh manual
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });
};

// Hook para excluir banco
export const useDeleteBanco = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: BancoService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['bancos-ativos'] });
      success('Banco excluído com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.BANCO_DELETE_ERROR)
  });
};
