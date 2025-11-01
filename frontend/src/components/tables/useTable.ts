import { useState, useCallback, useMemo, useEffect } from 'react';
import { UseTableOptions, UseTableReturn, TableState, TableActions, SortDirection } from './types';
import { FilterValue } from '../../types/common';

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

  // Estado inicial
  const [state, setState] = useState<TableState<T>>({
    data: data || [],
    filteredData: data || [],
    selectedItems: [],
    searchTerm: '',
    sortColumn: '',
    sortDirection: 'asc',
    filters: {},
    currentPage: pagination?.current_page || 1,
    pageSize: pagination?.per_page || 15,
    isLoading: false,
    isFiltered: false,
    isSorted: false,
  });

  // Atualizar dados quando props mudarem
  useEffect(() => {
    setState(prev => {
      const newData = data || [];
      // Só atualiza se os dados realmente mudaram
      if (prev.data !== newData) {
        return {
          ...prev,
          data: newData,
          filteredData: newData,
        };
      }
      return prev;
    });
  }, [data]);

  // Filtrar dados baseado em busca e filtros
  const filteredData = useMemo(() => {
    let result = [...state.data];

    // Aplicar busca
    if (state.searchTerm && searchable) {
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
  }, [state.data, state.searchTerm, state.filters, columns, searchable]);

  // Ordenar dados
  const sortedData = useMemo(() => {
    if (!state.sortColumn || !sortable) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[state.sortColumn as keyof T];
      const bValue = b[state.sortColumn as keyof T];

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

      return state.sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, state.sortColumn, state.sortDirection, sortable]);

  // Paginar dados
  const paginatedData = useMemo(() => {
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, state.currentPage, state.pageSize]);

  // Calcular total de páginas
  const totalPages = useMemo(() => {
    if (pagination) return pagination.last_page;
    return Math.ceil(sortedData.length / state.pageSize);
  }, [pagination, sortedData.length, state.pageSize]);

  // Verificar se tem próxima/anterior página
  const hasNextPage = state.currentPage < totalPages;
  const hasPreviousPage = state.currentPage > 1;

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
  const actions: TableActions<T> = {
    setData: useCallback((newData: T[]) => {
      setState(prev => ({
        ...prev,
        data: newData,
        filteredData: newData,
      }));
      onDataChange?.(newData);
    }, [onDataChange]),

    setSelectedItems: useCallback((items: T[]) => {
      setState(prev => ({ ...prev, selectedItems: items }));
      onSelectionChange?.(items);
    }, [onSelectionChange]),

    setSearchTerm: useCallback((term: string) => {
      setState(prev => ({ ...prev, searchTerm: term }));
      onSearch?.(term);
    }, [onSearch]),

    setSort: useCallback((column: string, direction: SortDirection) => {
      setState(prev => ({
        ...prev,
        sortColumn: column,
        sortDirection: direction,
        isSorted: true,
      }));
      onSort?.(column, direction);
    }, [onSort]),

    setFilter: useCallback((key: string, value: FilterValue) => {
      setState(prev => ({
        ...prev,
        filters: { ...prev.filters, [key]: value },
        isFiltered: true,
      }));
      onFilter?.({ ...state.filters, [key]: value });
    }, [onFilter, state.filters]),

    setFilters: useCallback((newFilters: Record<string, FilterValue>) => {
      setState(prev => ({
        ...prev,
        filters: newFilters,
        isFiltered: Object.values(newFilters).some(value => 
          value !== null && value !== undefined && value !== ''
        ),
      }));
      onFilter?.(newFilters);
    }, [onFilter]),

    clearFilters: useCallback(() => {
      setState(prev => ({
        ...prev,
        filters: {},
        isFiltered: false,
      }));
      onFilter?.({});
    }, [onFilter]),

    setPage: useCallback((page: number) => {
      setState(prev => ({ ...prev, currentPage: page }));
      onPageChange?.(page);
    }, [onPageChange]),

    setPageSize: useCallback((size: number) => {
      setState(prev => ({
        ...prev,
        pageSize: size,
        currentPage: 1, // Reset para primeira página
      }));
      onPageSizeChange?.(size);
    }, [onPageSizeChange]),

    refresh: useCallback(() => {
      setState(prev => ({ ...prev, isLoading: true }));
      onRefresh?.();
      // Simular loading por um tempo mínimo
      setTimeout(() => {
        setState(prev => ({ ...prev, isLoading: false }));
      }, 300);
    }, [onRefresh]),

    selectAll: useCallback(() => {
      if (!selectable) return;
      const allItems = paginatedData;
      setState(prev => ({ ...prev, selectedItems: allItems }));
      onSelectionChange?.(allItems);
    }, [selectable, paginatedData, onSelectionChange]),

    clearSelection: useCallback(() => {
      setState(prev => ({ ...prev, selectedItems: [] }));
      onSelectionChange?.([]);
    }, [onSelectionChange]),

    toggleSelection: useCallback((item: T) => {
      if (!selectable) return;
      
      const isSelected = state.selectedItems.some(selected => selected.id === item.id);
      let newSelection: T[];
      
      if (isSelected) {
        newSelection = state.selectedItems.filter(selected => selected.id !== item.id);
      } else {
        if (multiSelect) {
          newSelection = [...state.selectedItems, item];
        } else {
          newSelection = [item];
        }
      }
      
      setState(prev => ({ ...prev, selectedItems: newSelection }));
      onSelectionChange?.(newSelection);
    }, [selectable, multiSelect, state.selectedItems, onSelectionChange]),
  };

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
