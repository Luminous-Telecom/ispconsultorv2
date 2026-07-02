import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useElementProperties } from 'hooks/useElementProperties';
import { useI18n } from 'contexts/I18nContext';
import { getColumnMinWidth, ID_COLUMN_MIN_WIDTH_PX } from './columnWidthUtils';
import { TableColumn as TableColumnType, SortDirection } from './types';

interface TableColumnProps<T = Record<string, unknown>> {
  column: TableColumnType<T>;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
  className?: string;
  columnWidth?: number;
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
  onResizeStart,
  isResizing = false,
}: TableColumnProps<T>) => {
  const { t } = useI18n();
  const isSorted = sortColumn === column.key;
  const isSortable = column.sortable !== false && onSort && column.key !== 'acoes' && column.key !== 'actions';
  const isResizable = (column.resizable ?? true) && column.key !== 'acoes' && column.key !== 'actions';
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
    const currentWidth = Math.round(rect.width);
    onResizeStart(column.key, rect.right, currentWidth);
  }, [column.key, onResizeStart]);

  const minWidthFromTitle = useMemo(() => {
    if (!column.label) return 40;
    return Math.max(40, column.label.length * 7 + 40);
  }, [column.label]);

  const columnStyles = useMemo(() => {
    const styles: Record<string, string> = {};

    let effectiveWidth: number | string | undefined;
    if (columnWidth !== undefined) {
      effectiveWidth = columnWidth;
    } else if (column.width !== undefined) {
      effectiveWidth = typeof column.width === 'string'
        ? parseInt(column.width.replace('px', ''), 10)
        : column.width;
    }

    if (effectiveWidth !== undefined && effectiveWidth !== '') {
      const widthPx =
        typeof effectiveWidth === 'number'
          ? effectiveWidth
          : parseInt(String(effectiveWidth).replace('px', ''), 10);
      const clampedPx =
        column.key === 'id'
          ? Math.max(ID_COLUMN_MIN_WIDTH_PX, Number.isNaN(widthPx) ? ID_COLUMN_MIN_WIDTH_PX : widthPx)
          : widthPx;
      const widthValue = `${clampedPx}px`;
      styles.width = widthValue;
      styles.minWidth = widthValue;
      styles.maxWidth = widthValue;
    } else {
      const colMin = getColumnMinWidth({
        key: column.key,
        label: column.label,
        minWidth: column.minWidth,
        badgeLabels: column.badgeLabels,
      });
      styles.minWidth = `${colMin ?? minWidthFromTitle}px`;
    }

    if (column.minWidth && column.key !== 'id') {
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
    if (column.className) classes.push(column.className);
    if (column.align || column.headerAlign) {
      classes.push(`text-${column.headerAlign || column.align}`);
    }
    if (className) classes.push(className);
    if (columnWidth) classes.push('column-has-custom-width');
    return classes.join(' ');
  }, [column.key, column.className, column.align, column.headerAlign, className, columnWidth]);

  const sortIconClass = useMemo(() => {
    if (!isSortable) return '';
    if (!isSorted) return 'bi bi-chevron-expand';
    return sortDirection === 'asc' ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
  }, [isSortable, isSorted, sortDirection]);

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
          title={t('other.resizeColumn')}
        />
      )}
    </th>
  );
};

export default React.memo(TableColumn) as typeof TableColumn;
