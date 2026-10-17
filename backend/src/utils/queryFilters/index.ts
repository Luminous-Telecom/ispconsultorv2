import { normalizeDateForDb } from '../dateUtils';

/** Where no formato do Prisma (gte/lte, contains, OR, AND). */
export type PrismaWhere = { [key: string]: any };

function dateBounds(
  startDate?: string | Date | null,
  endDate?: string | Date | null
): { gte?: Date; lte?: Date } | null {
  let startOfDay: Date | null = null;
  let endOfDay: Date | null = null;

  if (startDate) {
    const normalizedStart = normalizeDateForDb(startDate);
    if (normalizedStart) {
      startOfDay = new Date(normalizedStart);
      startOfDay.setHours(0, 0, 0, 0);
    }
  }

  if (endDate) {
    const normalizedEnd = normalizeDateForDb(endDate);
    if (normalizedEnd) {
      endOfDay = new Date(normalizedEnd);
      endOfDay.setHours(23, 59, 59, 999);
    }
  }

  if (!startOfDay && !endOfDay) return null;

  const range: { gte?: Date; lte?: Date } = {};
  if (startOfDay) range.gte = startOfDay;
  if (endOfDay) range.lte = endOfDay;
  return range;
}

/**
 * Filtro de data (início/fim do dia) para where do Prisma.
 */
export function buildDateFilter(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  field = 'data_vencimento'
): PrismaWhere | null {
  if (!startDate && !endDate) return null;
  const range = dateBounds(startDate, endDate);
  if (!range) return null;
  return { [field]: range };
}

/**
 * Busca textual: um campo vira `{ contains }`; vários campos viram `{ OR }`.
 */
export function buildSearchFilter(
  searchTerm?: string | null,
  searchFields: string[] = [],
  searchField?: string
): PrismaWhere | null {
  if (!searchTerm || !searchTerm.trim()) return null;

  const trimmedSearch = searchTerm.trim();

  if (searchField && searchFields.includes(searchField)) {
    return { [searchField]: { contains: trimmedSearch } };
  }

  if (searchFields.length === 0) return null;

  return {
    OR: searchFields.map((field) => ({ [field]: { contains: trimmedSearch } })),
  };
}

/**
 * Busca numérica com tolerância (gte/lte).
 */
export function buildNumericSearchFilter(
  searchTerm: string | null | undefined,
  field: string,
  tolerance = 0.1
): PrismaWhere | null {
  if (!searchTerm || !searchTerm.trim()) return null;

  const cleanedValue = searchTerm.replace(/[^\d.,]/g, '').replace(',', '.');
  const numericValue = parseFloat(cleanedValue);
  if (isNaN(numericValue)) return null;

  const minValue = numericValue * (1 - tolerance);
  const maxValue = numericValue * (1 + tolerance);

  return {
    [field]: { gte: minValue, lte: maxValue },
  };
}

/**
 * Junta filtros com AND. Null e undefined são ignorados.
 */
export function combineFilters(...filters: Array<PrismaWhere | null | undefined>): PrismaWhere | null {
  const validFilters = filters.filter((filter): filter is PrismaWhere => filter != null);
  if (validFilters.length === 0) return null;
  if (validFilters.length === 1) return validFilters[0];
  return { AND: validFilters };
}
