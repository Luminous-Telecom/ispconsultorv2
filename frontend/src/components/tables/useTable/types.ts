import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { FilterValue } from 'types/common';
import type {
  SortDirection,
  TableActions,
  TableColumn,
  TablePagination,
  TableState,
  UseTableOptions,
  UseTableReturn,
} from '../types';

export type {
  SortDirection,
  TableActions,
  TableColumn,
  TablePagination,
  TableState,
  UseTableOptions,
  UseTableReturn,
};

export interface UseTableCallbackRefs {
  onSelectionChangeRef: MutableRefObject<UseTableOptions<unknown>['onSelectionChange']>;
  onDataChangeRef: MutableRefObject<UseTableOptions<unknown>['onDataChange']>;
  onSearchRef: MutableRefObject<UseTableOptions<unknown>['onSearch']>;
  onSortRef: MutableRefObject<UseTableOptions<unknown>['onSort']>;
  onFilterRef: MutableRefObject<UseTableOptions<unknown>['onFilter']>;
  onPageChangeRef: MutableRefObject<UseTableOptions<unknown>['onPageChange']>;
  onPageSizeChangeRef: MutableRefObject<UseTableOptions<unknown>['onPageSizeChange']>;
  onRefreshRef: MutableRefObject<UseTableOptions<unknown>['onRefresh']>;
}

export interface UseTableSelectionOptions<T extends { id: number | string }> {
  selectable: boolean;
  multiSelect: boolean;
  paginatedData: T[];
  state: TableState<T>;
  setState: Dispatch<SetStateAction<TableState<T>>>;
  onSelectionChangeRef: UseTableCallbackRefs['onSelectionChangeRef'];
}

export interface UseTableSortOptions<T extends { id: number | string }> {
  columns: TableColumn<T>[];
  sortable: boolean;
  propSortColumn?: string;
  propSortDirection?: SortDirection;
  normalizedPagination?: TablePagination;
  filteredData: T[];
  state: TableState<T>;
  setState: Dispatch<SetStateAction<TableState<T>>>;
  onSortRef: UseTableCallbackRefs['onSortRef'];
}

export interface UseTablePaginationOptions<T extends { id: number | string }> {
  pagination?: UseTableOptions<T>['pagination'];
  normalizedPagination?: TablePagination;
  sortedData: T[];
  state: TableState<T>;
  setState: Dispatch<SetStateAction<TableState<T>>>;
  onPageChangeRef: UseTableCallbackRefs['onPageChangeRef'];
  onPageSizeChangeRef: UseTableCallbackRefs['onPageSizeChangeRef'];
}

export type TableFilters = Record<string, FilterValue>;
