import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BlockdomiService } from 'services/blockdomiService';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';

interface UseImportarListaBlockdomiVersaoParams {
  show: boolean;
  showApiError: (error: unknown, fallback?: string) => void;
  success: (message: string) => void;
  t: BlockdomiImportTranslateFn;
}

export function useImportarListaBlockdomiVersao({ show, showApiError, success, t }: UseImportarListaBlockdomiVersaoParams) {
  const queryClient = useQueryClient();
  const [isGerandoVersao, setIsGerandoVersao] = useState(false);

  const { data: versaoAtual = '' } = useQuery({
    queryKey: ['blockdomi', 'versao-atual'],
    queryFn: () => BlockdomiService.getVersaoAtual(),
    enabled: show,
  });

  const handleGerarVersao = useCallback(async () => {
    setIsGerandoVersao(true);
    try {
      const result = await BlockdomiService.gerarVersao();
      success(`${t('blockdomi.versao')} ${result.numero} ${t('blockdomi.versaoGerada')}`);
      queryClient.invalidateQueries({ queryKey: ['blockdomi', 'versao-atual'] });
    } catch (e) {
      showApiError(e, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_GENERATE_VERSION_ERROR);
    } finally {
      setIsGerandoVersao(false);
    }
  }, [success, showApiError, t, queryClient]);

  return {
    versaoAtual,
    isGerandoVersao,
    handleGerarVersao,
  };
}
