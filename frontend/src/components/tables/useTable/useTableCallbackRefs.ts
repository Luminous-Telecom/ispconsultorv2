import { useEffect, useRef } from 'react';
import type { UseTableOptions } from '../types';
import type { UseTableCallbackRefs } from './types';

export function useTableCallbackRefs<T>(options: UseTableOptions<T>): UseTableCallbackRefs {
  const {
    onSelectionChange,
    onDataChange,
    onSearch,
    onSort,
    onFilter,
    onPageChange,
    onPageSizeChange,
    onRefresh,
  } = options;

  const onSelectionChangeRef = useRef(onSelectionChange);
  const onDataChangeRef = useRef(onDataChange);
  const onSearchRef = useRef(onSearch);
  const onSortRef = useRef(onSort);
  const onFilterRef = useRef(onFilter);
  const onPageChangeRef = useRef(onPageChange);
  const onPageSizeChangeRef = useRef(onPageSizeChange);
  const onRefreshRef = useRef(onRefresh);

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
    onRefresh,
  ]);

  return {
    onSelectionChangeRef,
    onDataChangeRef,
    onSearchRef,
    onSortRef,
    onFilterRef,
    onPageChangeRef,
    onPageSizeChangeRef,
    onRefreshRef,
  } as UseTableCallbackRefs;
}
