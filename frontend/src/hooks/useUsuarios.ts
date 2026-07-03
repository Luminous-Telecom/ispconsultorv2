import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UsuarioService } from '../services/usuarioService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { UsuarioFilters, UpdateUsuario } from '../types';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES, ERROR_MESSAGES } from '../constants/ErrorMessages';

export type { Usuario } from '../types';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

export const useUsuarios = (filters: UsuarioFilters = {}) => {
  return useQuery({
    queryKey: ['usuarios', filters],
    queryFn: () => UsuarioService.list(filters),
    staleTime: 0,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

export const useUsuario = (id: number) => {
  return useQuery({
    queryKey: ['usuario', id],
    queryFn: () => UsuarioService.getById(id),
    enabled: !!id && id > 0,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

export const useCreateUsuario = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: UsuarioService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      success('Usuário salvo com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.USER_CREATE_ERROR),
  });
};

export const useUpdateUsuario = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUsuario }) =>
      UsuarioService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['usuario', id] });
      success('Usuário atualizado com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR),
  });
};

export const useDeleteUsuario = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: UsuarioService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      success('Usuário excluído com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.USER_DELETE_ERROR),
  });
};

export const useGerarWebhookSecret = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: UsuarioService.gerarWebhookSecret,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['usuario', id] });
      success('Webhook secret gerado com sucesso!');
    },
    onError: (err) => showApiError(err, ERROR_MESSAGES.OPERATION_FAILED),
  });
};
