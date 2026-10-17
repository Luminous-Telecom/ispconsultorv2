import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TituloService } from '../services/tituloService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { CACHE_CONFIG } from '../config/api';
import { CarneParcelaFilters  } from '../types';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

const { DEFAULT_CACHE_TIME } = CACHE_CONFIG;

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

// Hook para marcar parcela como paga
export const useMarcarTituloPago = () => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

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
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TITULO_PAY_ERROR)
  });
};
