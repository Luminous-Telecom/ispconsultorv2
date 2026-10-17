import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlanoService } from '../services/planoService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { PlanoFilters,  PaginatedResponse, Plano } from '../types';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

const { DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para listar planos
export const usePlanos = (filters: PlanoFilters = {}) => {
  return useQuery<PaginatedResponse<Plano>>({
    queryKey: ['planos', filters],
    queryFn: () => PlanoService.list(filters),
    staleTime: 30 * 1000, // 30 segundos - dados ficam fresh por 30s
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Não refetch automático ao montar
  });
};

// Hook para excluir plano
export const useDeletePlano = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: PlanoService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      queryClient.invalidateQueries({ queryKey: ['planos-ativos'] });
      success('Plano excluído com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.PLANO_DELETE_ERROR)
  });
};
