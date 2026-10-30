import type { FilterValue } from 'types/common';

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

export type ColumnFilterKind = 'text' | 'number' | 'date' | 'boolean' | 'select';

export interface ColumnFilterRule {
  id: string;
  columnKey: string;
  operator: ColumnFilterOperator;
  value: string;
}

export interface SavedTableView {
  id: string;
  name: string;
  isDefault: boolean;
  listOnOpen: boolean;
  hiddenColumnKeys: string[];
  rules: ColumnFilterRule[];
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface FilterableColumn {
  key: string;
  label: string;
  hidden?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: ColumnFilterKind;
  filterOptions?: Array<{ value: FilterValue; label: string }>;
}

const VIEWS_PREFIX = 'table-views-';
const COLUMNS_PREFIX = 'table-columns-';

export function viewsStorageKey(tableId: string): string {
  return `${VIEWS_PREFIX}${tableId}`;
}

export function columnsStorageKey(tableId: string): string {
  return `${COLUMNS_PREFIX}${tableId}`;
}

export function createViewId(): string {
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createRuleId(columnKey: string): string {
  return `rule-${columnKey}-${Math.random().toString(36).slice(2, 8)}`;
}

export function resolveFilterKind(column: FilterableColumn): ColumnFilterKind {
  if (column.filterType) return column.filterType;
  if (column.filterOptions && column.filterOptions.length > 0) return 'select';
  if (column.key === 'id' || column.key.endsWith('_id')) return 'number';
  if (
    column.key === 'ativo' ||
    column.key.startsWith('recebe_') ||
    column.key.startsWith('is_') ||
    column.key.startsWith('has_')
  ) {
    return 'boolean';
  }
  if (column.key.endsWith('_at') || column.key.startsWith('data_')) return 'date';
  return 'text';
}

export function operatorsFor(kind: ColumnFilterKind): ColumnFilterOperator[] {
  if (kind === 'number') return ['equals', 'gt', 'lt'];
  if (kind === 'date') return ['equals', 'gte', 'lte'];
  if (kind === 'boolean' || kind === 'select') return ['equals'];
  return ['contains', 'equals', 'startsWith'];
}

export function toggleableColumns<T extends FilterableColumn>(columns: T[]): T[] {
  return columns.filter((column) => !column.hidden && column.key !== 'acoes' && column.key !== 'actions');
}

export function filterableColumns<T extends FilterableColumn>(columns: T[]): T[] {
  return toggleableColumns(columns).filter((column) => column.filterable !== false);
}

export function sortableColumns<T extends FilterableColumn>(columns: T[]): T[] {
  return toggleableColumns(columns).filter((column) => column.sortable !== false);
}

export function normalizeHiddenKeys(keys: string[], columns: FilterableColumn[]): string[] {
  const toggleable = toggleableColumns(columns).map((column) => column.key);
  const hidden = keys.filter((key) => toggleable.includes(key));
  if (toggleable.length > 0 && hidden.length >= toggleable.length) {
    return hidden.filter((key) => key !== toggleable[0]);
  }
  return hidden;
}

export function readViews(tableId: string): SavedTableView[] {
  try {
    const raw = localStorage.getItem(viewsStorageKey(tableId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedTableView[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((view) => typeof view?.id === 'string' && typeof view?.name === 'string');
  } catch {
    return [];
  }
}

export function writeViews(tableId: string, views: SavedTableView[]): void {
  try {
    localStorage.setItem(viewsStorageKey(tableId), JSON.stringify(views));
  } catch {
    // quota
  }
}

export function readHiddenKeys(tableId: string): string[] {
  try {
    const raw = localStorage.getItem(columnsStorageKey(tableId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((key): key is string => typeof key === 'string');
  } catch {
    return [];
  }
}

export function writeHiddenKeys(tableId: string, keys: string[]): void {
  try {
    localStorage.setItem(columnsStorageKey(tableId), JSON.stringify(keys));
  } catch {
    // quota
  }
}

export function upsertView(views: SavedTableView[], view: SavedTableView): SavedTableView[] {
  const next = views.map((item) => {
    if (item.id === view.id) return view;
    return {
      ...item,
      isDefault: view.isDefault ? false : item.isDefault,
      listOnOpen: view.listOnOpen ? false : item.listOnOpen,
    };
  });
  if (!views.some((item) => item.id === view.id)) {
    return [
      ...next.map((item) => ({
        ...item,
        isDefault: view.isDefault ? false : item.isDefault,
        listOnOpen: view.listOnOpen ? false : item.listOnOpen,
      })),
      view,
    ];
  }
  return next;
}

function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'sim' || normalized === 'yes' || normalized === 'sí';
}

export function ruleIsComplete(rule: ColumnFilterRule): boolean {
  return rule.columnKey.trim() !== '' && rule.value.trim() !== '';
}

const MAX_COLUMN_VALUES = 50;

export function distinctColumnValues(column: FilterableColumn, rows: readonly object[]): string[] {
  const kind = resolveFilterKind(column);
  if (kind === 'boolean' || kind === 'date') return [];
  if (kind === 'select' && column.filterOptions && column.filterOptions.length > 0) {
    return column.filterOptions
      .map((option) => (option.value == null ? '' : String(option.value)))
      .filter((value) => value !== '');
  }
  const seen = new Set<string>();
  const values: string[] = [];
  for (const row of rows) {
    const text = asText((row as Record<string, unknown>)[column.key]).trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(text);
    if (values.length >= MAX_COLUMN_VALUES) break;
  }
  values.sort((left, right) => left.localeCompare(right, 'pt-BR', { numeric: true, sensitivity: 'base' }));
  return values;
}

export function ruleValueLabel(
  column: FilterableColumn | undefined,
  value: string,
  labels: { yes: string; no: string }
): string {
  if (!column) return value;
  const kind = resolveFilterKind(column);
  if (kind === 'boolean') return asBoolean(value) ? labels.yes : labels.no;
  if (kind === 'select') {
    const option = column.filterOptions?.find((item) => String(item.value ?? '') === value);
    return option?.label ?? value;
  }
  return value;
}

export function valueMatchesRule(raw: unknown, rule: ColumnFilterRule): boolean {
  if (!ruleIsComplete(rule)) return true;
  const text = asText(raw).trim();
  const expected = rule.value.trim();

  if (rule.operator === 'contains') return text.toLowerCase().includes(expected.toLowerCase());
  if (rule.operator === 'startsWith') return text.toLowerCase().startsWith(expected.toLowerCase());
  if (rule.operator === 'equals') {
    if (text === 'true' || text === 'false') return text === (asBoolean(expected) ? 'true' : 'false') || text.toLowerCase() === expected.toLowerCase();
    const left = Number(text);
    const right = Number(expected);
    if (text !== '' && expected !== '' && Number.isFinite(left) && Number.isFinite(right) && text.match(/^-?\d+(\.\d+)?$/)) {
      return left === right;
    }
    return text.toLowerCase() === expected.toLowerCase() || text.slice(0, 10) === expected.slice(0, 10);
  }

  const left = Number(text);
  const right = Number(expected);
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    if (rule.operator === 'gte' || rule.operator === 'lte') {
      return rule.operator === 'gte' ? text.slice(0, 10) >= expected.slice(0, 10) : text.slice(0, 10) <= expected.slice(0, 10);
    }
    return false;
  }
  if (rule.operator === 'gt') return left > right;
  if (rule.operator === 'lt') return left < right;
  if (rule.operator === 'gte') return left >= right;
  if (rule.operator === 'lte') return left <= right;
  return false;
}

export function rowMatchesRules(row: object, rules: ColumnFilterRule[]): boolean {
  const record = row as Record<string, unknown>;
  return rules.every((rule) => valueMatchesRule(record[rule.columnKey], rule));
}
