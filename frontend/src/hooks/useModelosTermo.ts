import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ModeloTermoService, { ModeloTermo, CreateModeloTermoData, UpdateModeloTermoData } from '../services/modeloTermoService';
import { useNotificationContext } from '../contexts/NotificationContext';

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
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: async (data: CreateModeloTermoData) => {
      const response = await ModeloTermoService.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-termo'] });
      success('Modelo de termo criado com sucesso!');
    },
    onError: (error: any) => {
      error(error.response?.data?.message || 'Erro ao criar modelo de termo');
    },
  });
};

export const useUpdateModeloTermo = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateModeloTermoData }) => {
      const response = await ModeloTermoService.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-termo'] });
      success('Modelo de termo atualizado com sucesso!');
    },
    onError: (error: any) => {
      error(error.response?.data?.message || 'Erro ao atualizar modelo de termo');
    },
  });
};

export const useDeleteModeloTermo = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: (id: number) => ModeloTermoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-termo'] });
      success('Modelo de termo excluído com sucesso!');
    },
    onError: (error: any) => {
      error(error.response?.data?.message || 'Erro ao excluir modelo de termo');
    },
  });
};