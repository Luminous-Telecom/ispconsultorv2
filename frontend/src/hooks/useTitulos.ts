import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TituloService } from '../services/tituloService';
import { useNotificationContext } from '../contexts/NotificationContext';
import { CACHE_CONFIG } from '../config/api';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para listar parcelas
export const useTitulos = (filters: any = {}) => {
  console.log('🔍 [useTitulos] Hook chamado com filters:', filters);
  
  return useQuery({
    queryKey: ['titulos', filters],
    queryFn: () => {
      console.log('📡 [useTitulos] Executando queryFn, buscando títulos...');
      return TituloService.list(filters);
    },
    staleTime: 0, // Sempre considerar dados como stale para permitir refresh manual
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
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
      
      success(response.message);
      
      // Se um novo carnê foi gerado, invalidar também as queries de carnês
      if (response.novo_carne_gerado) {
        queryClient.invalidateQueries({ queryKey: ['carnes'] });
        queryClient.invalidateQueries({ queryKey: ['carnes-ativos'] });
      }
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao marcar parcela como paga');
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
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao desmarcar pagamento da parcela');
    },
  });
};

// Hook para atualizar parcela
export const useUpdateCarneParcela = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      TituloService.update(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcela', id] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas-carne'] });
      success((response as any).message);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao atualizar parcela');
    },
  });
};
