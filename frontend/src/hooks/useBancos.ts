import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BancoService } from '../services/bancoService';
import { useNotificationContext } from '../contexts/NotificationContext';
import { CACHE_CONFIG } from '../config/api';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para listar bancos
export const useBancos = (filters: any = {}) => {
  return useQuery({
    queryKey: ['bancos', filters],
    queryFn: () => BancoService.list(filters),
    staleTime: 0, // Sempre considerar dados como stale para permitir refresh manual
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

// Hook para buscar banco por ID
export const useBanco = (id: number) => {
  return useQuery({
    queryKey: ['banco', id],
    queryFn: () => BancoService.getById(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

// Hook para buscar bancos ativos
export const useBancosAtivos = () => {
  return useQuery({
    queryKey: ['bancos-ativos'],
    queryFn: () => BancoService.findAtivos(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

// Hook para criar banco
export const useCreateBanco = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: BancoService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['bancos-ativos'] });
      success('Banco criado com sucesso!');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao criar banco');
    },
  });
};

// Hook para atualizar banco
export const useUpdateBanco = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      BancoService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['banco', id] });
      queryClient.invalidateQueries({ queryKey: ['bancos-ativos'] });
      success('Banco atualizado com sucesso!');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao atualizar banco');
    },
  });
};

// Hook para excluir banco
export const useDeleteBanco = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: BancoService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['bancos-ativos'] });
      success('Banco excluído com sucesso!');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao excluir banco');
    },
  });
};
