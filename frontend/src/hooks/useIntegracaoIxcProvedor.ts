import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IntegracaoIxcProvedorService,
  type IntegracaoIxcProvedorFilters,
  type UpsertIntegracaoIxcProvedor,
} from '../services/integracaoIxcProvedorService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { useApiError } from './useApiError';
import { CACHE_CONFIG } from '../config/api';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

export const useIntegracaoIxcProvedorList = (filters: IntegracaoIxcProvedorFilters = {}) => {
  return useQuery({
    queryKey: ['integracao-ixc-provedor', filters],
    queryFn: () => IntegracaoIxcProvedorService.list(filters),
    staleTime: 0,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

export const useIntegracaoIxcProvedor = (id: number | null) => {
  return useQuery({
    queryKey: ['integracao-ixc-provedor-item', id],
    queryFn: () => IntegracaoIxcProvedorService.getById(id as number),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

export const useIntegracaoIxcProvedorAtivos = () => {
  return useQuery({
    queryKey: ['integracao-ixc-provedor-ativos'],
    queryFn: () => IntegracaoIxcProvedorService.findAtivos(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

export const useCreateIntegracaoIxcProvedor = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: IntegracaoIxcProvedorService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracao-ixc-provedor'] });
      queryClient.invalidateQueries({ queryKey: ['integracao-ixc-provedor-ativos'] });
      success('Integração IXC Provedor salva com sucesso');
    },
    onError: (error) => showApiError(error),
  });
};

export const useUpdateIntegracaoIxcProvedor = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpsertIntegracaoIxcProvedor }) =>
      IntegracaoIxcProvedorService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['integracao-ixc-provedor'] });
      queryClient.invalidateQueries({ queryKey: ['integracao-ixc-provedor-item', id] });
      queryClient.invalidateQueries({ queryKey: ['integracao-ixc-provedor-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['contrato-integracao-ixc'] });
      success('Integração IXC Provedor salva com sucesso');
    },
    onError: (error) => showApiError(error),
  });
};

export const useDeleteIntegracaoIxcProvedor = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: IntegracaoIxcProvedorService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracao-ixc-provedor'] });
      queryClient.invalidateQueries({ queryKey: ['integracao-ixc-provedor-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['contrato-integracao-ixc'] });
      success('Integração IXC Provedor excluída com sucesso');
    },
    onError: (error) => showApiError(error),
  });
};

export const useTestIntegracaoIxcProvedor = () => {
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: (params: { id?: number; api_url?: string; api_token?: string }) => {
      if (params.id) {
        return IntegracaoIxcProvedorService.testConnection(params.id, {
          api_url: params.api_url,
          api_token: params.api_token,
        });
      }
      return IntegracaoIxcProvedorService.testConnectionWithCredentials({
        api_url: params.api_url ?? '',
        api_token: params.api_token ?? '',
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        success(result.message || 'Conexão com o IXC Provedor realizada com sucesso.');
      } else {
        showApiError(result.message || 'Falha ao testar integração com o IXC.');
      }
    },
    onError: (error) => showApiError(error),
  });
};

export const useSyncIntegracaoIxcProvedorOsCadastros = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: (id: number) => IntegracaoIxcProvedorService.syncOrdemServicoCadastros(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ixc-os-sync-logs'] });
      success(result.message || 'Dados de OS sincronizados com sucesso.');
    },
    onError: (error) => showApiError(error),
  });
};

export const useCheckIntegracaoIxcProvedorPermissions = () => {
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: (id: number) => IntegracaoIxcProvedorService.checkPermissions(id),
    onError: (error) => showApiError(error),
  });
};
