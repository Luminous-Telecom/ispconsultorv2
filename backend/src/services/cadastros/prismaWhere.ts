import { prisma } from '../../db/prisma';
import { normalizeDateForDb } from '../../utils/dateUtils';

const OP_PREFIX = 'isp.';

const PRISMA_FILTER_KEYS = new Set([
  'equals', 'in', 'notIn', 'contains', 'startsWith', 'endsWith',
  'gt', 'gte', 'lt', 'lte', 'not', 'AND', 'OR', 'some', 'every', 'none',
]);

function operatorName(key: symbol): string | null {
  const description = Symbol.keyFor(key);
  if (!description || !description.startsWith(OP_PREFIX)) return null;
  return description.slice(OP_PREFIX.length);
}

function likeToFilter(pattern: string): Record<string, string> {
  const starts = pattern.startsWith('%');
  const ends = pattern.endsWith('%');
  const text = pattern.replace(/^%/, '').replace(/%$/, '').replace(/\\([%_\\])/g, '$1');
  if (starts && ends) return { contains: text };
  if (!starts && ends) return { startsWith: text };
  if (starts && !ends) return { endsWith: text };
  return { equals: text };
}

function convertOperatorValue(value: Record<string | symbol, unknown>): unknown {
  const filter: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    filter[key] = value[key];
  }

  for (const symbolKey of Object.getOwnPropertySymbols(value)) {
    const name = operatorName(symbolKey);
    const current = value[symbolKey];
    if (!name) continue;
    if (name === 'like' || name === 'iLike' || name === 'substring') {
      Object.assign(filter, likeToFilter(String(current ?? '')));
    } else if (name === 'startsWith') {
      filter.startsWith = String(current ?? '').replace(/%/g, '');
    } else if (name === 'endsWith') {
      filter.endsWith = String(current ?? '').replace(/%/g, '');
    } else if (name === 'in') {
      filter.in = current;
    } else if (name === 'notIn') {
      filter.notIn = current;
    } else if (name === 'ne') {
      filter.not = current;
    } else if (name === 'gt' || name === 'gte' || name === 'lt' || name === 'lte') {
      filter[name] = current;
    } else if (name === 'between' && Array.isArray(current)) {
      filter.gte = current[0];
      filter.lte = current[1];
    } else if (name === 'eq' || name === 'is') {
      if (current === null) return null;
      filter.equals = current;
    } else if (name === 'not') {
      filter.not = current === null ? null : convertNode(current);
    }
  }

  if (Object.keys(filter).length === 1 && 'equals' in filter) return filter.equals;
  return filter;
}

function isPrismaFilter(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => PRISMA_FILTER_KEYS.has(key));
}

function convertNode(value: unknown): unknown {
  if (value == null || value instanceof Date || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => convertNode(item));

  const record = value as Record<string | symbol, unknown>;
  const symbols = Object.getOwnPropertySymbols(record);
  if (symbols.length > 0) {
    const onlyOperators = Object.keys(record).length === 0 || symbols.some((key) => operatorName(key));
    if (onlyOperators && symbols.some((key) => operatorName(key))) {
      const andParts: unknown[] = [];
      const orParts: unknown[] = [];
      let operatorObject = false;

      for (const symbolKey of symbols) {
        const name = operatorName(symbolKey);
        const current = record[symbolKey];
        if (name === 'and' && Array.isArray(current)) {
          andParts.push(...current.map((item) => convertNode(item)));
        } else if (name === 'or' && Array.isArray(current)) {
          orParts.push(...current.map((item) => convertNode(item)));
        } else if (name) {
          operatorObject = true;
        }
      }

      if (!operatorObject && (andParts.length > 0 || orParts.length > 0)) {
        const base = convertNode({ ...record }) as Record<string, unknown>;
        const combined: Record<string, unknown> = { ...base };
        if (orParts.length > 0) combined.OR = orParts;
        if (andParts.length > 0) return { AND: [combined, ...andParts] };
        return combined;
      }

      return convertOperatorValue(record);
    }
  }

  const plain = record as Record<string, unknown>;
  if (isPrismaFilter(plain)) return plain;

  const output: Record<string, unknown> = {};
  for (const key of Object.keys(plain)) {
    const current = plain[key];
    if (Array.isArray(current) && key !== 'AND' && key !== 'OR' && key !== 'in' && key !== 'notIn') {
      output[key] = { in: current };
      continue;
    }
    output[key] = convertNode(current);
  }
  return output;
}

