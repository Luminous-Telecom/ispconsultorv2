import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DominioService } from '../services/dominioService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { DominioFilters, UpdateDominio } from '../types';
import { AxiosError } from 'axios';

function getErrorMessage(err: unknown, fallback: string): string {
  const withMessage = err as { message?: string };
  if (typeof withMessage?.message === 'string' && withMessage.message.trim()) {
    return withMessage.message;
  }
  const axiosErr = err as AxiosError<{ message?: string }>;
  if (axiosErr.response?.data?.message) {
    return axiosErr.response.data.message;
  }
  return fallback;
}

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

export const useDominios = (filters: DominioFilters = {}) => {
  return useQuery({
    queryKey: ['dominios', filters],
    queryFn: () => DominioService.list(filters),
    staleTime: 30 * 1000,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useDominio = (id: number) => {
  return useQuery({
    queryKey: ['dominio', id],
    queryFn: () => DominioService.getById(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

export const useCreateDominio = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: DominioService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dominios'] });
      success('Domínio salvo com sucesso!');
    },
    onError: (err) => {
      error(getErrorMessage(err, 'Erro ao salvar domínio'));
    },
  });
};

export const useUpdateDominio = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDominio }) =>
      DominioService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['dominios'] });
      queryClient.invalidateQueries({ queryKey: ['dominio', id] });
      success('Domínio atualizado com sucesso!');
    },
    onError: (err) => {
      error(getErrorMessage(err, 'Erro ao atualizar domínio'));
    },
  });
};

export const useDeleteDominio = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: DominioService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dominios'] });
      success('Domínio excluído com sucesso!');
    },
    onError: (err) => {
      error(getErrorMessage(err, 'Erro ao excluir domínio'));
    },
  });
};
