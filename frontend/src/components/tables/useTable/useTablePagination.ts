import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { UseTablePaginationOptions } from './types';

export function useTablePagination<T extends { id: number | string }>({
  pagination,
  normalizedPagination,
  sortedData,
  state,
  setState,
  onPageChangeRef,
  onPageSizeChangeRef,
}: UseTablePaginationOptions<T>) {
  useEffect(() => {
    if (normalizedPagination) {
      setState((prev) => {
        if (
          prev.currentPage === normalizedPagination.currentPage &&
          prev.pageSize === normalizedPagination.perPage
        ) {
          return prev;
        }
        return {
          ...prev,
          currentPage: normalizedPagination.currentPage,
          pageSize: normalizedPagination.perPage,
        };
      });
    }
  }, [normalizedPagination, setState]);

  const isServerPagedSubset = useMemo(
    () =>
      !!normalizedPagination && (normalizedPagination.total ?? 0) > sortedData.length,
    [normalizedPagination, sortedData.length]
  );

  const paginatedData = useMemo(() => {
    const perPage = normalizedPagination?.perPage ?? state.pageSize;
    const page = normalizedPagination?.currentPage ?? state.currentPage;

    if (!normalizedPagination) {
      const startIndex = (state.currentPage - 1) * state.pageSize;
      return sortedData.slice(startIndex, startIndex + state.pageSize);
    }
    if (isServerPagedSubset) {
      return sortedData;
    }
    const startIndex = (page - 1) * perPage;
    return sortedData.slice(startIndex, startIndex + perPage);
  }, [sortedData, normalizedPagination, isServerPagedSubset, state.currentPage, state.pageSize]);

  const totalPages = useMemo(() => {
    if (normalizedPagination) return normalizedPagination.lastPage;
    return Math.ceil(sortedData.length / state.pageSize);
  }, [normalizedPagination, sortedData.length, state.pageSize]);

  const currentPage = normalizedPagination ? normalizedPagination.currentPage : state.currentPage;

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const setPage = useCallback(
    (page: number) => {
      setState((prev) => {
        if (prev.currentPage === page) return prev;
        return { ...prev, currentPage: page };
      });
    },
    [setState]
  );

  const lastEchoedPageRef = useRef(state.currentPage);
  useEffect(() => {
    if (lastEchoedPageRef.current === state.currentPage) return;
    lastEchoedPageRef.current = state.currentPage;
    if (!pagination) onPageChangeRef.current?.(state.currentPage);
  }, [state.currentPage, pagination, onPageChangeRef]);

  const setPageSize = useCallback(
    (size: number) => {
      setState((prev) => {
        if (prev.pageSize === size) return prev;
        return {
          ...prev,
          pageSize: size,
          currentPage: 1,
        };
      });
    },
    [setState]
  );

  const lastPageSize = useRef(state.pageSize);
  useEffect(() => {
    if (lastPageSize.current !== state.pageSize) {
      lastPageSize.current = state.pageSize;
      onPageSizeChangeRef.current?.(state.pageSize);
    }
  }, [state.pageSize, onPageSizeChangeRef]);

  return {
    paginatedData,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    setPage,
    setPageSize,
  };
}
