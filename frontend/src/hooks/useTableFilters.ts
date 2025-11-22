// Hook unificado para gerenciar filtros, busca e ordenação em tabelas
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearch } from './useSearch';
import { useFilters } from './useFilters';

/**
 * Direção de ordenação
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Opções para o hook useTableFilters
 */
export interface UseTableFiltersOptions<
  TFilters extends Record<string, string | number | boolean | null | undefined | object> = Record<string, string | number | boolean | null | undefined | object>
> {
  /**
   * Valor inicial da busca
   */
  initialSearch?: string;
  
  /**
   * Filtros iniciais
   */
  initialFilters?: TFilters;
  
  /**
   * Coluna inicial para ordenação
   */
  initialSortColumn?: string;
  
  /**
   * Direção inicial da ordenação
   */
  initialSortDirection?: SortDirection;
  
  /**
   * Página inicial
   */
  initialPage?: number;
  
  /**
   * Limite inicial de itens por página
   */
  initialLimit?: number;
  
  /**
   * Tempo de debounce para busca (em ms)
   */
  searchDebounceMs?: number;
  
  /**
   * Se true, busca é imediata (sem debounce)
   */
  immediateSearch?: boolean;
  
  /**
   * Callback chamado quando a busca muda
   */
  onSearchChange?: (search: string) => void;
  
  /**
   * Callback chamado quando os filtros mudam
   */
  onFiltersChange?: (filters: TFilters) => void;
  
  /**
   * Callback chamado quando a ordenação muda
   */
  onSortChange?: (column: string, direction: SortDirection) => void;
  
  /**
   * Callback chamado quando a página muda
   */
  onPageChange?: (page: number) => void;
  
  /**
   * Callback chamado quando o limite muda
   */
  onLimitChange?: (limit: number) => void;
  
  /**
   * Se true, reseta a página para 1 quando busca ou filtros mudam
   */
  resetPageOnFilterChange?: boolean;
}

/**
 * Retorno do hook useTableFilters
 */
export interface UseTableFiltersReturn<
  TFilters extends Record<string, string | number | boolean | null | undefined | object> = Record<string, string | number | boolean | null | undefined | object>
> {
  // Busca
  search: string;
  setSearch: (value: string) => void;
  clearSearch: () => void;
  debouncedSearch: string;
  
  // Filtros
  filters: TFilters;
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  setFilters: (filters: Partial<TFilters>) => void;
  resetFilters: () => void;
  clearFilter: (key: keyof TFilters) => void;
  hasActiveFilters: boolean;
  getActiveFiltersCount: () => number;
  
  // Ordenação
  sortColumn: string;
  sortDirection: SortDirection;
  setSort: (column: string, direction?: SortDirection) => void;
  toggleSort: (column: string) => void;
  clearSort: () => void;
  
  // Paginação
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  
  // Utilitários
  resetAll: () => void;
  hasActiveFiltersOrSearch: boolean;
  
  // Parâmetros prontos para API
  apiParams: {
    search?: string;
    page: number;
    limit: number;
    sortColumn?: string;
    sortDirection?: SortDirection;
    filters: TFilters;
  };
}

/**
 * Hook unificado para gerenciar filtros, busca, ordenação e paginação em tabelas
 * 
 * @example
 * ```typescript
 * const tableFilters = useTableFilters({
 *   initialSearch: '',
 *   initialFilters: { status: 'ativo' },
 *   initialSortColumn: 'id',
 *   initialSortDirection: 'desc',
 *   onSearchChange: (search) => console.log('Busca:', search),
 *   resetPageOnFilterChange: true
 * });
 * 
 * // Usar em query
 * const { data } = useQuery({
 *   queryKey: ['items', tableFilters.apiParams],
 *   queryFn: () => fetchItems(tableFilters.apiParams)
 * });
 * ```
 */
export const useTableFilters = <
  TFilters extends Record<string, string | number | boolean | null | undefined | object> = Record<string, string | number | boolean | null | undefined | object>
