import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgentService } from '../services/agentService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { UpdateAgent } from '../types';
import { AxiosError } from 'axios';

function getErrorMessage(err: unknown, fallback: string): string {
  const withMessage = err as { message?: string };
  if (typeof withMessage?.message === 'string' && withMessage.message.trim()) {
    return withMessage.message;
  }
  const axiosErr = err as AxiosError<{ message?: string }>;
  if (axiosErr.response?.data?.message) return axiosErr.response.data.message;
  return fallback;
}

export const useAgents = (filters?: { cliente_id?: number; empresa_id?: number }) => {
  return useQuery({
    queryKey: ['agents', filters],
    queryFn: () => AgentService.list(filters),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchInterval: filters?.cliente_id != null || filters?.empresa_id != null ? false : 30_000,
  });
};

export const useAgent = (id: string) => {
  return useQuery({
    queryKey: ['agent', id],
    queryFn: () => AgentService.getById(id),
    enabled: !!id,
    staleTime: 15_000,
  });
};

export const useCreateAgent = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  return useMutation({
    mutationFn: AgentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      success('Agente criado!');
    },
    onError: (err) => error(getErrorMessage(err, 'Erro ao criar agente')),
  });
};

export const useUpdateAgent = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAgent }) =>
      AgentService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', id] });
      success('Agente atualizado!');
    },
    onError: (err) => error(getErrorMessage(err, 'Erro ao atualizar agente')),
  });
};

export const useDeleteAgent = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  return useMutation({
    mutationFn: AgentService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      success('Agente removido!');
    },
    onError: (err) => error(getErrorMessage(err, 'Erro ao remover agente')),
  });
};

export const useRegenerateAgentToken = () => {
  const queryClient = useQueryClient();
  const { error } = useNotificationContext();
  return useMutation({
    mutationFn: AgentService.regenerateToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
    onError: (err) => error(getErrorMessage(err, 'Erro ao regenerar token')),
  });
};

export const useTestAgent = () => {
  const { error } = useNotificationContext();

  return useMutation({
    mutationFn: (id: string) => AgentService.testConnection(id),
    onSuccess: (result) => {
      if (!result.success) {
        error(result.error ?? 'Falha no teste do agente');
      }
    },
    onError: (err) => error(getErrorMessage(err, 'Erro ao testar agente')),
  });
};
