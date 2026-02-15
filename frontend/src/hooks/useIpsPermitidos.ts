import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IpsPermitidosService } from '../services/ipsPermitidosService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import type { IpPermitidoFilters } from '../services/ipsPermitidosService';

function getErrorMessage(err: unknown, fallback: string): string {
  const withMessage = err as { message?: string };
  if (typeof withMessage?.message === 'string' && withMessage.message.trim()) {
    return withMessage.message;
  }
  const axiosErr = err as { response?: { data?: { message?: string } } };
  if (axiosErr.response?.data?.message) {
    return axiosErr.response.data.message;
  }
  return fallback;
}

export const useIpsPermitidos = (filters: IpPermitidoFilters = {}) => {
  return useQuery({
    queryKey: ['ips-permitidos', filters],
    queryFn: () => IpsPermitidosService.list(filters),
    staleTime: 30 * 1000,
    gcTime: CACHE_CONFIG.DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
};

export const useCreateIpPermitido = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: IpsPermitidosService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ips-permitidos'] });
      success('IPs permitidos cadastrados com sucesso!');
    },
    onError: (err) => {
      error(getErrorMessage(err, 'Erro ao cadastrar'));
    }
  });
};

export const useUpdateIpPermitido = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { faixa_ips: string } }) =>
      IpsPermitidosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ips-permitidos'] });
      success('IPs permitidos atualizados com sucesso!');
    },
    onError: (err) => {
      error(getErrorMessage(err, 'Erro ao atualizar'));
    }
  });
};

export const useDeleteIpPermitido = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: IpsPermitidosService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ips-permitidos'] });
      success('Registro excluído com sucesso!');
    },
    onError: (err) => {
      error(getErrorMessage(err, 'Erro ao excluir'));
    }
  });
};
