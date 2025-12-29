import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContaPagarService } from '../services/contaPagarService';
import { UpdateContaPagar, ContaPagarFilters } from '../types';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { AxiosError } from 'axios';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para listar contas a pagar
export const useContasPagar = (filters: ContaPagarFilters = {}) => {
  return useQuery({
    queryKey: ['contas-pagar', filters],
    queryFn: () => ContaPagarService.list(filters),
    staleTime: 0, // Sempre considerar dados como stale para permitir refresh manual
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

// Hook para buscar conta a pagar por ID
export const useContaPagar = (id: number | null) => {
  return useQuery({
    queryKey: ['conta-pagar', id],
    queryFn: () => ContaPagarService.getById(id!),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

// Hook para criar conta a pagar
export const useCreateContaPagar = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ContaPagarService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      success('Conta a pagar criada com sucesso!');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao criar conta a pagar');
    },
  });
};

// Hook para atualizar conta a pagar
export const useUpdateContaPagar = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateContaPagar }) =>
      ContaPagarService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['conta-pagar', id] });
      success('Conta a pagar atualizada com sucesso!');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao atualizar conta a pagar');
    },
  });
};

// Hook para excluir conta a pagar
export const useDeleteContaPagar = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ContaPagarService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      success('Conta a pagar excluída com sucesso!');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao excluir conta a pagar');
    },
  });
};

// Hook para pagar conta a pagar
export const usePagarContaPagar = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { data?: string; valor: number; tipo_pagamento: string; observacao?: string } }) =>
      ContaPagarService.pagar(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['conta-pagar', id] });
      success('Pagamento registrado com sucesso!');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao registrar pagamento');
    },
  });
};

// Hook para duplicar conta a pagar
export const useDuplicarContaPagar = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ContaPagarService.duplicar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      success('Conta a pagar duplicada com sucesso!');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao duplicar conta a pagar');
    },
  });
};


