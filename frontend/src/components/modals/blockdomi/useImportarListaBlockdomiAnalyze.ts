import { useState, useCallback, useMemo } from 'react';
import { BlockdomiService } from 'services/blockdomiService';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import type { ClassifiedList } from './importarListaBlockdomiTypes';
import { classifyLines } from './importarListaBlockdomiUtils';

interface UseImportarListaBlockdomiAnalyzeParams {
  rawText: string;
  showApiError: (error: unknown, fallback?: string) => void;
}

export function useImportarListaBlockdomiAnalyze({ rawText, showApiError }: UseImportarListaBlockdomiAnalyzeParams) {
  const [classified, setClassified] = useState<ClassifiedList | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalisar = useCallback(async () => {
    setIsAnalyzing(true);
    setClassified(null);
    try {
      const result = classifyLines(rawText);
      const totalItens = result.dominios.length + result.ipv4.length + result.ipv6.length;
      if (totalItens === 0) {
        setClassified(result);
        return;
      }

      const existing = await BlockdomiService.analisarLista({
        dominios: result.dominios,
        ipv4: result.ipv4,
        ipv6: result.ipv6,
      });

      const existingDominios = new Set(existing.dominios);
      const existingIPv4 = new Set(existing.ipv4);
      const existingIPv6 = new Set(existing.ipv6);

      const jaCadastrados: string[] = [
        ...result.dominios.filter((d) => existingDominios.has(d)),
        ...result.ipv4.filter((ip) => existingIPv4.has(ip)),
        ...result.ipv6.filter((ip) => existingIPv6.has(ip)),
      ];
      const seraoCadastrados: string[] = [
        ...result.dominios.filter((d) => !existingDominios.has(d)),
        ...result.ipv4.filter((ip) => !existingIPv4.has(ip)),
        ...result.ipv6.filter((ip) => !existingIPv6.has(ip)),
      ];

      setClassified({ ...result, jaCadastrados, seraoCadastrados });
    } catch (e) {
      setClassified(null);
      showApiError(e, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_ANALYZE_ERROR);
    } finally {
      setIsAnalyzing(false);
    }
  }, [rawText, showApiError]);

  const totalValid = useMemo(() => {
    if (!classified) return 0;
    return classified.dominios.length + classified.ipv4.length + classified.ipv6.length;
  }, [classified]);

  return {
    classified,
    setClassified,
    isAnalyzing,
    handleAnalisar,
    totalValid,
  };
}
