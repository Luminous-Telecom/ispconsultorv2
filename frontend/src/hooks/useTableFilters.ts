// Hook unificado para gerenciar filtros, busca e ordenação em tabelas
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearch } from './useSearch';
import { useFilters } from './useFilters';
import type { ColumnFilterRule } from 'components/tables/tableView/model';
import { ruleIsComplete } from 'components/tables/tableView/model';

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
   * Campo de busca inicial (ex.: razao_social, nome_plano)
   */
  initialSearchField?: string;

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
  setLimit: (limit: number, options?: { resetPage?: boolean }) => void;
  
  // Campo de busca (field)
  searchField: string;
  setSearchField: (field: string) => void;

  columnFilters: string | undefined;
  setColumnFilters: (rules: ColumnFilterRule[]) => void;
  
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
    columnFilters?: string;
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
 *   onSearchChange: (search) => void, // callback opcional
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
    initialSortColumn = 'id',
    initialSortDirection = 'desc',
    initialPage = 1,
    initialLimit = 15,
    initialSearchField = '',
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

  const onPageChangeRef = useRef(onPageChange);
  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

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

  // Campo de busca (field)
  const [searchField, setSearchFieldState] = useState<string>(initialSearchField);
  const [columnFilterRules, setColumnFilterRules] = useState<ColumnFilterRule[]>([]);
  const columnFiltersKey = JSON.stringify(columnFilterRules.map((rule) => ({
    columnKey: rule.columnKey,
    operator: rule.operator,
    value: rule.value,
  })));
  const skipColumnFilterPageReset = useRef(true);

  const setSearchField = useCallback((field: string) => {
    setSearchFieldState(field);
  }, []);

  const setColumnFilters = useCallback((rules: ColumnFilterRule[]) => {
    const complete = rules.filter(ruleIsComplete);
    setColumnFilterRules((prev) => {
      const prevKey = JSON.stringify(prev.map((rule) => ({
        columnKey: rule.columnKey,
        operator: rule.operator,
        value: rule.value,
      })));
      const nextKey = JSON.stringify(complete.map((rule) => ({
        columnKey: rule.columnKey,
        operator: rule.operator,
        value: rule.value,
      })));
      return prevKey === nextKey ? prev : complete;
    });
  }, []);

  useEffect(() => {
    if (skipColumnFilterPageReset.current) {
      skipColumnFilterPageReset.current = false;
      return;
    }
    if (!resetPageOnFilterChange) return;
    setPageState(1);
    onPageChangeRef.current?.(1);
  }, [columnFiltersKey, resetPageOnFilterChange]);

  // Hook de filtros
  const filtersHook = useFilters<TFilters>({
    initialFilters,
    onFiltersChange: (filters) => {
      onFiltersChange?.(filters);
      if (resetPageOnFilterChange) {
        setPageState(1);
        onPageChangeRef.current?.(1);
      }
    },
  });

  useEffect(() => {
    if (!resetPageOnFilterChange) return;
    if (searchHook.debouncedSearch === initialSearch) return;
    setPageState(1);
    onPageChangeRef.current?.(1);
  }, [searchHook.debouncedSearch, resetPageOnFilterChange, initialSearch]);

  // Função para definir ordenação
  const setSort = useCallback((column: string, direction?: SortDirection) => {
    const newDirection = direction || (sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortColumnState(column);
    setSortDirectionState(newDirection);
    onSortChange?.(column, newDirection);
    
    if (resetPageOnFilterChange) {
      setPageState(1);
      onPageChangeRef.current?.(1);
    }
  }, [sortColumn, sortDirection, onSortChange, resetPageOnFilterChange]);

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
      onPageChangeRef.current?.(1);
    }
  }, [sortColumn, sortDirection, onSortChange, resetPageOnFilterChange]);

  const clearSort = useCallback(() => {
    setSortColumnState(initialSortColumn);
    setSortDirectionState(initialSortDirection);
    onSortChange?.(initialSortColumn, initialSortDirection);
  }, [initialSortColumn, initialSortDirection, onSortChange]);

  // Função para definir página
  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
    onPageChangeRef.current?.(newPage);
  }, []);

  // Função para definir limite
  const setLimit = useCallback((newLimit: number, options?: { resetPage?: boolean }) => {
    const shouldResetPage = options?.resetPage !== false;
    setLimitState((prevLimit) => {
      if (prevLimit === newLimit) return prevLimit;
      if (shouldResetPage) {
        setPageState(1);
        onPageChangeRef.current?.(1);
      }
      onLimitChange?.(newLimit);
      return newLimit;
    });
  }, [onLimitChange]);

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
      columnFilters?: string;
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

    if (columnFilterRules.length > 0) {
      params.columnFilters = columnFiltersKey;
    }

    return params;
  }, [page, limit, searchHook.debouncedSearch, sortColumn, sortDirection, filtersHook.filters, columnFilterRules.length, columnFiltersKey]);

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
    
    // Campo de busca
    searchField,
    setSearchField,
    columnFilters: columnFilterRules.length > 0 ? columnFiltersKey : undefined,
    setColumnFilters,
    
    // Utilitários
    resetAll,
    hasActiveFiltersOrSearch,
    
    // Parâmetros para API
    apiParams,
  };
};

