import React from 'react';

export const DEFAULT_COLUMN_WIDTH_PX = 120;
export const CHECKBOX_COLUMN_WIDTH_PX = 35;
export const ACTIONS_COLUMN_WIDTH_PX = 120;

/** Largura fixa padrão da coluna ID em todas as tabelas. */
export const ID_COLUMN_WIDTH_PX = 52;
/** @deprecated use ID_COLUMN_WIDTH_PX */
export const ID_COLUMN_MIN_WIDTH_PX = ID_COLUMN_WIDTH_PX;

/** Largura fixa padrão da coluna Status/Ativo em todas as tabelas. */
export const STATUS_COLUMN_WIDTH_PX = 80;
/** @deprecated use STATUS_COLUMN_WIDTH_PX */
export const STATUS_COLUMN_MIN_WIDTH_PX = STATUS_COLUMN_WIDTH_PX;
/** @deprecated use STATUS_COLUMN_WIDTH_PX */
export const STATUS_COLUMN_MAX_WIDTH_PX = STATUS_COLUMN_WIDTH_PX;

const STATUS_COLUMN_KEYS = new Set([
  'status',
  'ativo',
  'is_active',
  'su_status',
  'online',
  'publication_status',
  'provisioning_status',
  'nfse_status',
]);

export function isStatusColumnKey(key?: string): boolean {
  return key != null && STATUS_COLUMN_KEYS.has(key);
}

/** Largura fixa de colunas padronizadas (ID, Status). Ignora width local da coluna. */
export function getFixedColumnWidthPx(key?: string): number | undefined {
  if (key === 'id') return ID_COLUMN_WIDTH_PX;
  if (isStatusColumnKey(key)) return STATUS_COLUMN_WIDTH_PX;
  return undefined;
}

export function clampStatusColumnWidthPx(_widthPx: number): number {
  return STATUS_COLUMN_WIDTH_PX;
}

export function getMinWidthFromBadgeLabels(labels: string[]): number {
  if (!labels?.length) return 0;
  const maxLen = Math.max(...labels.map((l) => (l || '').length));
  return maxLen * 7 + 24;
}

export function getTitleMinWidth(label?: string): number {
  if (!label) return 40;
  return Math.max(40, label.length * 7 + 28);
}

export function parseColumnWidthPx(width: string | number | undefined): number | undefined {
  if (width == null) return undefined;
  const px = typeof width === 'number' ? width : parseInt(String(width).replace('px', ''), 10);
  return Number.isNaN(px) ? undefined : px;
}

export function resolveColumnWidthPx(
  column: { key: string; width?: string | number },
  columnWidths: Record<string, number>,
  hasCustomWidths: boolean
): number | undefined {
  const fixed = getFixedColumnWidthPx(column.key);
  if (fixed != null) {
    // ID/Status: sempre o padrão — não herda localStorage nem width da coluna.
    return fixed;
  }
  if (columnWidths[column.key] != null) {
    return columnWidths[column.key];
  }
  const configured = parseColumnWidthPx(column.width);
  if (configured != null) {
    return configured;
  }
  return hasCustomWidths ? DEFAULT_COLUMN_WIDTH_PX : undefined;
}

export function fixedWidthStyle(widthPx: number): React.CSSProperties {
  return {
    width: `${widthPx}px`,
    minWidth: `${widthPx}px`,
    maxWidth: `${widthPx}px`,
  };
}

export function getColumnMinWidth(column: {
  key?: string;
  badgeLabels?: string[];
  minWidth?: string | number;
  label?: string;
}): number | undefined {
  const fixed = getFixedColumnWidthPx(column.key);
  if (fixed != null) return fixed;

  const titleMin = getTitleMinWidth(column.label);
  if (column.badgeLabels?.length) {
    return Math.max(getMinWidthFromBadgeLabels(column.badgeLabels), titleMin);
  }
  if (column.minWidth != null) {
    const explicit =
      typeof column.minWidth === 'number'
        ? column.minWidth
        : parseInt(String(column.minWidth).replace('px', ''), 10);
    return Math.max(explicit, titleMin);
  }
  return undefined;
}

export { measureColumnWidths } from './columnResizeUtils';
