import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ModeloTermoService, { ModeloTermo, CreateModeloTermoData, UpdateModeloTermoData } from '../services/modeloTermoService';
import { useNotificationContext } from '../contexts/NotificationContext';

export const useModelosTermo = () => {
  return useQuery({
    queryKey: ['modelos-termo'],
    queryFn: () => ModeloTermoService.list(),
  });
};

export const useModeloTermoById = (id: number) => {
  return useQuery({
    queryKey: ['modelo-termo', id],
    queryFn: () => ModeloTermoService.getById(id),
    enabled: !!id,
  });
};

export const useModelosTermoByTipo = (tipo: string) => {
  return useQuery({
    queryKey: ['modelos-termo', 'tipo', tipo],
    queryFn: () => ModeloTermoService.getByTipo(tipo),
    enabled: !!tipo,
  });
};

export const useCreateModeloTermo = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationContext();

  return useMutation({
    mutationFn: (data: CreateModeloTermoData) => ModeloTermoService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-termo'] });
      addNotification('success', 'Modelo de termo criado com sucesso');
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.message || 'Erro ao criar modelo de termo');
    }
  });
};

export const useUpdateModeloTermo = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateModeloTermoData }) =>
      ModeloTermoService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-termo'] });
      addNotification('success', 'Modelo de termo atualizado com sucesso');
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.message || 'Erro ao atualizar modelo de termo');
    }
  });
};

export const useDeleteModeloTermo = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationContext();

  return useMutation({
    mutationFn: (id: number) => ModeloTermoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-termo'] });
      addNotification('success', 'Modelo de termo excluído com sucesso');
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.message || 'Erro ao excluir modelo de termo');
    }
  });
};
