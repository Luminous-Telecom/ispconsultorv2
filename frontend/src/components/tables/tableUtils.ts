import { TableConfig, TablePagination } from './types';

export function drainPossiblePromise(result: unknown): void {
  if (result != null && typeof (result as PromiseLike<unknown>).then === 'function') {
    void Promise.resolve(result).catch(() => {});
  }
}

export function normalizePagination(
  pagination: TableConfig<unknown>['pagination']
): TablePagination | undefined {
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
}
