export interface StandardPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}

export interface ListPagination extends StandardPagination {
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SaasSimplePagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BuildPaginationOptions {
  /** Quando total=0, last_page usa este valor (ex.: 1 em algumas APIs RPKI). */
  minLastPageWhenEmpty?: number;
  /** Garante last_page >= este valor quando total > 0. */
  minLastPage?: number;
  /** Limita last_page quando a API impõe teto de páginas. */
  maxLastPage?: number;
  /** Substitui current_page (ex.: página efetiva após cap). */
  currentPage?: number;
}

/**
 * Paginação padrão das listagens ERP/blockdomi.
 */
export function buildPagination(
  page: number,
  limit: number,
  total: number,
  options?: BuildPaginationOptions
): StandardPagination {
  const safeLimit = Math.max(1, limit);
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * safeLimit;

  let last_page: number;
  if (total <= 0) {
    last_page = options?.minLastPageWhenEmpty ?? 0;
  } else {
    last_page = Math.ceil(total / safeLimit);
    if (options?.minLastPage != null) {
      last_page = Math.max(options.minLastPage, last_page);
    }
    if (options?.maxLastPage != null) {
      last_page = Math.min(last_page, options.maxLastPage);
    }
  }

  const current_page = options?.currentPage ?? safePage;
  const effectiveOffset = (Math.max(1, current_page) - 1) * safeLimit;
  const from = total > 0 ? effectiveOffset + 1 : 0;
  const to = total > 0 ? Math.min(effectiveOffset + safeLimit, total) : 0;

  return {
    current_page,
    per_page: safeLimit,
    total,
    last_page,
    from,
    to,
  };
}

/** Paginação com aliases usados em histórico de mensagens e telas mistas. */
export function buildListPagination(
  page: number,
  limit: number,
  total: number,
  options?: BuildPaginationOptions
): ListPagination {
  const base = buildPagination(page, limit, total, options);
  const totalPages = base.last_page;
  return {
    ...base,
    page: base.current_page,
    limit: base.per_page,
    totalPages,
    hasNext: base.current_page < totalPages,
    hasPrev: base.current_page > 1,
  };
}

/** Formato enxuto usado em alguns endpoints SaaS. */
export function buildSaasPagination(page: number, limit: number, total: number): SaasSimplePagination {
  const safeLimit = Math.max(1, limit);
  const safePage = Math.max(1, page);
  const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 0;
  return {
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
}
