import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FornecedorService } from '../services/fornecedorService';
import { UpdateFornecedor, FornecedorFilters, PaginatedResponse, Fornecedor } from '../types';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para listar fornecedores
export const useFornecedores = (filters: FornecedorFilters = {}) => {
  return useQuery<PaginatedResponse<Fornecedor>>({
    queryKey: ['fornecedores', filters],
    queryFn: () => FornecedorService.list(filters),
    staleTime: 0, // Sempre considerar dados como stale para permitir refresh manual
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

// Hook para buscar fornecedor por ID
export const useFornecedor = (id: number | null) => {
  return useQuery({
    queryKey: ['fornecedor', id],
    queryFn: () => FornecedorService.getById(id!),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

// Hook para criar fornecedor
export const useCreateFornecedor = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: FornecedorService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      success('Fornecedor criado com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.FORNECEDOR_CREATE_ERROR),
  });
};

// Hook para atualizar fornecedor
export const useUpdateFornecedor = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFornecedor }) =>
      FornecedorService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      queryClient.invalidateQueries({ queryKey: ['fornecedor', id] });
      success('Fornecedor atualizado com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.FORNECEDOR_UPDATE_ERROR),
  });
};

// Hook para excluir fornecedor
export const useDeleteFornecedor = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: FornecedorService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      success('Fornecedor excluído com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.FORNECEDOR_DELETE_ERROR),
  });
};
