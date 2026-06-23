import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlanoService } from '../services/planoService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { PlanoFilters, UpdatePlano, PaginatedResponse, Plano } from '../types';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

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

// Hook para buscar plano por ID
export const usePlano = (id: number) => {
  return useQuery({
    queryKey: ['plano', id],
    queryFn: () => PlanoService.getById(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

// Hook para buscar planos ativos
export const usePlanosAtivos = () => {
  return useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.findAtivos(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

// Hook para criar plano
export const useCreatePlano = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: PlanoService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      queryClient.invalidateQueries({ queryKey: ['planos-ativos'] });
      success('Plano criado com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.PLANO_CREATE_ERROR),
  });
};

// Hook para atualizar plano
export const useUpdatePlano = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePlano }) =>
      PlanoService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      queryClient.invalidateQueries({ queryKey: ['plano', id] });
      queryClient.invalidateQueries({ queryKey: ['planos-ativos'] });
      success('Plano atualizado com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.PLANO_UPDATE_ERROR),
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
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.PLANO_DELETE_ERROR),
  });
};

// Hook para alterar status do plano
export const useTogglePlanoStatus = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'ativo' | 'inativo' }) => 
      PlanoService.toggleStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      queryClient.invalidateQueries({ queryKey: ['planos-ativos'] });
      const statusText = data.status === 'ativo' ? 'ativado' : 
                        data.status === 'inativo' ? 'desativado' : 'ativado';
      success(`Plano ${statusText} com sucesso!`);
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.PLANO_STATUS_ERROR),
  });
};
