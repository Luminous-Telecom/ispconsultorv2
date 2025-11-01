import { useMemo } from 'react';

/**
 * Hook reutilizável para ordenação de dados em tabelas
 * 
 * @template T - Tipo dos dados a serem ordenados
 * @param data - Array de dados para ordenar
 * @param sortColumn - Nome da coluna para ordenar
 * @param sortDirection - Direção da ordenação ('asc' ou 'desc')
 * @returns Array ordenado
 * 
 * @example
 * ```typescript
 * const sortedPlanos = useSorting(planos, 'nome_plano', 'asc');
 * ```
 */
export const useSorting = <T extends Record<string, unknown>>(
  data: T[] | undefined,
  sortColumn: string,
  sortDirection: 'asc' | 'desc'
): T[] => {
  return useMemo(() => {
    if (!data || !sortColumn) {
      return data || [];
    }

    return [...data].sort((a, b) => {
      let aValue: unknown = a[sortColumn as keyof T];
      let bValue: unknown = b[sortColumn as keyof T];

      // Converter para string se necessário para comparação
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }

      // Converter datas se necessário
      if (sortColumn.includes('data') || sortColumn.includes('created_at')) {
        const aDate = aValue as string | number | Date | undefined;
        const bDate = bValue as string | number | Date | undefined;
        aValue = new Date(aDate as string | number | Date).getTime();
        bValue = new Date(bDate as string | number | Date).getTime();
      }

      // Converter números se necessário
      if (sortColumn.includes('valor') || sortColumn.includes('total') || sortColumn.includes('quantidade')) {
        const aStr = aValue as string | undefined;
        const bStr = bValue as string | undefined;
        aValue = parseFloat(aStr as string) || 0;
        bValue = parseFloat(bStr as string) || 0;
      }

      // Tratar valores nulos/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      const aVal = aValue as string | number;
      const bVal = bValue as string | number;

      if (aVal < bVal) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortColumn, sortDirection]);
};

