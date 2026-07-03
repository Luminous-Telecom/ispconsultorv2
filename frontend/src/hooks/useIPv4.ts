import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IPv4Service } from '../services/ipv4Service';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { IPv4Filters, UpdateIPv4 } from '../types';
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

export const useIPv4s = (filters: IPv4Filters = {}) => {
  return useQuery({
    queryKey: ['ipv4', filters],
    queryFn: () => IPv4Service.list(filters),
    staleTime: 30 * 1000,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useIPv4 = (id: number) => {
  return useQuery({
    queryKey: ['ipv4-item', id],
    queryFn: () => IPv4Service.getById(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

export const useCreateIPv4 = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: IPv4Service.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipv4'] });
      success('IPv4 salvo com sucesso!');
    },
    onError: (err) => {
      error(getErrorMessage(err, 'Erro ao salvar IPv4'));
    },
  });
};

export const useUpdateIPv4 = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateIPv4 }) =>
      IPv4Service.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ipv4'] });
      queryClient.invalidateQueries({ queryKey: ['ipv4-item', id] });
      success('IPv4 atualizado com sucesso!');
    },
    onError: (err) => {
      error(getErrorMessage(err, 'Erro ao atualizar IPv4'));
    },
  });
};

export const useDeleteIPv4 = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: IPv4Service.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipv4'] });
      success('IPv4 excluído com sucesso!');
    },
    onError: (err) => {
      error(getErrorMessage(err, 'Erro ao excluir IPv4'));
    },
  });
};
