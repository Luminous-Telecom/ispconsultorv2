import type { SortDirection } from './types';

function coerceComparable(value: unknown): string | number | boolean | null {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return null;
    const iso = Date.parse(t);
    if (!Number.isNaN(iso) && (/\d{4}-\d{2}-\d{2}/.test(t) || t.includes('T'))) {
      return iso;
    }
    const n = Number(t.replace(/\s/g, '').replace(',', '.'));
    if (t.length <= 20 && /^-?\d+([.,]\d+)?$/.test(t) && Number.isFinite(n)) {
      return n;
    }
    return t.toLowerCase();
  }
  if (value instanceof Date) return value.getTime();
  return String(value).toLowerCase();
}

export type TableSortValueGetter = (row: Record<string, unknown>) => unknown;

/**
 * Compara duas linhas para ordenação em tabela (dados já em memória).
 * Usa `Record<string, unknown>` para não conflitar com o genérico `T` de `useTable` (ex.: linhas com `id` tipado).
 */
export function compareRowsForSort(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  sortKey: string,
  direction: SortDirection,
  column?: { sortValue?: TableSortValueGetter }
): number {
  const getSort = column?.sortValue;
  const rawA = getSort ? getSort(a) : a[sortKey];
  const rawB = getSort ? getSort(b) : b[sortKey];
  const av = coerceComparable(rawA);
  const bv = coerceComparable(rawB);
  if (av === null && bv === null) return 0;
  if (av === null) return direction === 'asc' ? 1 : -1;
  if (bv === null) return direction === 'asc' ? -1 : 1;
  let cmp = 0;
  if (typeof av === 'number' && typeof bv === 'number') {
    cmp = av === bv ? 0 : av < bv ? -1 : 1;
  } else if (typeof av === 'boolean' && typeof bv === 'boolean') {
    cmp = av === bv ? 0 : av ? 1 : -1;
  } else {
    cmp = String(av).localeCompare(String(bv), 'pt-BR', { numeric: true, sensitivity: 'base' });
  }
  return direction === 'asc' ? cmp : -cmp;
}
