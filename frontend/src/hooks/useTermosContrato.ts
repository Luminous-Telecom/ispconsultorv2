import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TermoContratoService, CreateTermoContratoData, UpdateTermoContratoData, GetByContratoOptions } from '../services/termoContratoService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

export const useTermosContrato = (contratoId?: number, options?: GetByContratoOptions) => {
  return useQuery({
    queryKey: ['termos-contrato', contratoId, options?.sortColumn, options?.sortDirection],
    queryFn: () => contratoId ? TermoContratoService.getByContrato(contratoId, options) : TermoContratoService.getAtivos(),
    enabled: !!contratoId,
  });
};

export const useCreateTermoContrato = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({ contratoId, data }: { contratoId: number; data: CreateTermoContratoData }) =>
      TermoContratoService.create(contratoId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['termos-contrato', variables.contratoId] });
      queryClient.invalidateQueries({ queryKey: ['termos-contrato'] });
      success( 'Termo criado com sucesso');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TERM_CREATE_ERROR),
  });
};

export const useUpdateTermoContrato = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTermoContratoData }) =>
      TermoContratoService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['termos-contrato', data.contrato_id] });
      queryClient.invalidateQueries({ queryKey: ['termos-contrato'] });
      success( 'Termo atualizado com sucesso');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TERM_UPDATE_ERROR),
  });
};

export const useMarcarTermoComoAceito = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({ id, aceitoPor }: { id: number; aceitoPor: string }) =>
      TermoContratoService.marcarComoAceito(id, aceitoPor),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['termos-contrato', data.contrato_id] });
      queryClient.invalidateQueries({ queryKey: ['termos-contrato'] });
      success( 'Termo marcado como aceito');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TERM_ACCEPT_ERROR),
  });
};

export const useDeactivateTermoContrato = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: (id: number) => TermoContratoService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['termos-contrato'] });
      success( 'Termo desativado com sucesso');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TERM_DEACTIVATE_ERROR),
  });
};

export const useDeleteTermoContrato = () => {
  const queryClient = useQueryClient();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: (id: number) => TermoContratoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['termos-contrato'] });
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TERM_DELETE_ERROR),
  });
};
