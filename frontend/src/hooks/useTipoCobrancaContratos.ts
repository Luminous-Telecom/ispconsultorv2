import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TipoCobrancaContratoService, TipoCobrancaContrato, TipoCobrancaContratoFilters } from '../services/tipoCobrancaContratoService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

export const useTipoCobrancaContratos = (filters: TipoCobrancaContratoFilters = {}) => {
  return useQuery({
    queryKey: ['tipos-cobranca-contrato', filters],
    queryFn: () => TipoCobrancaContratoService.list(filters),
    staleTime: 0,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

export const useTipoCobrancaContrato = (id: number | null) => {
  return useQuery({
    queryKey: ['tipo-cobranca-contrato', id],
    queryFn: () => (id ? TipoCobrancaContratoService.getById(id) : Promise.reject()),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

export const useTipoCobrancaContratosAtivos = () => {
  return useQuery({
    queryKey: ['tipos-cobranca-contrato-ativos'],
    queryFn: () => TipoCobrancaContratoService.findAtivos(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

export const useCreateTipoCobrancaContrato = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: TipoCobrancaContratoService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-cobranca-contrato'] });
      queryClient.invalidateQueries({ queryKey: ['tipos-cobranca-contrato-ativos'] });
      success('Tipo de cobrança criado com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TIPO_COBRANCA_CREATE_ERROR),
  });
};

export const useUpdateTipoCobrancaContrato = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TipoCobrancaContrato> }) =>
      TipoCobrancaContratoService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tipos-cobranca-contrato'] });
      queryClient.invalidateQueries({ queryKey: ['tipo-cobranca-contrato', id] });
      queryClient.invalidateQueries({ queryKey: ['tipos-cobranca-contrato-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      success('Tipo de cobrança atualizado com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TIPO_COBRANCA_UPDATE_ERROR),
  });
};

export const useDeleteTipoCobrancaContrato = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: TipoCobrancaContratoService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-cobranca-contrato'] });
      queryClient.invalidateQueries({ queryKey: ['tipos-cobranca-contrato-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      success('Tipo de cobrança excluído com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TIPO_COBRANCA_DELETE_ERROR),
  });
};
