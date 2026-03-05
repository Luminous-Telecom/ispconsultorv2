import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { getMensagemHistoricoService, MensagemHistoricoFilters } from '../services/mensagemHistoricoService';
import { CACHE_CONFIG } from '../config/api';

// Para React Query v5, use gcTime ao invés de cacheTime
const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

// Hook para listar mensagens históricas
export const useMensagensHistorico = (filters: MensagemHistoricoFilters = {}) => {
  const location = useLocation();
  const isSaas = location.pathname.startsWith('/saas');
  const service = getMensagemHistoricoService(isSaas);

  return useQuery({
    queryKey: ['mensagens-historico', isSaas ? 'saas' : 'tenant', filters],
    queryFn: () => service.list(filters),
    staleTime: 0, // Sempre considerar dados como stale para permitir refresh manual
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

// Hook para buscar mensagem histórica por ID
export const useMensagemHistorico = (id: number) => {
  const location = useLocation();
  const isSaas = location.pathname.startsWith('/saas');
  const service = getMensagemHistoricoService(isSaas);

  return useQuery({
    queryKey: ['mensagem-historico', isSaas ? 'saas' : 'tenant', id],
    queryFn: () => service.getById(id),
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
  const location = useLocation();
  const isSaas = location.pathname.startsWith('/saas');
  const service = getMensagemHistoricoService(isSaas);

  return useQuery({
    queryKey: ['mensagens-historico-entidade', isSaas ? 'saas' : 'tenant', entidadeTipo, entidadeId, filters],
    queryFn: () => service.getByEntity(entidadeTipo, entidadeId, filters),
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