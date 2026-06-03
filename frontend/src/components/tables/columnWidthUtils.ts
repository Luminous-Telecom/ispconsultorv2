import React from 'react';

export const DEFAULT_COLUMN_WIDTH_PX = 120;
export const CHECKBOX_COLUMN_WIDTH_PX = 35;
export const ACTIONS_COLUMN_WIDTH_PX = 120;
export const ID_COLUMN_MIN_WIDTH_PX = 52;

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
  if (columnWidths[column.key] != null) {
    const savedWidth = columnWidths[column.key];
    return column.key === 'id'
      ? Math.max(ID_COLUMN_MIN_WIDTH_PX, savedWidth)
      : savedWidth;
  }
  const configured = parseColumnWidthPx(column.width);
  if (configured != null) {
    return column.key === 'id'
      ? Math.max(ID_COLUMN_MIN_WIDTH_PX, configured)
      : configured;
  }
  if (column.key === 'id') {
    return hasCustomWidths ? ID_COLUMN_MIN_WIDTH_PX : undefined;
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
  const titleMin = getTitleMinWidth(column.label);
  if (column.key === 'id') {
    return Math.max(ID_COLUMN_MIN_WIDTH_PX, titleMin);
  }
  if (column.badgeLabels?.length) {
    const badgeMin = getMinWidthFromBadgeLabels(column.badgeLabels);
    return Math.max(badgeMin, titleMin);
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
