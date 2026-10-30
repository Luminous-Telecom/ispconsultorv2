/* eslint-disable no-console */
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { FilterValue } from 'types/common';
import type { TableActions, TableState, UseTableOptions, UseTableReturn } from '../types';
import { useTableCallbackRefs } from './useTableCallbackRefs';
import { useTablePagination } from './useTablePagination';
import { useTableSelection } from './useTableSelection';
import { useTableSort } from './useTableSort';
import {
  filterTableData,
  hasDataChanged,
  normalizePagination,
  syncSelectedItemsWithData,
} from './utils';

export const useTable = <T extends { id: number | string }>(
  options: UseTableOptions<T>
): UseTableReturn<T> => {
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
    columnRules = [],
    serverHandlesColumnFilters = false,
  } = options;

  const normalizedPagination = useMemo(() => normalizePagination(pagination), [pagination]);

  const refs = useTableCallbackRefs(options);

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

  const filteredData = useMemo(
    () =>
      filterTableData(
        state.data,
        columns,
        state.searchTerm,
        state.filters,
        searchable,
        !!pagination,
        columnRules,
        serverHandlesColumnFilters
      ),
    [state.data, state.searchTerm, state.filters, columns, searchable, pagination, columnRules, serverHandlesColumnFilters]
  );

  const { sortedData, setSort } = useTableSort({
    columns,
    sortable: _sortable,
    propSortColumn,
    propSortDirection,
    normalizedPagination,
    filteredData,
    state,
    setState,
    onSortRef: refs.onSortRef,
  });

  const paginationResult = useTablePagination({
    pagination,
    normalizedPagination,
    sortedData,
    state,
    setState,
    onPageChangeRef: refs.onPageChangeRef,
    onPageSizeChangeRef: refs.onPageSizeChangeRef,
  });

  const {
    setPendingSelectionChange,
    isAllSelected,
    isPartiallySelected,
    setSelectedItems,
    selectAll,
    clearSelection,
    toggleSelection,
  } = useTableSelection({
    selectable,
    multiSelect,
    paginatedData: paginationResult.paginatedData,
    state,
    setState,
    onSelectionChangeRef: refs.onSelectionChangeRef,
  });

  useEffect(() => {
    const newData = Array.isArray(data) ? data : [];
    setState((prev) => {
      if (!hasDataChanged(prev.data, newData)) return prev;

      const { syncedSelectedItems, shouldNotify } = syncSelectedItemsWithData(
        prev.selectedItems,
        newData
      );
      if (shouldNotify) {
        queueMicrotask(() => setPendingSelectionChange(syncedSelectedItems));
      }
      return {
        ...prev,
        data: newData,
        filteredData: newData,
        selectedItems: syncedSelectedItems,
      };
    });
  }, [data, setPendingSelectionChange]);

  const setData = useCallback((newData: T[]) => {
    setState((prev) => ({
      ...prev,
      data: newData,
      filteredData: newData,
    }));
    refs.onDataChangeRef.current?.(newData);
  }, [refs.onDataChangeRef]);

  const setSearchTerm = useCallback((term: string) => {
    setState((prev) => {
      if (prev.searchTerm === term && prev.searchInputValue === term) return prev;
      return { ...prev, searchTerm: term, searchInputValue: term };
    });
  }, []);

  const setSearchInputValue = useCallback((term: string) => {
    setState((prev) => {
      if (prev.searchInputValue === term) return prev;
      return { ...prev, searchInputValue: term };
    });
  }, []);

  const executeSearch = useCallback(() => {
    setState((prev) => {
      const term = prev.searchInputValue;
      if (prev.searchTerm === term) return prev;
      queueMicrotask(() => refs.onSearchRef.current?.(term, ''));
      return { ...prev, searchTerm: term };
    });
  }, [refs.onSearchRef]);

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setState((prev) => {
      if (prev.filters[key] === value) return prev;
      return {
        ...prev,
        filters: { ...prev.filters, [key]: value },
        isFiltered: true,
      };
    });
  }, []);

  const setFilters = useCallback((newFilters: Record<string, FilterValue>) => {
    setState((prev) => {
      const isSame =
        Object.keys(newFilters).length === Object.keys(prev.filters).length &&
        Object.keys(newFilters).every((key) => newFilters[key] === prev.filters[key]);

      if (isSame) return prev;

      return {
        ...prev,
        filters: newFilters,
        isFiltered: Object.values(newFilters).some(
          (value) => value !== null && value !== undefined && value !== ''
        ),
      };
    });
  }, []);

  const lastFilters = useRef(state.filters);
  useEffect(() => {
    if (
      state.isFiltered &&
      JSON.stringify(lastFilters.current) !== JSON.stringify(state.filters)
    ) {
      lastFilters.current = state.filters;
      refs.onFilterRef.current?.(state.filters);
    }
  }, [state.isFiltered, state.filters, refs.onFilterRef]);

  const clearFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: {},
      isFiltered: false,
    }));
    refs.onFilterRef.current?.({});
  }, [refs.onFilterRef]);

  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true }));
    refs.onRefreshRef.current?.();
    setTimeout(() => {
      setState((prev) => ({ ...prev, isLoading: false }));
    }, 300);
  }, [refs.onRefreshRef]);

  const actions: TableActions<T> = useMemo(
    () => ({
      setData,
      setSelectedItems,
      setSearchTerm,
      setSearchInputValue,
      executeSearch,
      setSort,
      setFilter,
      setFilters,
      clearFilters,
      setPage: paginationResult.setPage,
      setPageSize: paginationResult.setPageSize,
      refresh,
      selectAll,
      clearSelection,
      toggleSelection,
    }),
    [
      setData,
      setSelectedItems,
      setSearchTerm,
      setSearchInputValue,
      executeSearch,
      setSort,
      setFilter,
      setFilters,
      clearFilters,
      paginationResult.setPage,
      paginationResult.setPageSize,
      refresh,
      selectAll,
      clearSelection,
      toggleSelection,
    ]
  );

  return {
    state,
    actions,
    filteredData,
    paginatedData: paginationResult.paginatedData,
    totalPages: paginationResult.totalPages,
    hasNextPage: paginationResult.hasNextPage,
    hasPreviousPage: paginationResult.hasPreviousPage,
    isAllSelected,
    isPartiallySelected,
  };
};
