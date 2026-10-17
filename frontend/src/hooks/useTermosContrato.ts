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
      success( 'Termo salvo com sucesso');
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
