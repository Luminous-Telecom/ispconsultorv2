import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TituloService } from '../services/tituloService';
import { useNotificationContext } from '../contexts/NotificationContext';
import { CACHE_CONFIG } from '../config/api';
import { AxiosError } from 'axios';
import { CarneParcelaFilters, CarneParcela } from '../types';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para listar parcelas
export const useTitulos = (filters: CarneParcelaFilters = {}) => {
  return useQuery({
    queryKey: ['titulos', filters],
    queryFn: () => TituloService.list(filters),
    staleTime: 30 * 1000, // 30 segundos - dados ficam fresh por 30s
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Não refetch automático ao montar
    enabled: !!filters.cliente_id, // Só executar se cliente_id estiver definido
  });
};

// Hook para buscar parcela por ID
export const useCarneParcela = (id: number) => {
  return useQuery({
    queryKey: ['carne-parcela', id],
    queryFn: () => TituloService.getById(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

// Hook para buscar parcelas por carnê
export const useCarneParcelasByCarne = (carneId: number) => {
  return useQuery({
    queryKey: ['carne-parcelas-carne', carneId],
    queryFn: () => TituloService.findByCarne(carneId),
    enabled: !!carneId,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

// Hook para buscar parcelas vencidas
export const useCarneParcelasVencidas = () => {
  return useQuery({
    queryKey: ['carne-parcelas-vencidas'],
    queryFn: () => TituloService.findVencidas(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

// Hook para marcar parcela como paga
export const useMarcarTituloPago = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ({ 
      id, 
      dataPagamento, 
      valorPago, 
      observacoes 
    }: { 
      id: number; 
      dataPagamento?: string;
      valorPago?: number;
      observacoes?: string;
    }) =>
      TituloService.marcarPago(id, dataPagamento, valorPago, observacoes),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcela', id] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas-carne'] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas-vencidas'] });
      queryClient.invalidateQueries({ queryKey: ['carnes'] });
      queryClient.invalidateQueries({ queryKey: ['carnes-ativos'] });
      
      success(response.message);
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao marcar parcela como paga');
    },
  });
};

// Hook para desmarcar pagamento da parcela
export const useDesmarcarParcelaPago = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: (id: number) => TituloService.desmarcarPago(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcela', id] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas-carne'] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas-vencidas'] });
      success('Pagamento desmarcado com sucesso!');
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao desmarcar pagamento da parcela');
    },
  });
};

// Hook para atualizar parcela
export const useUpdateCarneParcela = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CarneParcela> }) =>
      TituloService.update(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcela', id] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas-carne'] });
      success(response.message);
    },
    onError: (err) => {
      const axiosError = err as AxiosError<{ message: string }>;
      error(axiosError.response?.data?.message || 'Erro ao atualizar parcela');
    },
  });
};
