export const COLUMN_FILTER_OPERATORS = [
  'contains',
  'equals',
  'startsWith',
  'gt',
  'lt',
  'gte',
  'lte',
] as const;

export type ColumnFilterOperator = (typeof COLUMN_FILTER_OPERATORS)[number];
export type ColumnFilterKind = 'string' | 'number' | 'boolean' | 'date';

export interface ColumnFilterRule {
  columnKey: string;
  operator: ColumnFilterOperator;
  value: string;
}

const MAX_RULES = 12;
const MAX_VALUE = 200;
const COLUMN_KEY = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;

function isOperator(value: string): value is ColumnFilterOperator {
  return (COLUMN_FILTER_OPERATORS as readonly string[]).includes(value);
}

export function parseColumnFiltersParam(raw: string | undefined): ColumnFilterRule[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const rules: ColumnFilterRule[] = [];
    for (const item of parsed) {
      if (rules.length >= MAX_RULES) break;
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const columnKey = typeof record.columnKey === 'string' ? record.columnKey : '';
      const operator = typeof record.operator === 'string' ? record.operator : '';
      const value = typeof record.value === 'string' ? record.value.trim().slice(0, MAX_VALUE) : '';
      if (!COLUMN_KEY.test(columnKey) || !isOperator(operator) || !value) continue;
      rules.push({ columnKey, operator, value });
    }
    return rules;
  } catch {
    return [];
  }
}

function asBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'sim' || normalized === 'yes';
}

function startOfDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nextDay(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}

function clauseFor(rule: ColumnFilterRule, kind: ColumnFilterKind): Record<string, unknown> | null {
  if (kind === 'string') {
    if (rule.operator === 'contains') return { contains: rule.value };
    if (rule.operator === 'startsWith') return { startsWith: rule.value };
    if (rule.operator === 'equals') return { equals: rule.value };
    return null;
  }

  if (kind === 'boolean') {
    if (rule.operator !== 'equals') return null;
    return { equals: asBoolean(rule.value) };
  }

  if (kind === 'number') {
    const number = Number(rule.value);
    if (!Number.isFinite(number)) return null;
    if (rule.operator === 'equals') return { equals: number };
    if (rule.operator === 'gt') return { gt: number };
    if (rule.operator === 'lt') return { lt: number };
    if (rule.operator === 'gte') return { gte: number };
    if (rule.operator === 'lte') return { lte: number };
    return null;
  }

  const day = startOfDay(rule.value);
  if (!day) return null;
  if (rule.operator === 'equals') return { gte: day, lt: nextDay(day) };
  if (rule.operator === 'gte') return { gte: day };
  if (rule.operator === 'lte') return { lt: nextDay(day) };
  if (rule.operator === 'gt') return { gte: nextDay(day) };
  if (rule.operator === 'lt') return { lt: day };
  return null;
}

export function buildPrismaColumnFilters(
  rules: ColumnFilterRule[] | undefined,
  allow: Record<string, ColumnFilterKind>
): Array<Record<string, unknown>> {
  if (!rules || rules.length === 0) return [];
  const clauses: Array<Record<string, unknown>> = [];
  for (const rule of rules) {
    const kind = allow[rule.columnKey];
    if (!kind) continue;
    const clause = clauseFor(rule, kind);
    if (!clause) continue;
    clauses.push({ [rule.columnKey]: clause });
  }
  return clauses;
}
