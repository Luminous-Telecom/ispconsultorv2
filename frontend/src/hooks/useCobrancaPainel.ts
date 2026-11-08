import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useApiError } from 'hooks/useApiError';
import { AgendaCobrancaFilters, CobrancaPainelService } from 'services/cobrancaPainelService';

export function useCobrancaIndicadores(mes: string, enabled: boolean) {
  const { showApiError } = useApiError();
  const query = useQuery({
    queryKey: ['cobranca-indicadores', mes],
    queryFn: () => CobrancaPainelService.indicadores(mes),
    enabled,
    staleTime: 0,
    placeholderData: (anterior) => anterior,
  });

  useEffect(() => {
    if (query.error) showApiError(query.error, CONTEXT_ERROR_MESSAGES.COBRANCA_LOAD_ERROR);
  }, [query.error, showApiError]);

  return query;
}

export function useCobrancaAgenda(filters: AgendaCobrancaFilters, enabled: boolean) {
  const { showApiError } = useApiError();
  const query = useQuery({
    queryKey: ['cobranca-agenda', filters],
    queryFn: () => CobrancaPainelService.agenda(filters),
    enabled,
    staleTime: 0,
    placeholderData: (anterior) => anterior,
  });

  useEffect(() => {
    if (query.error) showApiError(query.error, CONTEXT_ERROR_MESSAGES.COBRANCA_LOAD_ERROR);
  }, [query.error, showApiError]);

  return query;
}
