import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AtendimentoService } from '../services/atendimentoService';
import type {
  AtendimentoFilters,
  CreateAtendimentoArquivoRequest,
  UpdateAtendimento,
} from '../services/atendimentoService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

const { DEFAULT_CACHE_TIME } = CACHE_CONFIG;

export const useAtendimentos = (filters: AtendimentoFilters = {}, enabled = true) => {
  return useQuery({
    queryKey: ['atendimentos', filters],
    queryFn: () => AtendimentoService.list(filters),
    enabled,
    staleTime: 0,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

export const useAtendimento = (
  id: number | string | null | undefined,
  clienteId?: number,
  enabled = true
) => {
  return useQuery({
    queryKey: ['atendimento', id, clienteId],
    queryFn: () => AtendimentoService.getById(id as number | string, clienteId),
    enabled: enabled && id != null && id !== '',
    staleTime: 0,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

const invalidateAtendimentos = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await queryClient.refetchQueries({ queryKey: ['atendimentos'] });
};

export const useCreateAtendimento = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: AtendimentoService.create,
    onSuccess: () => {
      void invalidateAtendimentos(queryClient);
      success('Atendimento criado com sucesso');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.ATENDIMENTO_CREATE_ERROR),
  });
};

export const useUpdateAtendimento = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateAtendimento }) =>
      AtendimentoService.update(id, data),
    onSuccess: async (_data, { id }) => {
      await queryClient.invalidateQueries({ queryKey: ['atendimento', id] });
      await invalidateAtendimentos(queryClient);
      success('Atendimento atualizado com sucesso');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.ATENDIMENTO_UPDATE_ERROR),
  });
};

export const useDeleteAtendimento = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({ id, clienteId }: { id: number | string; clienteId?: number }) =>
      AtendimentoService.delete(id, clienteId),
    onSuccess: () => {
      void invalidateAtendimentos(queryClient);
      success('Atendimento excluído com sucesso');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.ATENDIMENTO_DELETE_ERROR),
  });
};
export const useAtendimentoMensagens = (
  atendimentoId: number | string | null | undefined,
  clienteId?: number,
  enabled = true
) => {
  return useQuery({
    queryKey: ['atendimento-mensagens', atendimentoId, clienteId],
    queryFn: () => AtendimentoService.listMensagens(atendimentoId as number | string, clienteId),
    enabled: enabled && atendimentoId != null && atendimentoId !== '',
    staleTime: 0,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

export const useCreateAtendimentoMensagem = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({
      id,
      mensagem,
      clienteId,
      su_status,
    }: {
      id: number | string;
      mensagem: string;
      clienteId?: number;
      su_status?: string;
    }) => AtendimentoService.createMensagem(id, mensagem, clienteId, su_status),
    onSuccess: async (_data, { id, clienteId }) => {
      await queryClient.invalidateQueries({ queryKey: ['atendimento-mensagens', id, clienteId] });
      await queryClient.invalidateQueries({ queryKey: ['atendimento', id] });
      await invalidateAtendimentos(queryClient);
      success('Mensagem registrada com sucesso');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.ATENDIMENTO_MENSAGEM_ERROR),
  });
};

export const useDeleteAtendimentoMensagem = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({
      atendimentoId,
      mensagemId,
      clienteId,
    }: {
      atendimentoId: number | string;
      mensagemId: number | string;
      clienteId?: number;
    }) => AtendimentoService.deleteMensagem(atendimentoId, mensagemId, clienteId),
    onSuccess: async (_data, { atendimentoId, clienteId }) => {
      await queryClient.invalidateQueries({
        queryKey: ['atendimento-mensagens', atendimentoId, clienteId],
      });
      success('Mensagem excluída com sucesso');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.ATENDIMENTO_MENSAGEM_ERROR),
  });
};

export const useAtendimentoArquivos = (
  atendimentoId: number | string | null | undefined,
  clienteId?: number,
  enabled = true
) => {
  return useQuery({
    queryKey: ['atendimento-arquivos', atendimentoId, clienteId],
    queryFn: () => AtendimentoService.listArquivos(atendimentoId as number | string, clienteId),
    enabled: enabled && atendimentoId != null && atendimentoId !== '',
    staleTime: 0,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useUploadAtendimentoArquivo = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({
      atendimentoId,
      clienteId,
      data,
    }: {
      atendimentoId: number | string;
      clienteId?: number;
      data: CreateAtendimentoArquivoRequest;
    }) => AtendimentoService.uploadArquivo(atendimentoId, data, clienteId),
    onSuccess: async (_data, { atendimentoId, clienteId }) => {
      await queryClient.invalidateQueries({
        queryKey: ['atendimento-arquivos', atendimentoId, clienteId],
      });
      success('Arquivo anexado com sucesso!');
    },
    onError: (err) => showApiError(err, 'Erro ao anexar arquivo'),
  });
};

export const useDeleteAtendimentoArquivo = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  return useMutation({
    mutationFn: ({
      atendimentoId,
      arquivoId,
      clienteId,
    }: {
      atendimentoId: number | string;
      arquivoId: number | string;
      clienteId?: number;
    }) => AtendimentoService.deleteArquivo(atendimentoId, arquivoId, clienteId),
    onSuccess: async (_data, { atendimentoId, clienteId }) => {
      await queryClient.invalidateQueries({
        queryKey: ['atendimento-arquivos', atendimentoId, clienteId],
      });
      success('Arquivo excluído com sucesso!');
    },
    onError: (err) => showApiError(err, 'Erro ao excluir arquivo'),
  });
};

export const useAtendimentoOrdensServico = (
  atendimentoId: number | string | null | undefined,
  clienteId?: number,
  enabled = true
) => {
  return useQuery({
    queryKey: ['atendimento-ordens-servico', atendimentoId, clienteId],
    queryFn: () =>
      AtendimentoService.listOrdensServico(atendimentoId as number | string, clienteId),
    enabled: enabled && atendimentoId != null && atendimentoId !== '',
    staleTime: 0,
    gcTime: DEFAULT_CACHE_TIME,
  });
};
