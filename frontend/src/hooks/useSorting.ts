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
export const useSorting = <T extends Record<string, any>>(
  data: T[] | undefined,
  sortColumn: string,
  sortDirection: 'asc' | 'desc'
): T[] => {
  return useMemo(() => {
    if (!data || !sortColumn) {
      return data || [];
    }

    return [...data].sort((a, b) => {
      let aValue: any = a[sortColumn as keyof T];
      let bValue: any = b[sortColumn as keyof T];

      // Converter para string se necessário para comparação
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }

      // Converter datas se necessário
      if (sortColumn.includes('data') || sortColumn.includes('created_at')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Converter números se necessário
      if (sortColumn.includes('valor') || sortColumn.includes('total') || sortColumn.includes('quantidade')) {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      // Tratar valores nulos/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortColumn, sortDirection]);
};

