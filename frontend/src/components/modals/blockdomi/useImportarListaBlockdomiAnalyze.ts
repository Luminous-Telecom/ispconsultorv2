import { useState, useCallback, useMemo } from 'react';
import { DominioService } from 'services/dominioService';
import { IPv4Service } from 'services/ipv4Service';
import { IPv6Service } from 'services/ipv6Service';
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

  const fetchExisting = useCallback(async () => {
    const fetchAll = async <T,>(
      listFn: (f: { limit: number; page: number }) => Promise<{ data?: T[]; pagination?: { last_page: number } }>,
      key: keyof T & string
    ): Promise<Set<string>> => {
      const set = new Set<string>();
      let page = 1;
      while (true) {
        const res = await listFn({ limit: 5000, page });
        const arr = res?.data ?? [];
        arr.forEach((d) => set.add(String((d as Record<string, unknown>)[key] ?? '')));
        if (page >= (res?.pagination?.last_page ?? 1)) break;
        page++;
      }
      return set;
    };
    const [existingDominios, existingIPv4, existingIPv6] = await Promise.all([
      fetchAll(DominioService.list.bind(DominioService), 'dominio'),
      fetchAll(IPv4Service.list.bind(IPv4Service), 'ip'),
      fetchAll(IPv6Service.list.bind(IPv6Service), 'ip')
    ]);
    return { existingDominios, existingIPv4, existingIPv6 };
  }, []);

  const handleAnalisar = useCallback(async () => {
    setIsAnalyzing(true);
    setClassified(null);
    try {
      const result = classifyLines(rawText);
      const { existingDominios, existingIPv4, existingIPv6 } = await fetchExisting();
      const jaCadastrados: string[] = [
        ...result.dominios.filter((d) => existingDominios.has(d)),
        ...result.ipv4.filter((ip) => existingIPv4.has(ip)),
        ...result.ipv6.filter((ip) => existingIPv6.has(ip))
      ];
      const seraoCadastrados: string[] = [
        ...result.dominios.filter((d) => !existingDominios.has(d)),
        ...result.ipv4.filter((ip) => !existingIPv4.has(ip)),
        ...result.ipv6.filter((ip) => !existingIPv6.has(ip))
      ];
      setClassified({ ...result, jaCadastrados, seraoCadastrados });
    } catch (e) {
      setClassified(null);
      showApiError(e, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_ANALYZE_ERROR);
    } finally {
      setIsAnalyzing(false);
    }
  }, [rawText, fetchExisting, showApiError]);

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
