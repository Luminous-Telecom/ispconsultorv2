import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContratoPlanoAdicionalService, CreateContratoPlanoAdicional, UpdateContratoPlanoAdicional } from '../services/contratoPlanoAdicionalService';

export const useContratoPlanosAdicionais = (contratoId: number | null) => {
  return useQuery({
    queryKey: ['contrato-planos-adicionais', contratoId],
    queryFn: async () => {
      if (!contratoId) return { success: true, data: [] };
      return await ContratoPlanoAdicionalService.list(contratoId);
    },
    enabled: !!contratoId
  });
};

export const useCreateContratoPlanoAdicional = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contratoId, data }: { contratoId: number; data: CreateContratoPlanoAdicional }) => {
      return await ContratoPlanoAdicionalService.create(contratoId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contrato-planos-adicionais', variables.contratoId] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    }
  });
};

export const useUpdateContratoPlanoAdicional = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateContratoPlanoAdicional }) => {
      return await ContratoPlanoAdicionalService.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contrato-planos-adicionais'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    }
  });
};

export const useDeleteContratoPlanoAdicional = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await ContratoPlanoAdicionalService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contrato-planos-adicionais'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    }
  });
};

