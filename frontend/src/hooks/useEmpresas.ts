import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmpresaService, EmpresaFilters } from '../services/empresaService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CreateEmpresa, UpdateEmpresa } from '../types';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES, ERROR_MESSAGES } from '../constants/ErrorMessages';

export const useEmpresas = (filters: EmpresaFilters = {}) => {
  return useQuery({
    queryKey: ['empresas', filters],
    queryFn: () => EmpresaService.list(filters),
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

export const useCreateEmpresa = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: (data: CreateEmpresa) => EmpresaService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      success('Empresa criada com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_CREATE_ERROR),
  });
};

export const useUpdateEmpresa = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEmpresa }) =>
      EmpresaService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      success('Empresa atualizada com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_UPDATE_ERROR),
  });
};

export const useDeleteEmpresa = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: (id: number) => EmpresaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      success('Empresa excluída com sucesso!');
    },
    onError: (err) => showApiError(err, ERROR_MESSAGES.DELETE_ERROR),
  });
};
