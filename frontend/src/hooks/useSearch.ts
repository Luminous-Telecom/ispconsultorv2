// Hook para gerenciar busca
import { useState, useCallback, useEffect, useRef } from 'react';
import { debounce } from '../utils/helpers';

/**
 * Opções para busca
 */
export interface UseSearchOptions {
  initialSearch?: string;
  debounceMs?: number;
  onSearchChange?: (search: string) => void;
  immediate?: boolean; // Se true, não usa debounce
}

/**
 * Retorno do hook de busca
 */
export interface UseSearchReturn {
  search: string;
  setSearch: (value: string) => void;
  clearSearch: () => void;
  debouncedSearch: string;
}

/**
 * Hook para gerenciar busca com debounce
 */
export const useSearch = ({
  initialSearch = '',
  debounceMs = 300,
  onSearchChange,
  immediate = false,
}: UseSearchOptions = {}): UseSearchReturn => {
  const [search, setSearchState] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const onSearchChangeRef = useRef(onSearchChange);

  // Atualizar ref quando callback mudar
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  // Criar função debounced
  const debouncedUpdate = useRef(
    debounce((value: string) => {
      setDebouncedSearch(value);
      onSearchChangeRef.current?.(value);
    }, debounceMs)
  ).current;

  // Atualizar busca debounced quando search mudar
  useEffect(() => {
    if (immediate) {
      setDebouncedSearch(search);
      onSearchChangeRef.current?.(search);
    } else {
      debouncedUpdate(search);
    }
  }, [search, debounceMs, immediate, debouncedUpdate]);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchState('');
    if (immediate) {
      setDebouncedSearch('');
      onSearchChangeRef.current?.('');
    } else {
      debouncedUpdate('');
    }
  }, [immediate, debouncedUpdate]);

  return {
    search,
    setSearch,
    clearSearch,
    debouncedSearch,
  };
};

