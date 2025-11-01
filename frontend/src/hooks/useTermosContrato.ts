import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TermoContratoService, CreateTermoContratoData, UpdateTermoContratoData } from '../services/TermoContratoService';
import { useNotificationContext } from '../contexts/NotificationContext';
import { AxiosError } from 'axios';

export const useTermosContrato = (contratoId?: number) => {
  return useQuery({
    queryKey: ['termos-contrato', contratoId],
    queryFn: () => contratoId ? TermoContratoService.getByContrato(contratoId) : TermoContratoService.getAtivos(),
    enabled: !!contratoId,
  });
};

export const useCreateTermoContrato = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationContext();

  return useMutation({
    mutationFn: ({ contratoId, data }: { contratoId: number; data: CreateTermoContratoData }) =>
      TermoContratoService.create(contratoId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['termos-contrato', variables.contratoId] });
      queryClient.invalidateQueries({ queryKey: ['termos-contrato'] });
      addNotification('success', 'Termo criado com sucesso');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      addNotification('error', axiosError.response?.data?.message || 'Erro ao criar termo');
    }
  });
};

export const useUpdateTermoContrato = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTermoContratoData }) =>
      TermoContratoService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['termos-contrato', data.contrato_id] });
      queryClient.invalidateQueries({ queryKey: ['termos-contrato'] });
      addNotification('success', 'Termo atualizado com sucesso');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      addNotification('error', axiosError.response?.data?.message || 'Erro ao atualizar termo');
    }
  });
};

export const useMarcarTermoComoAceito = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, aceitoPor }: { id: number; aceitoPor: string }) =>
      TermoContratoService.marcarComoAceito(id, aceitoPor),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['termos-contrato', data.contrato_id] });
      queryClient.invalidateQueries({ queryKey: ['termos-contrato'] });
      addNotification('success', 'Termo marcado como aceito');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      addNotification('error', axiosError.response?.data?.message || 'Erro ao marcar termo como aceito');
    }
  });
};

export const useDeactivateTermoContrato = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationContext();

  return useMutation({
    mutationFn: (id: number) => TermoContratoService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['termos-contrato'] });
      addNotification('success', 'Termo desativado com sucesso');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      addNotification('error', axiosError.response?.data?.message || 'Erro ao desativar termo');
    }
  });
};

export const useDeleteTermoContrato = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => TermoContratoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['termos-contrato'] });
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      console.error('Erro ao deletar termo:', axiosError);
    }
  });
};
