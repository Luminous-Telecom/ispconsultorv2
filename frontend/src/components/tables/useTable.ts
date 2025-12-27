import { useState, useMemo, useEffect, useRef } from 'react';
import { UseTableOptions, UseTableReturn, TableState, TableActions, SortDirection, TablePagination } from './types';
import { FilterValue } from '@/types/common';

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
    sortable = true,
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
    data: data || [],
    filteredData: data || [],
    selectedItems: [],
    searchTerm: '',
    sortColumn: '',
    sortDirection: 'asc',
    filters: {},
    currentPage: normalizedPagination?.currentPage || 1,
    pageSize: normalizedPagination?.perPage || 15,
    isLoading: false,
    isFiltered: false,
    isSorted: false,
  });
  
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
    setState(prev => {
      const newData = data || [];
      // Verificar se os dados realmente mudaram (comparar tamanho e IDs para evitar comparação de referência)
      const dataChanged = prev.data.length !== newData.length || 
        newData.some((item, index) => !prev.data[index] || prev.data[index].id !== item.id);
      
      if (dataChanged || prev.data !== newData) {
        return {
          ...prev,
          data: newData,
          filteredData: newData,
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

  // Ordenar dados
  const sortedData = useMemo(() => {
    if (!sortable) return filteredData;

    // Se não há coluna de ordenação especificada, usar ordenação padrão por ID decrescente
    const sortColumn = state.sortColumn || 'id';
    const sortDirection = state.sortColumn ? state.sortDirection : 'desc';

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn as keyof T];
      const bValue = b[sortColumn as keyof T];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, state.sortColumn, state.sortDirection, sortable]);

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

  // Ações da tabela
  const actions: TableActions<T> = useMemo(() => ({
    setData: (newData: T[]) => {
      setState(prev => ({
        ...prev,
        data: newData,
        filteredData: newData,
      }));
      onDataChangeRef.current?.(newData);
    },

    setSelectedItems: (items: T[]) => {
      setState(prev => ({ ...prev, selectedItems: items }));
      onSelectionChangeRef.current?.(items);
    },

    setSearchTerm: (term: string) => {
      setState(prev => {
        if (prev.searchTerm === term) return prev;
        return { ...prev, searchTerm: term };
      });
      onSearchRef.current?.(term, '');
    },

    setSort: (column: string, direction: SortDirection) => {
      setState(prev => {
        if (prev.sortColumn === column && prev.sortDirection === direction && prev.isSorted) return prev;
        return {
          ...prev,
          sortColumn: column,
          sortDirection: direction,
          isSorted: true,
        };
      });
      onSortRef.current?.(column, direction);
    },

    setFilter: (key: string, value: FilterValue) => {
      setState(prev => {
        if (prev.filters[key] === value) return prev;
        return {
          ...prev,
          filters: { ...prev.filters, [key]: value },
          isFiltered: true,
        };
      });
      onFilterRef.current?.({ ...state.filters, [key]: value });
    },

    setFilters: (newFilters: Record<string, FilterValue>) => {
      setState(prev => {
        // Comparação superficial simples para evitar atualizações desnecessárias
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
      onFilterRef.current?.(newFilters);
    },

    clearFilters: () => {
      setState(prev => {
        if (Object.keys(prev.filters).length === 0 && !prev.isFiltered) return prev;
        return {
          ...prev,
          filters: {},
          isFiltered: false,
        };
      });
      onFilterRef.current?.({});
    },

    setPage: (page: number) => {
      setState(prev => {
        if (prev.currentPage === page) return prev;
        return { ...prev, currentPage: page };
      });
      onPageChangeRef.current?.(page);
    },

    setPageSize: (size: number) => {
      setState(prev => {
        if (prev.pageSize === size) return prev;
        return {
          ...prev,
          pageSize: size,
          currentPage: 1, // Reset para primeira página
        };
      });
      onPageSizeChangeRef.current?.(size);
    },

    refresh: () => {
      setState(prev => ({ ...prev, isLoading: true }));
      onRefreshRef.current?.();
      // Simular loading por um tempo mínimo
      setTimeout(() => {
        setState(prev => ({ ...prev, isLoading: false }));
      }, 300);
    },

    selectAll: () => {
      if (!selectable) return;
      if (multiSelect) {
        // Seleção múltipla: seleciona todos os itens da página atual
        const allItems = paginatedData;
        setState(prev => ({ ...prev, selectedItems: allItems }));
        setPendingSelectionChange(allItems);
      } else {
        // Seleção única: seleciona apenas o primeiro item da página atual
        const firstItem = paginatedData[0];
        if (firstItem) {
          setState(prev => ({ ...prev, selectedItems: [firstItem] }));
          setPendingSelectionChange([firstItem]);
        }
      }
    },

    clearSelection: () => {
      setState(prev => ({ ...prev, selectedItems: [] }));
      setPendingSelectionChange([]);
    },

    toggleSelection: (item: T) => {
      if (!selectable) return;
      
      // Usar estado anterior dentro do setState para evitar stale closure
      setState(prev => {
        const isSelected = prev.selectedItems.some(selected => selected.id === item.id);
        let newSelection: T[];
        
        if (isSelected) {
          newSelection = prev.selectedItems.filter(selected => selected.id !== item.id);
        } else {
          if (multiSelect) {
            newSelection = [...prev.selectedItems, item];
          } else {
            // Seleção única: substitui qualquer seleção anterior
            newSelection = [item];
          }
        }
        
        // Marca para chamar callback após render (evita setState durante render)
        setPendingSelectionChange(newSelection);
        
        return { ...prev, selectedItems: newSelection };
      });
    },
  }), [
    state.filters,
    selectable,
    multiSelect,
    paginatedData,
    // Callbacks removidos daqui porque usamos refs
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
