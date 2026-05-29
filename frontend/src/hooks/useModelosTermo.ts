import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ModeloTermoService, { CreateModeloTermoData, UpdateModeloTermoData } from '../services/modeloTermoService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

export const useModelosTermo = () => {
  return useQuery({
    queryKey: ['modelos-termo'],
    queryFn: async () => {
      const response = await ModeloTermoService.list();
      return response.data;
    },
  });
};

export const useModelosTermoByTipo = (tipo: string) => {
  return useQuery({
    queryKey: ['modelos-termo', tipo],
    queryFn: async () => {
      const response = await ModeloTermoService.getByTipo(tipo);
      return response.data;
    },
    enabled: !!tipo,
  });
};

export const useModeloTermo = (id: number) => {
  return useQuery({
    queryKey: ['modelo-termo', id],
    queryFn: async () => {
      const response = await ModeloTermoService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateModeloTermo = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: async (data: CreateModeloTermoData) => {
      const response = await ModeloTermoService.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-termo'] });
      success('Modelo de termo criado com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.DOCUMENT_CREATE_ERROR),
  });
};

export const useUpdateModeloTermo = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateModeloTermoData }) => {
      const response = await ModeloTermoService.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-termo'] });
      success('Modelo de termo atualizado com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.DOCUMENT_UPDATE_ERROR),
  });
};

export const useDeleteModeloTermo = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: (id: number) => ModeloTermoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-termo'] });
      success('Modelo de termo excluído com sucesso!');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.DOCUMENT_DELETE_ERROR),
  });
};
