import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DominioService } from '../services/dominioService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { DominioFilters, UpdateDominio } from '../types';
import { AxiosError } from 'axios';

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
      success('Domínio criado com sucesso!');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao criar domínio');
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
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao atualizar domínio');
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
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao excluir domínio');
    },
  });
};