/** Objeto plano com toJSON, para quem ainda serializa o retorno como model. */
export function withToJson<T extends object>(row: T): T {
  if (!row || typeof row !== 'object' || typeof (row as { toJSON?: unknown }).toJSON === 'function') {
    return row;
  }
  Object.defineProperty(row, 'toJSON', {
    enumerable: false,
    value(this: Record<string, unknown>) {
      const output: Record<string, unknown> = {};
      for (const key of Object.keys(this)) {
        const value = this[key];
        if (typeof value !== 'function') output[key] = value;
      }
      return output;
    },
  });
  return row;
}

/** Converte where simples ou where com operadores legados (símbolos isp.*) para filtro do Prisma. */
export function toPrismaWhere(input: unknown): Record<string, unknown> | undefined {
  if (input == null) return undefined;
  if (typeof input !== 'object') return undefined;

  const record = input as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 1 && keys[0] === 'where' && record.where && typeof record.where === 'object') {
    return toPrismaWhere(record.where);
  }

  return convertNode(input) as Record<string, unknown>;
}

export function sortDirection(direction?: string): 'asc' | 'desc' {
  return direction?.toUpperCase() === 'ASC' ? 'asc' : 'desc';
}

export function sqlDirection(direction?: string): 'ASC' | 'DESC' {
  return direction?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
}

const ORDER_TABLES = new Set([
  'cadastros_planos',
  'financeiro_titulos',
  'financeiro_contas_pagar',
  'contratos',
]);

/** Ordena uma página de ids já filtrados por uma expressão SQL fixa (não vem do usuário). */
export async function orderPageBySql(
  table: string,
  expression: string,
  direction: 'ASC' | 'DESC',
  ids: number[],
  take: number,
  skip: number,
): Promise<number[]> {
  if (!ORDER_TABLES.has(table) || ids.length === 0) return [];
  const dir = direction === 'ASC' ? 'ASC' : 'DESC';
  const placeholders = ids.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number | bigint }>>(
    `SELECT id FROM \`${table}\` WHERE id IN (${placeholders}) ORDER BY ${expression} ${dir} LIMIT ? OFFSET ?`,
    ...ids,
    take,
    skip,
  );
  return rows.map((row) => Number(row.id));
}

export function dateBounds(
  start?: string | Date | null,
  end?: string | Date | null,
): { gte?: Date; lte?: Date } | undefined {
  const bounds: { gte?: Date; lte?: Date } = {};
  if (start) {
    const normalized = normalizeDateForDb(start);
    if (normalized) {
      const day = new Date(normalized);
      day.setHours(0, 0, 0, 0);
      bounds.gte = day;
    }
  }
  if (end) {
    const normalized = normalizeDateForDb(end);
    if (normalized) {
      const day = new Date(normalized);
      day.setHours(23, 59, 59, 999);
      bounds.lte = day;
    }
  }
  return bounds.gte || bounds.lte ? bounds : undefined;
}

export function numericBounds(searchTerm: string, tolerance = 0.1): { gte: number; lte: number } | undefined {
  const cleaned = searchTerm.replace(/[^\d.,]/g, '').replace(',', '.');
  const numericValue = parseFloat(cleaned);
  if (Number.isNaN(numericValue)) return undefined;
  return {
    gte: numericValue * (1 - tolerance),
    lte: numericValue * (1 + tolerance),
  };
}

export function enumMatches<T extends string>(values: readonly T[], term: string): T[] {
  const needle = term.toLowerCase();
  return values.filter((value) => value.toLowerCase().includes(needle));
}

export function reorderByIds<T extends { id: number }>(rows: T[], ids: number[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}
