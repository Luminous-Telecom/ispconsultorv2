import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useElementProperties } from 'hooks/useElementProperties';
import { useI18n } from 'contexts/I18nContext';
import {
  getColumnMinWidth,
  getDefaultColumnWidthPx,
  isStatusColumnKey,
} from './columnWidthUtils';
import { TableColumn as TableColumnType, SortDirection } from './types';

interface TableColumnProps<T = Record<string, unknown>> {
  column: TableColumnType<T>;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
  className?: string;
  columnWidth?: number;
  isUserResized?: boolean;
  onResizeStart?: (columnKey: string, startEdgeX: number, currentWidth: number) => void;
  isResizing?: boolean;
}

const TableColumn = <T extends { id: number | string }>({
  column,
  sortColumn,
  sortDirection,
  onSort,
  className = '',
  columnWidth,
  isUserResized = false,
  onResizeStart,
  isResizing = false,
}: TableColumnProps<T>) => {
  const { t } = useI18n();
  const isSorted = sortColumn === column.key;
  const isSortable = column.sortable !== false && onSort && column.key !== 'acoes' && column.key !== 'actions';
  const isResizable =
    (column.resizable ?? true) &&
    column.key !== 'acoes' &&
    column.key !== 'actions';
  const wasResizingRef = useRef(false);
  const columnRef = useRef<HTMLTableHeaderCellElement>(null);

  const handleSort = useCallback(() => {
    if (wasResizingRef.current) {
      wasResizingRef.current = false;
      return;
    }
    if (!isSortable || !onSort) return;

    let direction: SortDirection = 'asc';
    if (isSorted && sortDirection === 'asc') {
      direction = 'desc';
    }
    onSort(column.key, direction);
  }, [isSortable, isSorted, sortDirection, onSort, column.key]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    wasResizingRef.current = true;

    if (!columnRef.current || !onResizeStart) return;

    const rect = columnRef.current.getBoundingClientRect();
    onResizeStart(column.key, rect.right, Math.round(rect.width));
  }, [column.key, onResizeStart]);

  const minWidthFromTitle = useMemo(() => {
    if (!column.label) return 40;
    return Math.max(40, column.label.length * 7 + 40);
  }, [column.label]);

  const columnStyles = useMemo(() => {
    const styles: Record<string, string> = {};
    const isLockedWidth = columnWidth !== undefined;
    let effectiveWidth: number | undefined;
    if (isLockedWidth) {
      effectiveWidth = columnWidth;
    } else if (column.width !== undefined) {
      effectiveWidth =
        typeof column.width === 'string'
          ? parseInt(column.width.replace('px', ''), 10)
          : column.width;
      if (effectiveWidth != null && Number.isNaN(effectiveWidth)) {
        effectiveWidth = undefined;
      }
    } else {
      effectiveWidth = getDefaultColumnWidthPx(column.key);
    }

    if (effectiveWidth !== undefined) {
      const widthValue = `${effectiveWidth}px`;
      styles.width = widthValue;
      styles.minWidth = widthValue;
      if (isLockedWidth) {
        styles.maxWidth = widthValue;
      }
    } else {
      const colMin = getColumnMinWidth({
        key: column.key,
        label: column.label,
        minWidth: column.minWidth,
        badgeLabels: column.badgeLabels,
      });
      styles.minWidth = `${colMin ?? minWidthFromTitle}px`;
    }

    if (column.minWidth) {
      styles.minWidth = typeof column.minWidth === 'number' ? `${column.minWidth}px` : column.minWidth;
    }
    if (column.maxWidth) {
      styles.maxWidth = typeof column.maxWidth === 'number' ? `${column.maxWidth}px` : column.maxWidth;
    }

    return styles;
  }, [column.key, column.label, column.minWidth, column.maxWidth, column.badgeLabels, column.width, columnWidth, minWidthFromTitle]);

  useElementProperties(columnRef, columnStyles, [
    column.key,
    column.minWidth,
    column.maxWidth,
    column.width,
    columnWidth,
    minWidthFromTitle,
  ]);

  const columnClasses = useMemo(() => {
    const classes: string[] = [];
    if (column.key === 'id') classes.push('col-id');
    if (isStatusColumnKey(column.key)) classes.push('col-status');
    if (column.className) classes.push(column.className);
    if (column.align || column.headerAlign) {
      classes.push(`text-${column.headerAlign || column.align}`);
    }
    if (className) classes.push(className);
    if (isUserResized) classes.push('column-has-custom-width');
    return classes.join(' ');
  }, [column.key, column.className, column.align, column.headerAlign, className, isUserResized]);

  const sortIconClass = useMemo(() => {
    if (!isSortable) return '';
    if (!isSorted) return 'bi bi-chevron-expand';
    return sortDirection === 'asc' ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
  }, [isSortable, isSorted, sortDirection]);

  const resizeTitle = useMemo(
    () => (column.label ? `${t('other.resizeColumn')}: ${column.label}` : t('other.resizeColumn')),
    [column.label, t]
  );

  useEffect(() => {
    if (!isResizing) {
      const timeoutId = setTimeout(() => {
        wasResizingRef.current = false;
      }, 10);
      return () => clearTimeout(timeoutId);
    }
  }, [isResizing]);

  return (
    <th
      ref={columnRef}
      className={`table-col-header ${columnClasses} ${isSortable ? 'sortable' : ''}`}
      onClick={handleSort}
      title={column.tooltip}
      data-sortable={isSortable ? 'true' : 'false'}
      data-sorted={isSorted ? 'true' : 'false'}
      data-sort-direction={sortDirection || ''}
      data-resizable={isResizable ? 'true' : 'false'}
      data-column-key={column.key}
      data-column-width={columnWidth || ''}
    >
      <div className="d-flex align-items-center table-column-header-content">
        <span className="text-truncate">{column.label}</span>
        {isSortable && <i className={`${sortIconClass} table-sort-icon`} aria-hidden />}
      </div>
      {isResizable && (
        <div
          className="resize-handle"
          onMouseDown={handleResizeMouseDown}
          title={resizeTitle}
        />
      )}
    </th>
  );
};

export default React.memo(TableColumn) as typeof TableColumn;
