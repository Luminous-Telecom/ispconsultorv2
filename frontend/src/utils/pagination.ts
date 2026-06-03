export interface ListPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

/** Formato Laravel/backend ERP */
export interface BackendPaginationShape {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  from?: number;
  to?: number;
  page?: number;
  totalPages?: number;
  limit?: number;
}

/**
 * Normaliza paginação do backend (ERP ou SaaS) para o formato da Table.
 */
export function normalizeListPagination(
  pagination: BackendPaginationShape | undefined | null,
  fallbackPage: number,
  fallbackLimit: number
): ListPagination {
  if (!pagination || typeof pagination !== 'object') {
    return {
      current_page: fallbackPage,
      last_page: 1,
      per_page: fallbackLimit,
      total: 0,
      from: 0,
      to: 0,
    };
  }

  const total = pagination.total ?? 0;
  const perPage = fallbackLimit;
  const currentPage = fallbackPage;

  let lastPage = pagination.last_page ?? pagination.totalPages;
  if (!lastPage && total > 0) {
    lastPage = Math.max(1, Math.ceil(total / perPage));
  } else if (!lastPage) {
    lastPage = 1;
  }

  const safePage = Math.min(Math.max(1, currentPage), lastPage);

  return {
    current_page: safePage,
    last_page: lastPage,
    per_page: perPage,
    total,
    from: total > 0 ? (safePage - 1) * perPage + 1 : 0,
    to: total > 0 ? Math.min(safePage * perPage, total) : 0,
  };
}
