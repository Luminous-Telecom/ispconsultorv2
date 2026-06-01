import { useCallback, useState } from 'react';
import { useTableFilters } from './useTableFilters';
import { useAuditoria } from './useAuditoria';
import { useBulkBtn } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';

export interface UseRpkiListModalOptions {
  initialSortColumn?: string;
  initialSortDirection?: 'asc' | 'desc';
  initialLimit?: number;
}

export interface ClientPaginatedResult<T> {
  rows: T[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

export function useRpkiListModal<T extends { id: number | string }>({
  initialSortColumn = 'id',
  initialSortDirection = 'desc',
  initialLimit = 15,
}: UseRpkiListModalOptions = {}) {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const auditoria = useAuditoria();
  const [selectedRow, setSelectedRow] = useState<T | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit,
    initialSortColumn,
    initialSortDirection,
    searchDebounceMs: 250,
    resetPageOnFilterChange: true,
  });

  const handleSearchChange = useCallback(
    (search: string, field?: string) => {
      tableFilters.setSearch(search);
      if (field) {
        tableFilters.setSearchField(field);
      }
    },
    [tableFilters]
  );

  const paginateClientSide = useCallback(
    (
      rows: T[],
      getSortableValue: (row: T, sortKey: string) => string,
      matchSearch?: (row: T, term: string) => boolean
    ): ClientPaginatedResult<T> => {
      const term = tableFilters.debouncedSearch.trim().toLowerCase();
      let filtered = rows;

      if (term && matchSearch) {
        filtered = rows.filter((row) => matchSearch(row, term));
      } else if (term) {
        filtered = rows.filter((row) =>
          Object.values(row as object).some((v) => String(v ?? '').toLowerCase().includes(term))
        );
      }

      const sortKey = tableFilters.sortColumn || initialSortColumn;
      const direction = tableFilters.sortDirection === 'asc' ? 1 : -1;
      filtered = [...filtered].sort((a, b) => {
        const va = getSortableValue(a, sortKey).toLowerCase();
        const vb = getSortableValue(b, sortKey).toLowerCase();
        if (va < vb) return -1 * direction;
        if (va > vb) return 1 * direction;
        return 0;
      });

      const total = filtered.length;
      const perPage = tableFilters.limit;
      const lastPage = Math.max(1, Math.ceil(total / perPage));
      const safePage = Math.min(tableFilters.page, lastPage);
      const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
      const to = total === 0 ? 0 : Math.min(safePage * perPage, total);
      const pagedRows = filtered.slice(from > 0 ? from - 1 : 0, to);

      return {
        rows: pagedRows,
        pagination: {
          current_page: safePage,
          last_page: lastPage,
          per_page: perPage,
          total,
          from,
          to,
        },
      };
    },
    [
      initialSortColumn,
      tableFilters.debouncedSearch,
      tableFilters.limit,
      tableFilters.page,
      tableFilters.sortColumn,
      tableFilters.sortDirection,
    ]
  );

  return {
    t,
    bulkBtn,
    auditoria,
    tableFilters,
    selectedRow,
    setSelectedRow,
    showFormModal,
    setShowFormModal,
    handleSearchChange,
    paginateClientSide,
  };
}