>(options: UseTableFiltersOptions<TFilters> = {}): UseTableFiltersReturn<TFilters> => {
  const {
    initialSearch = '',
    initialFilters = {} as TFilters,
    initialSortColumn = '',
    initialSortDirection = 'asc',
    initialPage = 1,
    initialLimit = 15,
    searchDebounceMs = 300,
    immediateSearch = false,
    onSearchChange,
    onFiltersChange,
    onSortChange,
    onPageChange,
    onLimitChange,
    resetPageOnFilterChange = true,
  } = options;

  // Estados de paginação
  const [page, setPageState] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);
  
  // Estados de ordenação
  const [sortColumn, setSortColumnState] = useState(initialSortColumn);
  const [sortDirection, setSortDirectionState] = useState<SortDirection>(initialSortDirection);

  // Hook de busca
  const searchHook = useSearch({
    initialSearch,
    debounceMs: searchDebounceMs,
    onSearchChange,
    immediate: immediateSearch,
  });

  // Hook de filtros
  const filtersHook = useFilters<TFilters>({
    initialFilters,
    onFiltersChange: (filters) => {
      onFiltersChange?.(filters);
      if (resetPageOnFilterChange) {
        setPageState(1);
        onPageChange?.(1);
      }
    },
  });

  // Resetar página quando busca mudar (após debounce)
  useEffect(() => {
    if (resetPageOnFilterChange && searchHook.debouncedSearch !== initialSearch) {
      setPageState(1);
      onPageChange?.(1);
    }
  }, [searchHook.debouncedSearch, resetPageOnFilterChange, initialSearch, onPageChange]);

  // Função para definir ordenação
  const setSort = useCallback((column: string, direction?: SortDirection) => {
    const newDirection = direction || (sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortColumnState(column);
    setSortDirectionState(newDirection);
    onSortChange?.(column, newDirection);
    
    if (resetPageOnFilterChange) {
      setPageState(1);
      onPageChange?.(1);
    }
  }, [sortColumn, sortDirection, onSortChange, resetPageOnFilterChange, onPageChange]);

  // Função para alternar ordenação
  const toggleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortColumnState(column);
      setSortDirectionState(newDirection);
      onSortChange?.(column, newDirection);
    } else {
      setSortColumnState(column);
      setSortDirectionState('asc');
      onSortChange?.(column, 'asc');
    }
    
    if (resetPageOnFilterChange) {
      setPageState(1);
      onPageChange?.(1);
    }
  }, [sortColumn, sortDirection, onSortChange, resetPageOnFilterChange, onPageChange]);

  // Função para limpar ordenação
  const clearSort = useCallback(() => {
    setSortColumnState(initialSortColumn);
    setSortDirectionState(initialSortDirection);
    onSortChange?.(initialSortColumn, initialSortDirection);
  }, [initialSortColumn, initialSortDirection, onSortChange]);

  // Função para definir página
  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
    onPageChange?.(newPage);
  }, [onPageChange]);

  // Função para definir limite
  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
    setPageState(1); // Resetar para primeira página ao mudar limite
    onLimitChange?.(newLimit);
    onPageChange?.(1);
  }, [onLimitChange, onPageChange]);

  // Função para resetar tudo
  const resetAll = useCallback(() => {
    searchHook.clearSearch();
    filtersHook.resetFilters();
    clearSort();
    setPage(initialPage);
    setLimit(initialLimit);
  }, [searchHook, filtersHook, clearSort, initialPage, initialLimit, setPage, setLimit]);

  // Verificar se há filtros ou busca ativos
  const hasActiveFiltersOrSearch = useMemo(() => {
    return filtersHook.hasActiveFilters || searchHook.debouncedSearch.length > 0;
  }, [filtersHook.hasActiveFilters, searchHook.debouncedSearch]);

  // Parâmetros prontos para API
  const apiParams = useMemo(() => {
    const params: {
      search?: string;
      page: number;
      limit: number;
      sortColumn?: string;
      sortDirection?: SortDirection;
      filters: TFilters;
    } = {
      page,
      limit,
      filters: filtersHook.filters,
    };

    if (searchHook.debouncedSearch) {
      params.search = searchHook.debouncedSearch;
    }

    if (sortColumn) {
      params.sortColumn = sortColumn;
      params.sortDirection = sortDirection;
    }

    return params;
  }, [page, limit, searchHook.debouncedSearch, sortColumn, sortDirection, filtersHook.filters]);

  return {
    // Busca
    search: searchHook.search,
    setSearch: searchHook.setSearch,
    clearSearch: searchHook.clearSearch,
    debouncedSearch: searchHook.debouncedSearch,
    
    // Filtros
    filters: filtersHook.filters,
    setFilter: filtersHook.setFilter,
    setFilters: filtersHook.setFilters,
    resetFilters: filtersHook.resetFilters,
    clearFilter: filtersHook.clearFilter,
    hasActiveFilters: filtersHook.hasActiveFilters,
    getActiveFiltersCount: filtersHook.getActiveFiltersCount,
    
    // Ordenação
    sortColumn,
    sortDirection,
    setSort,
    toggleSort,
    clearSort,
    
    // Paginação
    page,
    limit,
    setPage,
    setLimit,
    
    // Utilitários
    resetAll,
    hasActiveFiltersOrSearch,
    
    // Parâmetros para API
    apiParams,
  };
};

