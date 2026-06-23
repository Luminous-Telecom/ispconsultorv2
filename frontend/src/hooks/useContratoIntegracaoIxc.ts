import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ContratoIntegracaoIxcService } from '../services/contratoIntegracaoIxcService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { useApiError } from './useApiError';

export const useContratoIntegracaoIxc = (contratoId?: number | null, enabled = true) => {
  return useQuery({
    queryKey: ['contrato-integracao-ixc', contratoId],
    queryFn: () => ContratoIntegracaoIxcService.getByContrato(contratoId as number),
    enabled: enabled && !!contratoId,
    staleTime: 0,
    refetchOnMount: true,
  });
};

export const useLinkContratoIntegracaoIxc = (contratoId?: number | null) => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: (integracaoIxcProvedorId: number | null) => {
      if (!contratoId) {
        return Promise.reject(new Error('Contrato não encontrado'));
      }
      return ContratoIntegracaoIxcService.link(contratoId, integracaoIxcProvedorId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contrato-integracao-ixc', contratoId] });
      success('Integração IXC vinculada ao contrato');
    },
    onError: (error) => {
      showApiError(error);
    },
  });
};
