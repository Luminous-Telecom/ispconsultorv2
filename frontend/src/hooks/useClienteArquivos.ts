import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ClienteArquivoService, { CreateClienteArquivoRequest, UpdateClienteArquivoRequest } from '@/services/clienteArquivoService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';

interface UseClienteArquivosOptions {
  clienteId?: number | null;
  filters?: {
    tipo?: string;
    origem?: string;
    sortColumn?: string;
    sortDirection?: string;
  };
}

export const useClienteArquivos = ({ clienteId, filters }: UseClienteArquivosOptions = {}) => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  // Query para listar arquivos
  const { data: arquivos = [], isLoading, refetch } = useQuery({
    queryKey: ['cliente-arquivos', clienteId, filters],
    queryFn: () => ClienteArquivoService.list(clienteId!, filters),
    enabled: !!clienteId,
    staleTime: 0
  });

  // Mutation para criar arquivo
  const createMutation = useMutation({
    mutationFn: (data: CreateClienteArquivoRequest) => ClienteArquivoService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente-arquivos'] });
      success('Arquivo adicionado com sucesso');
    },
    onError: (err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao adicionar arquivo';
      error(errorMessage);
    }
  });

  // Mutation para atualizar arquivo
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClienteArquivoRequest }) =>
      ClienteArquivoService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente-arquivos'] });
      success('Arquivo atualizado com sucesso');
    },
    onError: (err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar arquivo';
      error(errorMessage);
    }
  });

  // Mutation para deletar arquivo
  const deleteMutation = useMutation({
    mutationFn: (id: number) => ClienteArquivoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente-arquivos'] });
      success('Arquivo deletado com sucesso');
    },
    onError: (err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar arquivo';
      error(errorMessage);
    }
  });

  return {
    arquivos,
    isLoading,
    refetch,
    createMutation,
    updateMutation,
    deleteMutation
  };
};
