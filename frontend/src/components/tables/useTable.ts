/* eslint-disable no-console */
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { UseTableOptions, UseTableReturn, TableState, TableActions, SortDirection, TablePagination } from './types';
import { FilterValue } from 'types/common';

// Helper para normalizar paginação (aceita snake_case da API ou camelCase interno)
const normalizePagination = (pagination: UseTableOptions<unknown>['pagination']): TablePagination | undefined => {
  if (!pagination) return undefined;
  
  const pag = pagination as TablePagination & {
    current_page?: number;
    last_page?: number;
    per_page?: number;
  };
  
  return {
    currentPage: pag.currentPage ?? pag.current_page ?? 1,
    lastPage: pag.lastPage ?? pag.last_page ?? 1,
    perPage: pag.perPage ?? pag.per_page ?? 15,
    total: pag.total,
    from: pag.from,
    to: pag.to,
  };
};

export const useTable = <T extends { id: number | string }>(options: UseTableOptions<T>): UseTableReturn<T> => {
  const {
    data,
    columns,
    pagination,
    filters: _filters = [],
    searchable = true,
    sortable: _sortable = true,
    sortColumn: propSortColumn,
    sortDirection: propSortDirection,
    selectable = true,
    multiSelect = false,
    onDataChange,
    onSelectionChange,
    onSort,
    onFilter,
    onSearch,
    onPageChange,
    onPageSizeChange,
    onRefresh,
  } = options;

  // Normalizar paginação
  const normalizedPagination = useMemo(() => normalizePagination(pagination), [pagination]);

  // Refs para callbacks (evita problemas de closure e re-render)
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onDataChangeRef = useRef(onDataChange);
  const onSearchRef = useRef(onSearch);
  const onSortRef = useRef(onSort);
  const onFilterRef = useRef(onFilter);
  const onPageChangeRef = useRef(onPageChange);
  const onPageSizeChangeRef = useRef(onPageSizeChange);
  const onRefreshRef = useRef(onRefresh);

  // Atualizar refs quando callbacks mudarem
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
    onDataChangeRef.current = onDataChange;
    onSearchRef.current = onSearch;
    onSortRef.current = onSort;
    onFilterRef.current = onFilter;
    onPageChangeRef.current = onPageChange;
    onPageSizeChangeRef.current = onPageSizeChange;
    onRefreshRef.current = onRefresh;
  }, [
    onSelectionChange, 
    onDataChange, 
    onSearch, 
    onSort, 
    onFilter, 
    onPageChange, 
    onPageSizeChange, 
    onRefresh
  ]);

  // Estado inicial
  const [state, setState] = useState<TableState<T>>({
    data: Array.isArray(data) ? data : [],
    filteredData: Array.isArray(data) ? data : [],
    selectedItems: [],
    searchTerm: '',
    searchInputValue: '',
    sortColumn: propSortColumn || '',
    sortDirection: propSortDirection || 'asc',
    filters: {},
    currentPage: normalizedPagination?.currentPage || 1,
    pageSize: normalizedPagination?.perPage || 15,
    isLoading: false,
    isFiltered: false,
    isSorted: !!propSortColumn,
  });

  // Atualizar estado de ordenação quando props mudarem (modo controlado)
  useEffect(() => {
    if (propSortColumn !== undefined) {
      setState(prev => {
        if (prev.sortColumn === propSortColumn && prev.sortDirection === propSortDirection) return prev;
        return {
          ...prev,
          sortColumn: propSortColumn || '',
          sortDirection: propSortDirection || 'asc',
          isSorted: !!propSortColumn
        };
      });
    }
  }, [propSortColumn, propSortDirection]);
  
  // Estado para rastrear mudanças de seleção e chamar callback após render
  const [pendingSelectionChange, setPendingSelectionChange] = useState<T[] | null>(null);
  
  // Efeito para chamar callback após atualização do estado
  useEffect(() => {
    if (pendingSelectionChange !== null) {
      onSelectionChangeRef.current?.(pendingSelectionChange);
      setPendingSelectionChange(null);
    }
  }, [pendingSelectionChange]);

  // Atualizar dados quando props mudarem
  useEffect(() => {
    const newData = Array.isArray(data) ? data : [];
    setState(prev => {
      // Verificar se os dados realmente mudaram (comparar tamanho e IDs para evitar comparação de referência)
      const dataChanged = prev.data.length !== newData.length || 
        newData.some((item, index) => !prev.data[index] || prev.data[index].id !== item.id);
      
      if (dataChanged || prev.data !== newData) {
        // Manter seleção por id, mas apontar para os objetos atuais de newData (evita stale após refetch)
        const idToItem = new Map(newData.map(item => [item.id, item]));
        const syncedSelectedItems = prev.selectedItems
          .map(sel => idToItem.get(sel.id))
          .filter((item): item is T => item !== undefined);
        const selectionIdsChanged =
          syncedSelectedItems.length !== prev.selectedItems.length ||
          syncedSelectedItems.some((item, i) => item.id !== prev.selectedItems[i]?.id);
        const selectionRefsStale = syncedSelectedItems.some((item, i) => item !== prev.selectedItems[i]);
        if (selectionIdsChanged || selectionRefsStale) {
          queueMicrotask(() => setPendingSelectionChange(syncedSelectedItems));
        }
        return {
          ...prev,
          data: newData,
          filteredData: newData,
          selectedItems: syncedSelectedItems,
        };
      }
      return prev;
    });
  }, [data]);

  // Atualizar estado de paginação quando prop pagination mudar
  useEffect(() => {
    if (normalizedPagination) {
      setState(prev => ({
        ...prev,
        currentPage: normalizedPagination.currentPage,
        pageSize: normalizedPagination.perPage,
      }));
    }
  }, [normalizedPagination]);

  // Filtrar dados baseado em busca e filtros
  const filteredData = useMemo(() => {
    let result = [...state.data];

    // Aplicar busca apenas se não houver paginação do servidor (busca é feita no servidor)
    // Se há paginação, a busca já foi feita no servidor, então não filtrar localmente
    if (state.searchTerm && searchable && !pagination) {
      const searchLower = state.searchTerm.toLowerCase();
      result = result.filter(item => {
        return columns.some(column => {
          if (!column.searchable) return false;
          const value = item[column.key as keyof T];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
      });
    }

    // Aplicar filtros
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        result = result.filter(item => {
          const itemValue = item[key as keyof T];
          if (typeof value === 'string') {
            return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
          }
          return itemValue === value;
        });
      }
    });

    return result;
  }, [state.data, state.searchTerm, state.filters, columns, searchable, pagination]);

  // TODA ordenação deve ser feita no backend
  // Se há sortColumn/sortDirection, o backend deve ordenar antes de retornar os dados
  // Se não há sortColumn mas há paginação, o backend já ordena por padrão (id DESC)
  const sortedData = useMemo(() => {
    // Se há ordenação especificada (sortColumn) ou paginação, assumir que dados já vêm ordenados do backend
    // Não ordenar localmente em nenhum caso - sempre usar ordenação do backend
    return filteredData;
  }, [filteredData]);

  // Paginar dados
  // Se há paginação do servidor, os dados já vêm paginados, não fazer slice local
  const paginatedData = useMemo(() => {
    if (pagination) {
      // Paginação do servidor: dados já vêm paginados do backend
      return sortedData;
    }
    // Paginação local: fazer slice dos dados
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, state.currentPage, state.pageSize, pagination]);

  // Calcular total de páginas
  const totalPages = useMemo(() => {
    if (normalizedPagination) return normalizedPagination.lastPage;
    return Math.ceil(sortedData.length / state.pageSize);
  }, [normalizedPagination, sortedData.length, state.pageSize]);

  // Obter página atual (usar pagination se disponível, senão usar state)
  const currentPage = normalizedPagination ? normalizedPagination.currentPage : state.currentPage;

  // Verificar se tem próxima/anterior página
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Verificar seleção
  const isAllSelected = useMemo(() => {
    if (!selectable || paginatedData.length === 0) return false;
    return paginatedData.every(item => 
      state.selectedItems.some(selected => selected.id === item.id)
    );
  }, [selectable, paginatedData, state.selectedItems]);

  const isPartiallySelected = useMemo(() => {
    if (!selectable) return false;
    const selectedCount = paginatedData.filter(item => 
      state.selectedItems.some(selected => selected.id === item.id)
    ).length;
    return selectedCount > 0 && selectedCount < paginatedData.length;
  }, [selectable, paginatedData, state.selectedItems]);

  // Ações da tabela - Memoizadas individualmente para estabilidade
  const setData = useCallback((newData: T[]) => {
    setState(prev => ({
      ...prev,
      data: newData,
      filteredData: newData,
    }));
    onDataChangeRef.current?.(newData);
  }, []);

  const setSelectedItems = useCallback((items: T[]) => {
    setState(prev => ({ ...prev, selectedItems: items }));
    onSelectionChangeRef.current?.(items);
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setState(prev => {
      if (prev.searchTerm === term && prev.searchInputValue === term) return prev;
      return { ...prev, searchTerm: term, searchInputValue: term };
    });
  }, []);

  const setSearchInputValue = useCallback((term: string) => {
    setState(prev => {
      if (prev.searchInputValue === term) return prev;
      return { ...prev, searchInputValue: term };
    });
  }, []);

  const executeSearch = useCallback(() => {
    setState(prev => {
      const term = prev.searchInputValue;
      if (prev.searchTerm === term) return prev;
      // Não chamar onSearch dentro do updater: causa "Cannot update a component while rendering a different component"
      queueMicrotask(() => onSearchRef.current?.(term, ''));
      return { ...prev, searchTerm: term };
    });
  }, []);

  const setSort = useCallback((column: string, direction: SortDirection) => {
    setState(prev => {
      if (prev.sortColumn === column && prev.sortDirection === direction && prev.isSorted) return prev;
      return {
        ...prev,
        sortColumn: column,
        sortDirection: direction,
        isSorted: true,
      };
    });
  }, []);

  const lastSort = useRef({ column: state.sortColumn, direction: state.sortDirection });
  useEffect(() => {
    if (state.isSorted && (lastSort.current.column !== state.sortColumn || lastSort.current.direction !== state.sortDirection)) {
      lastSort.current = { column: state.sortColumn, direction: state.sortDirection };
      onSortRef.current?.(state.sortColumn, state.sortDirection);
    }
  }, [state.isSorted, state.sortColumn, state.sortDirection]);

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setState(prev => {
      if (prev.filters[key] === value) return prev;
      return {
        ...prev,
        filters: { ...prev.filters, [key]: value },
        isFiltered: true,
      };
    });
  }, []);

  const setFilters = useCallback((newFilters: Record<string, FilterValue>) => {
    setState(prev => {
      const isSame = Object.keys(newFilters).length === Object.keys(prev.filters).length &&
        Object.keys(newFilters).every(key => newFilters[key] === prev.filters[key]);
      
      if (isSame) return prev;

      return {
        ...prev,
        filters: newFilters,
        isFiltered: Object.values(newFilters).some(value => 
          value !== null && value !== undefined && value !== ''
        ),
      };
    });
  }, []);

  const lastFilters = useRef(state.filters);
  useEffect(() => {
    if (state.isFiltered && JSON.stringify(lastFilters.current) !== JSON.stringify(state.filters)) {
      lastFilters.current = state.filters;
      onFilterRef.current?.(state.filters);
    }
  }, [state.isFiltered, state.filters]);

  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {},
      isFiltered: false,
    }));
    onFilterRef.current?.({});
  }, []);

  const setPage = useCallback((page: number) => {
    setState(prev => {
      if (prev.currentPage === page) return prev;
      return { ...prev, currentPage: page };
    });
  }, []);

  const lastPage = useRef(state.currentPage);
  useEffect(() => {
    if (lastPage.current !== state.currentPage) {
      lastPage.current = state.currentPage;
      onPageChangeRef.current?.(state.currentPage);
    }
  }, [state.currentPage]);

  const setPageSize = useCallback((size: number) => {
    setState(prev => {
      if (prev.pageSize === size) return prev;
      return {
        ...prev,
        pageSize: size,
        currentPage: 1,
      };
    });
  }, []);

  const lastPageSize = useRef(state.pageSize);
  useEffect(() => {
    if (lastPageSize.current !== state.pageSize) {
      lastPageSize.current = state.pageSize;
      onPageSizeChangeRef.current?.(state.pageSize);
    }
  }, [state.pageSize]);

  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true }));
    onRefreshRef.current?.();
    setTimeout(() => {
      setState(prev => ({ ...prev, isLoading: false }));
    }, 300);
  }, []);

  const selectAll = useCallback(() => {
    if (!selectable) return;
    if (multiSelect) {
      setState(prev => ({ ...prev, selectedItems: paginatedData }));
      setPendingSelectionChange(paginatedData);
    } else {
      const firstItem = paginatedData[0];
      if (firstItem) {
        setState(prev => ({ ...prev, selectedItems: [firstItem] }));
        setPendingSelectionChange([firstItem]);
      }
    }
  }, [selectable, multiSelect, paginatedData]);

  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedItems: [] }));
    setPendingSelectionChange([]);
  }, []);

  const toggleSelection = useCallback((item: T) => {
    if (!selectable) return;
    setState(prev => {
      const isSelected = prev.selectedItems.some(selected => selected.id === item.id);
      let newSelection: T[];
      if (isSelected) {
        newSelection = prev.selectedItems.filter(selected => selected.id !== item.id);
      } else {
        newSelection = multiSelect ? [...prev.selectedItems, item] : [item];
      }
      setPendingSelectionChange(newSelection);
      return { ...prev, selectedItems: newSelection };
    });
  }, [selectable, multiSelect]);

  const actions: TableActions<T> = useMemo(() => ({
    setData,
    setSelectedItems,
    setSearchTerm,
    setSearchInputValue,
    executeSearch,
    setSort,
    setFilter,
    setFilters,
    clearFilters,
    setPage,
    setPageSize,
    refresh,
    selectAll,
    clearSelection,
    toggleSelection,
  }), [
    setData,
    setSelectedItems,
    setSearchTerm,
    setSearchInputValue,
    executeSearch,
    setSort,
    setFilter,
    setFilters,
    clearFilters,
    setPage,
    setPageSize,
    refresh,
    selectAll,
    clearSelection,
    toggleSelection,
  ]);

  return {
    state,
    actions,
    filteredData,
    paginatedData,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    isAllSelected,
    isPartiallySelected,
  };
};
