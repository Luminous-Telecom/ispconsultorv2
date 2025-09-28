import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CarneService } from '../services/carneService';
import { useNotificationContext } from '../contexts/NotificationContext';
import { CACHE_CONFIG } from '../config/api';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para listar carnês
export const useCarnes = (filters: any = {}) => {
  return useQuery({
    queryKey: ['carnes', filters],
    queryFn: () => CarneService.list(filters),
    staleTime: 0, // Sempre considerar dados como stale para permitir refresh manual
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

// Hook para buscar carnê por ID
export const useCarne = (id: number) => {
  return useQuery({
    queryKey: ['carne', id],
    queryFn: () => CarneService.getById(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

// Hook para buscar carnês ativos
export const useCarnesAtivos = () => {
  return useQuery({
    queryKey: ['carnes-ativos'],
    queryFn: () => CarneService.findAtivos(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

// Hook para criar carnê
export const useCreateCarne = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: CarneService.create,
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['carnes'] });
      queryClient.invalidateQueries({ queryKey: ['carnes-ativos'] });
      
      let mensagem = 'Carnê criado com sucesso!';
      
      // Verificar se títulos foram gerados automaticamente
      if (response.geracao_titulos?.success) {
        mensagem += ' Títulos gerados automaticamente na EFI.';
      } else if (response.geracao_titulos && !response.geracao_titulos.success) {
        mensagem += ' Carnê criado, mas falha ao gerar títulos automaticamente.';
      }
      
      success(mensagem);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao criar carnê');
    },
  });
};

// Hook para atualizar carnê
export const useUpdateCarne = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      CarneService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['carnes'] });
      queryClient.invalidateQueries({ queryKey: ['carne', id] });
      queryClient.invalidateQueries({ queryKey: ['carnes-ativos'] });
      success('Carnê atualizado com sucesso!');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao atualizar carnê');
    },
  });
};

// Hook para excluir carnê
export const useDeleteCarne = () => {
  const queryClient = useQueryClient();
  const { success, error, warning } = useNotificationContext();

  return useMutation({
    mutationFn: async (carneId: number) => {
      // Buscar detalhes para verificar parcelas pagas
      const carne = await CarneService.getById(carneId);
      const temParcelasPagas = Array.isArray((carne as any).parcelas)
        ? (carne as any).parcelas.some((p: any) => p.pago === true)
        : false;

      if (temParcelasPagas) {
        throw new Error('Não é possível excluir carnê com parcelas pagas.');
      }

      return CarneService.delete(carneId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carnes'] });
      queryClient.invalidateQueries({ queryKey: ['carnes-ativos'] });
      success('Carnê excluído com sucesso!');
    },
    onError: (err: any) => {
      if (err.message.includes('parcelas pagas')) {
        warning(err.message);
      } else {
        error(err.response?.data?.message || err.message || 'Erro ao excluir carnê');
      }
    },
  });
};
