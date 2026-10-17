import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ClienteService } from '../services/clienteService';
import {  ClienteFilters, PaginatedResponse, Cliente } from '../types';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

// Para React Query v5, use gcTime ao invés de cacheTime
const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para listar clientes
export const useClientes = (filters: ClienteFilters = {}) => {
  return useQuery<PaginatedResponse<Cliente>>({
    queryKey: ['clientes', filters],
    queryFn: () => ClienteService.list(filters),
    staleTime: 0, // Sempre considerar dados como stale para permitir refresh manual
    gcTime: DEFAULT_CACHE_TIME,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Refetch ao montar para garantir dados atualizados
  });
};

// Hook para buscar cliente por ID
export const useCliente = (id: number) => {
  return useQuery({
    queryKey: ['cliente', id],
    queryFn: () => ClienteService.getById(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME
  });
};

// Hook para excluir cliente
export const useDeleteCliente = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ClienteService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-ativos'] });
      success('Cliente excluído com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.CLIENT_DELETE_ERROR)
  });
};
