import { TablePagination } from './types';

export interface TablePaginationValues {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number;
  to: number;
  visiblePages: (number | string)[];
}

function getVisiblePages(currentPage: number, lastPage: number): (number | string)[] {
  if (lastPage <= 1) return [1];

  const delta = 2;
  const range: number[] = [];
  const rangeWithDots: (number | string)[] = [];

  for (let i = Math.max(2, currentPage - delta); i <= Math.min(lastPage - 1, currentPage + delta); i++) {
    range.push(i);
  }

  if (currentPage - delta > 2) {
    rangeWithDots.push(1, '...');
  } else {
    rangeWithDots.push(1);
  }

  rangeWithDots.push(...range);

  if (currentPage + delta < lastPage - 1) {
    rangeWithDots.push('...', lastPage);
  } else if (lastPage > 1) {
    rangeWithDots.push(lastPage);
  }

  return rangeWithDots;
}

export function computeTablePaginationValues(params: {
  normalizedPagination?: TablePagination;
  localCurrentPage: number;
  localPageSize: number;
  localTotalPages: number;
  dataLength: number;
}): TablePaginationValues {
  const { normalizedPagination, localCurrentPage, localPageSize, localTotalPages, dataLength } = params;

  const currentPage = normalizedPagination?.currentPage ?? localCurrentPage;
  const perPage = normalizedPagination?.perPage ?? localPageSize;
  const total = normalizedPagination?.total ?? dataLength;

  let lastPage: number = normalizedPagination?.lastPage ?? 1;
  if (!normalizedPagination?.lastPage) {
    if (normalizedPagination && normalizedPagination.total !== undefined) {
      lastPage = Math.max(1, Math.ceil(total / perPage));
    } else {
      lastPage = localTotalPages || Math.max(1, Math.ceil(dataLength / perPage));
    }
  }
  lastPage = Math.max(1, lastPage);

  const from = normalizedPagination?.from ?? (currentPage - 1) * perPage + 1;
  const to = normalizedPagination?.to ?? Math.min(currentPage * perPage, total);

  return {
    currentPage,
    lastPage,
    perPage,
    total,
    from,
    to,
    visiblePages: getVisiblePages(currentPage, lastPage),
  };
}
