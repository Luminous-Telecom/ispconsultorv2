import { useQuery } from '@tanstack/react-query';
import { MensagemHistoricoService, MensagemHistoricoFilters } from '../services/mensagemHistoricoService';
import { CACHE_CONFIG } from '../config/api';

// Para React Query v5, use gcTime ao invés de cacheTime
const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para listar mensagens históricas
export const useMensagensHistorico = (filters: MensagemHistoricoFilters = {}) => {
  return useQuery({
    queryKey: ['mensagens-historico', filters],
    queryFn: () => MensagemHistoricoService.list(filters),
    staleTime: 0, // Sempre considerar dados como stale para permitir refresh manual
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

// Hook para buscar mensagem histórica por ID
export const useMensagemHistorico = (id: number) => {
  return useQuery({
    queryKey: ['mensagem-historico', id],
    queryFn: () => MensagemHistoricoService.getById(id),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

// Hook para buscar mensagens por entidade
export const useMensagensHistoricoByEntity = (
  entidadeTipo: string,
  entidadeId: number,
  filters: { page?: number; limit?: number } = {}
) => {
  return useQuery({
    queryKey: ['mensagens-historico-entidade', entidadeTipo, entidadeId, filters],
    queryFn: () => MensagemHistoricoService.getByEntity(entidadeTipo, entidadeId, filters),
    enabled: !!entidadeTipo && !!entidadeId,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
  });
};

// Hook específico para mensagens WhatsApp
export const useMensagensWhatsApp = (filters: Omit<MensagemHistoricoFilters, 'tipo'> = {}) => {
  return useMensagensHistorico({ ...filters, tipo: 'whatsapp' });
};

// Hook específico para mensagens Email
export const useMensagensEmail = (filters: Omit<MensagemHistoricoFilters, 'tipo'> = {}) => {
  return useMensagensHistorico({ ...filters, tipo: 'email' });
};