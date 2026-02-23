import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { EmpresaService, EmpresaFilters } from '../services/empresaService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CreateEmpresa, UpdateEmpresa } from '../types';

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
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: (data: CreateEmpresa) => EmpresaService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      success('Empresa criada com sucesso!');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao criar empresa');
    },
  });
};

export const useUpdateEmpresa = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEmpresa }) =>
      EmpresaService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      success('Empresa atualizada com sucesso!');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao atualizar empresa');
    },
  });
};

export const useDeleteEmpresa = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: (id: number) => EmpresaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      success('Empresa excluída com sucesso!');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao excluir empresa');
    },
  });
};
