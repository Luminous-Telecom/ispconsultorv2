import { useCallback, useEffect, useMemo, useRef } from 'react';
import { compareRowsForSort } from '../tableSort';
import type { SortDirection } from '../types';
import type { UseTableSortOptions } from './types';

export function useTableSort<T extends { id: number | string }>({
  columns,
  sortable,
  propSortColumn,
  propSortDirection,
  normalizedPagination,
  filteredData,
  state,
  setState,
  onSortRef,
}: UseTableSortOptions<T>) {
  useEffect(() => {
    if (propSortColumn !== undefined) {
      setState((prev) => {
        if (prev.sortColumn === propSortColumn && prev.sortDirection === propSortDirection) {
          return prev;
        }
        return {
          ...prev,
          sortColumn: propSortColumn || '',
          sortDirection: propSortDirection || 'asc',
          isSorted: !!propSortColumn,
        };
      });
    }
  }, [propSortColumn, propSortDirection, setState]);

  const sortCol = propSortColumn ?? state.sortColumn;
  const sortDir = (propSortDirection ?? state.sortDirection) as SortDirection;

  const shouldClientSort = useMemo(() => {
    if (!sortable || !sortCol) return false;
    const col = columns.find((c) => c.key === sortCol);
    if (col?.sortable === false) return false;
    if (!normalizedPagination) return true;
    const total = normalizedPagination.total ?? 0;
    return total === filteredData.length && filteredData.length > 0;
  }, [sortable, sortCol, columns, normalizedPagination, filteredData.length]);

  const sortedData = useMemo(() => {
    if (!shouldClientSort) return filteredData;
    const col = columns.find((c) => c.key === sortCol);
    return [...filteredData].sort((a, b) =>
      compareRowsForSort(
        a as unknown as Record<string, unknown>,
        b as unknown as Record<string, unknown>,
        sortCol,
        sortDir,
        col?.sortValue
          ? { sortValue: col.sortValue as (row: Record<string, unknown>) => unknown }
          : undefined
      )
    );
  }, [filteredData, shouldClientSort, sortCol, sortDir, columns]);

  const setSort = useCallback(
    (column: string, direction: SortDirection) => {
      setState((prev) => {
        if (prev.sortColumn === column && prev.sortDirection === direction && prev.isSorted) {
          return prev;
        }
        return {
          ...prev,
          sortColumn: column,
          sortDirection: direction,
          isSorted: true,
        };
      });
    },
    [setState]
  );

  const lastSort = useRef({ column: state.sortColumn, direction: state.sortDirection });
  useEffect(() => {
    if (
      state.isSorted &&
      (lastSort.current.column !== state.sortColumn ||
        lastSort.current.direction !== state.sortDirection)
    ) {
      lastSort.current = { column: state.sortColumn, direction: state.sortDirection };
      onSortRef.current?.(state.sortColumn, state.sortDirection);
    }
  }, [state.isSorted, state.sortColumn, state.sortDirection, onSortRef]);

  return { sortedData, setSort };
}
