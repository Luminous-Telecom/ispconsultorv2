import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IPv6Service } from '../services/ipv6Service';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { IPv6Filters, UpdateIPv6 } from '../types';
import { AxiosError } from 'axios';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

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

export const useIPv6s = (filters: IPv6Filters = {}) => {
  return useQuery({
    queryKey: ['ipv6', filters],
    queryFn: () => IPv6Service.list(filters),
    staleTime: 30 * 1000,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useIPv6 = (id: number) => {
  return useQuery({
    queryKey: ['ipv6-item', id],
    queryFn: () => IPv6Service.getById(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

export const useCreateIPv6 = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: IPv6Service.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipv6'] });
      success('IPv6 criado com sucesso!');
    },
    onError: (err) => {
      error(getErrorMessage(err, 'Erro ao criar IPv6'));
    },
  });
};

export const useUpdateIPv6 = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateIPv6 }) =>
      IPv6Service.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ipv6'] });
      queryClient.invalidateQueries({ queryKey: ['ipv6-item', id] });
      success('IPv6 atualizado com sucesso!');
    },
    onError: (err) => {
      error(getErrorMessage(err, 'Erro ao atualizar IPv6'));
    },
  });
};

export const useDeleteIPv6 = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: IPv6Service.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipv6'] });
      success('IPv6 excluído com sucesso!');
    },
    onError: (err) => {
      error(getErrorMessage(err, 'Erro ao excluir IPv6'));
    },
  });
};
