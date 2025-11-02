// Hook para gerenciar paginação
import { useState, useMemo, useCallback } from 'react';

/**
 * Opções para paginação
 */
export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems?: number;
  maxPageSize?: number;
}

/**
 * Retorno do hook de paginação
 */
export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  getPaginationParams: () => { page: number; limit: number; offset: number };
}

/**
 * Hook para gerenciar paginação
 */
export const usePagination = ({
  initialPage = 1,
  initialPageSize = 15,
  totalItems = 0,
  maxPageSize = 100,
}: UsePaginationOptions = {}): UsePaginationReturn => {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  // Calcular total de páginas
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [totalItems, pageSize]);

  // Validar e ajustar página atual
  const validatedPage = useMemo(() => {
    const calculatedTotalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (page > calculatedTotalPages) return calculatedTotalPages;
    if (page < 1) return 1;
    return page;
  }, [page, totalItems, pageSize]);

  const setPageSize = useCallback((size: number) => {
    const newSize = Math.min(Math.max(1, size), maxPageSize);
    setPageSizeState(newSize);
    
    // Ajustar página atual se necessário
    const newTotalPages = Math.max(1, Math.ceil(totalItems / newSize));
    if (validatedPage > newTotalPages) {
      setPage(newTotalPages);
    }
  }, [maxPageSize, totalItems, validatedPage]);

  const setPageValidated = useCallback((newPage: number) => {
    const clampedPage = Math.max(1, Math.min(newPage, totalPages));
    setPage(clampedPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setPageValidated(validatedPage + 1);
  }, [validatedPage, setPageValidated]);

  const previousPage = useCallback(() => {
    setPageValidated(validatedPage - 1);
  }, [validatedPage, setPageValidated]);

  const goToFirstPage = useCallback(() => {
    setPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setPage(totalPages);
  }, [totalPages]);

  const getPaginationParams = useCallback(() => {
    const limit = pageSize;
    const offset = (validatedPage - 1) * pageSize;
    return { page: validatedPage, limit, offset };
  }, [validatedPage, pageSize]);

  const hasNextPage = validatedPage < totalPages;
  const hasPreviousPage = validatedPage > 1;

  return {
    page: validatedPage,
    pageSize,
    totalPages,
    totalItems,
    hasNextPage,
    hasPreviousPage,
    setPage: setPageValidated,
    setPageSize,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    getPaginationParams,
  };
};

