import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrdemServicoService } from '../services/ordemServicoService';
import type {
  OrdemServicoFilters,
  UpdateOrdemServico,
  OrdemServicoAcao,
  OrdemServicoAcaoPayload,
} from '../services/ordemServicoService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { useApiError } from './useApiError';

const { DEFAULT_CACHE_TIME } = CACHE_CONFIG;

export const useOrdensServico = (
  filters: OrdemServicoFilters = {},
  enabled = true
) => {
  return useQuery({
    queryKey: ['ordens-servico', filters],
    queryFn: () => OrdemServicoService.list(filters),
    enabled,
    staleTime: 0,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

export const useOrdemServicoMensagens = (
  ordemServicoId: number | string | null | undefined,
  enabled = true
) => {
  return useQuery({
    queryKey: ['ordem-servico-mensagens', ordemServicoId],
    queryFn: () => OrdemServicoService.listMensagens(ordemServicoId as number | string),
    enabled: enabled && ordemServicoId != null && ordemServicoId !== '',
    staleTime: 0,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
  });
};

const refreshOrdensServicoCache = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await queryClient.refetchQueries({ queryKey: ['ordens-servico'] });
};

export const useCreateOrdemServico = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: OrdemServicoService.create,
    onSuccess: async () => {
      await refreshOrdensServicoCache(queryClient);
      success('Ordem de serviço criada com sucesso!');
    },
    onError: (err) => showApiError(err, 'Erro ao criar ordem de serviço'),
  });
};

export const useUpdateOrdemServico = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateOrdemServico }) =>
      OrdemServicoService.update(id, data),
    onSuccess: async (_data, { id }) => {
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico', id] });
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico-mensagens', id] });
      await refreshOrdensServicoCache(queryClient);
      success('Ordem de serviço atualizada com sucesso!');
    },
    onError: (err) => showApiError(err, 'Erro ao atualizar ordem de serviço'),
  });
};

export const useDeleteOrdemServico = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: (id: number | string) => OrdemServicoService.delete(id),
    onSuccess: async () => {
      await refreshOrdensServicoCache(queryClient);
      success('Ordem de serviço excluída com sucesso!');
    },
    onError: (err) => showApiError(err, 'Erro ao excluir ordem de serviço'),
  });
};

export const useExecutarAcaoOrdemServico = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({
      id,
      acao,
      data,
    }: {
      id: number | string;
      acao: OrdemServicoAcao;
      data?: OrdemServicoAcaoPayload;
    }) => OrdemServicoService.executarAcao(id, acao, data),
    onSuccess: async (_data, { id }) => {
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico', id] });
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico-mensagens', id] });
      await refreshOrdensServicoCache(queryClient);
      success('Ação executada com sucesso!');
    },
    onError: (err) => {
      showApiError(err, 'Erro ao executar ação');
    },
  });
};

export const useDeleteOrdemServicoMensagem = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({
      ordemServicoId,
      mensagemId,
    }: {
      ordemServicoId: number | string;
      mensagemId: number | string;
    }) => OrdemServicoService.deleteMensagem(ordemServicoId, mensagemId),
    onSuccess: async (_data, { ordemServicoId }) => {
      await queryClient.invalidateQueries({ queryKey: ['ordem-servico-mensagens', ordemServicoId] });
      success('Mensagem excluída com sucesso!');
    },
    onError: (err) => showApiError(err, 'Erro ao excluir mensagem'),
  });
};
