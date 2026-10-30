import type { FilterValue } from 'types/common';
import type { TableColumn, TablePagination } from '../types';
import type { UseTableOptions } from './types';
import { rowMatchesRules, type ColumnFilterRule } from '../tableView/model';

export const normalizePagination = (
  pagination: UseTableOptions<unknown>['pagination']
): TablePagination | undefined => {
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

export function filterTableData<T extends { id: number | string }>(
  data: T[],
  columns: TableColumn<T>[],
  searchTerm: string,
  filters: Record<string, FilterValue>,
  searchable: boolean,
  hasServerPagination: boolean,
  columnRules: ColumnFilterRule[] = [],
  skipColumnRules = false
): T[] {
  let result = [...data];

  if (searchTerm && searchable && !hasServerPagination) {
    const searchLower = searchTerm.toLowerCase();
    result = result.filter((item) =>
      columns.some((column) => {
        if (!column.searchable) return false;
        const value = item[column.key as keyof T];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchLower);
      })
    );
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      result = result.filter((item) => {
        const itemValue = item[key as keyof T];
        if (typeof value === 'string') {
          return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        }
        return itemValue === value;
      });
    }
  });

  if (!skipColumnRules && columnRules.length > 0) {
    result = result.filter((item) => rowMatchesRules(item, columnRules));
  }

  return result;
}

export function hasDataChanged<T extends { id: number | string }>(
  prevData: T[],
  newData: T[]
): boolean {
  return (
    prevData.length !== newData.length ||
    newData.some((item, index) => {
      const p = prevData[index];
      return !p || p.id !== item.id || p !== item;
    })
  );
}

export function syncSelectedItemsWithData<T extends { id: number | string }>(
  selectedItems: T[],
  newData: T[]
): { syncedSelectedItems: T[]; shouldNotify: boolean } {
  const idToItem = new Map(newData.map((item) => [item.id, item]));
  const syncedSelectedItems = selectedItems
    .map((sel) => idToItem.get(sel.id))
    .filter((item): item is T => item !== undefined);
  // Só notifica o pai quando o conjunto de IDs muda. Atualizar refs dos itens
  // (mesmo ID, novo objeto) sem notificar — senão onSelectionChange → novo data → loop.
  const selectionIdsChanged =
    syncedSelectedItems.length !== selectedItems.length ||
    syncedSelectedItems.some((item, i) => item.id !== selectedItems[i]?.id);
  return {
    syncedSelectedItems,
    shouldNotify: selectionIdsChanged,
  };
}
