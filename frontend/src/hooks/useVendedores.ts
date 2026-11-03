import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';
import { useI18n } from '../contexts/I18nContext';
import { useApiError } from './useApiError';
import { Vendedor, VendedorFilters, VendedorPayload, VendedorService } from '../services/vendedorService';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

export const useVendedores = (filters: VendedorFilters = {}) => {
  return useQuery({
    queryKey: ['vendedores', filters],
    queryFn: () => VendedorService.list(filters),
    staleTime: 0,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

export const useVendedor = (id: number | null) => {
  return useQuery({
    queryKey: ['vendedor', id],
    queryFn: () => (id ? VendedorService.getById(id) : Promise.reject()),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

export const useVendedoresAtivos = () => {
  return useQuery<Vendedor[]>({
    queryKey: ['vendedores-ativos'],
    queryFn: () => VendedorService.findAtivos(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

export const useCreateVendedor = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const { t } = useI18n();

  return useMutation({
    mutationFn: (data: VendedorPayload) => VendedorService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      queryClient.invalidateQueries({ queryKey: ['vendedores-ativos'] });
      success(t('messages.sellerSaved'));
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.VENDEDOR_CREATE_ERROR),
  });
};

export const useUpdateVendedor = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const { t } = useI18n();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<VendedorPayload> }) =>
      VendedorService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      queryClient.invalidateQueries({ queryKey: ['vendedor', id] });
      queryClient.invalidateQueries({ queryKey: ['vendedores-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      success(t('messages.sellerUpdated'));
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.VENDEDOR_UPDATE_ERROR),
  });
};

export const useDeleteVendedor = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const { t } = useI18n();

  return useMutation({
    mutationFn: VendedorService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      queryClient.invalidateQueries({ queryKey: ['vendedores-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      success(t('messages.sellerDeleted'));
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.VENDEDOR_DELETE_ERROR),
  });
};
