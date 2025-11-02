// Hook para gerenciar filtros
import { useState, useCallback, useMemo } from 'react';

/**
 * Opções para filtros
 */
export interface UseFiltersOptions<TFilters extends Record<string, string | number | boolean | null | undefined | object>> {
  initialFilters?: TFilters;
  onFiltersChange?: (filters: TFilters) => void;
}

/**
 * Retorno do hook de filtros
 */
export interface UseFiltersReturn<TFilters extends Record<string, string | number | boolean | null | undefined | object>> {
  filters: TFilters;
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  setFilters: (filters: Partial<TFilters>) => void;
  resetFilters: () => void;
  clearFilter: (key: keyof TFilters) => void;
  hasActiveFilters: boolean;
  getActiveFiltersCount: () => number;
}

/**
 * Hook para gerenciar filtros
 */
export const useFilters = <TFilters extends Record<string, string | number | boolean | null | undefined | object> = Record<string, string | number | boolean | null | undefined | object>>({
  initialFilters = {} as TFilters,
  onFiltersChange,
}: UseFiltersOptions<TFilters> = {}): UseFiltersReturn<TFilters> => {
  const [filters, setFiltersState] = useState<TFilters>(initialFilters);

  const setFilter = useCallback(<K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setFiltersState(prev => {
      const newFilters = { ...prev, [key]: value };
      onFiltersChange?.(newFilters);
      return newFilters;
    });
  }, [onFiltersChange]);

  const setFilters = useCallback((newFilters: Partial<TFilters>) => {
    setFiltersState(prev => {
      const merged = { ...prev, ...newFilters };
      onFiltersChange?.(merged);
      return merged;
    });
  }, [onFiltersChange]);

  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters);
    onFiltersChange?.(initialFilters);
  }, [initialFilters, onFiltersChange]);

  const clearFilter = useCallback((key: keyof TFilters) => {
    setFiltersState(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      onFiltersChange?.(newFilters);
      return newFilters;
    });
  }, [onFiltersChange]);

  const hasActiveFilters = useMemo(() => {
    const activeCount = Object.keys(filters).filter(key => {
      const value = filters[key as keyof TFilters];
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && Object.keys(value).length === 0) return false;
      return true;
    }).length;
    return activeCount > 0;
  }, [filters]);

  const getActiveFiltersCount = useCallback(() => {
    return Object.keys(filters).filter(key => {
      const value = filters[key as keyof TFilters];
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && Object.keys(value).length === 0) return false;
      return true;
    }).length;
  }, [filters]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    clearFilter,
    hasActiveFilters,
    getActiveFiltersCount,
  };
};

