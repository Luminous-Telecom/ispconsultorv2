import { ParsedQs } from 'qs';

export interface ParsedListQuery {
  page: number;
  limit: number;
  search?: string;
  searchField?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  ativo?: boolean;
  empresa_id?: number;
  status?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  data_pagamento_inicio?: string;
  data_pagamento_fim?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface ParseListQueryOptions {
  defaultPage?: number;
  defaultLimit?: number;
  /** Teto para `limit` (ex.: auditoria SSH com máximo 100). */
  maxLimit?: number;
}

export function queryString(value: string | ParsedQs | (string | ParsedQs)[] | undefined): string | undefined {
  if (value == null) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseOptionalPositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Inteiro positivo opcional a partir de valor bruto da query (string, array, etc.). */
export function parseOptionalQueryInt(raw: string | ParsedQs | (string | ParsedQs)[] | undefined): number | undefined {
  return parseOptionalPositiveInt(queryString(raw));
}

/** `true` se qualquer chave da query for exatamente `'true'`. */
export function isQueryFlagTrue(
  query: Record<string, string | ParsedQs | (string | ParsedQs)[] | undefined>,
  ...keys: string[]
): boolean {
  return keys.some((key) => queryString(query[key]) === 'true');
}

/** `'true'` → true, `'false'` → false, ausente/outro → undefined. */
export function parseTriStateBoolean(raw: string | ParsedQs | (string | ParsedQs)[] | undefined): boolean | undefined {
  const value = queryString(raw);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export interface ParseBoundedPositiveIntOptions {
  defaultValue: number;
  min: number;
  max: number;
}

/** Inteiro positivo com valor padrão e limites (ex.: `days`, `limit` em logs). */
export function parseBoundedPositiveInt(
  raw: string | ParsedQs | (string | ParsedQs)[] | undefined,
  options: ParseBoundedPositiveIntOptions
): number {
  const parsed = parsePositiveInt(queryString(raw), options.defaultValue);
  return Math.min(Math.max(parsed, options.min), options.max);
}

function toPositiveIntIds(items: unknown[]): number[] {
  return items
    .map((item) => (typeof item === 'number' ? item : parseInt(String(item), 10)))
    .filter((id) => Number.isFinite(id) && id > 0);
}

/** Lista de IDs: JSON array, número único ou CSV. */
export function parseIdsFromQueryParam(raw: unknown): number[] {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) return toPositiveIntIds(raw);
  if (typeof raw === 'number' && raw > 0) return [raw];
  if (typeof raw !== 'string') return [];

  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return toPositiveIntIds(parsed);
    if (typeof parsed === 'number' && parsed > 0) return [parsed];
  } catch {
    /* CSV */
  }

  return toPositiveIntIds(trimmed.split(','));
}

/** Converte `ativo` booleano do parseListQuery para string esperada pelos services. */
export function ativoFilterForService(ativo?: boolean): string | undefined {
  if (ativo === true) return 'true';
  if (ativo === false) return 'false';
  return undefined;
}

/** Direção de ordenação a partir de parseListQuery. */
export function toSqlSortDirection(direction?: 'asc' | 'desc'): 'ASC' | 'DESC' {
  return direction === 'asc' ? 'ASC' : 'DESC';
}

function parseAtivo(value: string | undefined): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function parseSortDirection(value: string | undefined): 'asc' | 'desc' | undefined {
  if (value === 'asc' || value === 'desc') return value;
  return undefined;
}

/** Listagem do agendador: aceita `sort`/`direction` além de `sortColumn`/`sortDirection`. */
export function parseSchedulerListQuery(
  query: Record<string, string | ParsedQs | (string | ParsedQs)[] | undefined>,
  options: ParseListQueryOptions = {}
): ParsedListQuery {
  const base = parseListQuery(query, options);
  const sortAlt = queryString(query.sort);
  const directionAlt = parseSortDirection(queryString(query.direction));
  return {
    ...base,
    sortColumn: base.sortColumn ?? sortAlt,
    sortDirection: base.sortDirection ?? directionAlt,
  };
}

/**
 * Extrai parâmetros comuns de listagem da query string.
 */
export function parseListQuery(
  query: Record<string, string | ParsedQs | (string | ParsedQs)[] | undefined>,
  options: ParseListQueryOptions = {}
): ParsedListQuery {
  const defaultPage = options.defaultPage ?? 1;
  const defaultLimit = options.defaultLimit ?? 15;

  const pageRaw = queryString(query.page);
  const limitRaw = queryString(query.limit);
  const sortDirectionRaw = queryString(query.sortDirection);

  let limit = parsePositiveInt(limitRaw, defaultLimit);
  if (options.maxLimit != null) {
    limit = Math.min(limit, options.maxLimit);
  }

  return {
    page: parsePositiveInt(pageRaw, defaultPage),
    limit,
    search: queryString(query.search),
    searchField: queryString(query.searchField),
    sortColumn: queryString(query.sortColumn),
    sortDirection: parseSortDirection(sortDirectionRaw),
    ativo: parseAtivo(queryString(query.ativo)),
    empresa_id: parseOptionalPositiveInt(queryString(query.empresa_id)),
    status: queryString(query.status),
    data_vencimento_inicio: queryString(query.data_vencimento_inicio),
    data_vencimento_fim: queryString(query.data_vencimento_fim),
    data_pagamento_inicio: queryString(query.data_pagamento_inicio),
    data_pagamento_fim: queryString(query.data_pagamento_fim),
    data_inicio: queryString(query.data_inicio),
    data_fim: queryString(query.data_fim),
  };
}
