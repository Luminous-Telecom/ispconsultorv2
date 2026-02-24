import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiTokenService } from '../services/apiTokenService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';

export const useApiTokens = () => {
  return useQuery({
    queryKey: ['api-tokens'],
    queryFn: () => ApiTokenService.list(),
    staleTime: 0,
    refetchOnMount: true,
  });
};

export const useCreateApiToken = (onTokenCreated?: (tokenPlain: string) => void) => {
  const queryClient = useQueryClient();
  const { error } = useNotificationContext();

  return useMutation({
    mutationFn: (nome: string) => ApiTokenService.create(nome),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      onTokenCreated?.(data.token_plain);
    },
    onError: (err: Error) => {
      error(err.message || 'Erro ao criar token');
    },
  });
};

export const useRevokeApiToken = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: (id: number) => ApiTokenService.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      success('Token revogado com sucesso');
    },
    onError: (err: Error) => {
      error(err.message || 'Erro ao revogar token');
    },
  });
};
