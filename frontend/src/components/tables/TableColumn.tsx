import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { TableColumn as TableColumnType, SortDirection } from './types';

interface TableColumnProps<T = Record<string, unknown>> {
  column: TableColumnType<T>;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
  className?: string;
  columnWidth?: number;
  onResizeStart?: (columnKey: string, startX: number, currentWidth: number) => void;
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

    const currentWidth = Math.round(columnRef.current.getBoundingClientRect().width);
    onResizeStart(column.key, e.clientX, currentWidth);
  }, [column.key, onResizeStart]);

  const getSortIcon = () => {
    if (!isSortable) return null;

    let iconClass = 'bi bi-chevron-expand';
    let iconColor = '#6c757d';

    if (isSorted) {
      if (sortDirection === 'asc') {
        iconClass = 'bi bi-chevron-up';
        iconColor = '#495057';
      } else {
        iconClass = 'bi bi-chevron-down';
        iconColor = '#495057';
      }
    }

    return (
      <i
        className={iconClass}
        style={{
          fontSize: '0.625rem',
          color: iconColor,
          marginLeft: '0.125rem'
        }}
      />
    );
  };

  const minWidthFromTitle = useMemo(() => {
    if (!column.label) return 40;
    return Math.max(40, column.label.length * 7 + 40);
  }, [column.label]);

  const columnStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      textTransform: 'none',
      padding: '0.25rem 0.5rem',
      fontSize: '0.75rem',
    };

    let effectiveWidth: number | string | undefined;
    if (columnWidth !== undefined) {
      effectiveWidth = columnWidth;
    } else if (column.width !== undefined) {
      effectiveWidth = typeof column.width === 'string'
        ? parseInt(column.width.replace('px', ''), 10)
        : column.width;
    }

    if (effectiveWidth) {
      const widthValue = typeof effectiveWidth === 'number' ? `${effectiveWidth}px` : effectiveWidth;
      styles.width = widthValue;
      styles.minWidth = widthValue;
      styles.maxWidth = widthValue;
    } else {
      styles.minWidth = `${minWidthFromTitle}px`;
    }

    if (column.minWidth) {
      styles.minWidth = typeof column.minWidth === 'number' ? `${column.minWidth}px` : column.minWidth;
    }
    if (column.maxWidth) {
      styles.maxWidth = typeof column.maxWidth === 'number' ? `${column.maxWidth}px` : column.maxWidth;
    }

    return styles;
  }, [column.width, column.minWidth, column.maxWidth, columnWidth, minWidthFromTitle]);

  const columnClasses = useMemo(() => {
    const classes: string[] = [];
    if (column.className) classes.push(column.className);
    if (column.align || column.headerAlign) {
      classes.push(`text-${column.headerAlign || column.align}`);
    }
    if (className) classes.push(className);
    if (columnWidth) classes.push('column-has-custom-width');
    return classes.join(' ');
  }, [column.className, column.align, column.headerAlign, className, columnWidth]);

  const isResizable = (column.resizable ?? true) && column.key !== 'acoes' && column.key !== 'actions';

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
      className={`${columnClasses} ${isSortable ? 'sortable' : ''}`}
      style={columnStyles}
      onClick={handleSort}
      title={column.tooltip}
      data-sortable={isSortable ? 'true' : 'false'}
      data-sorted={isSorted ? 'true' : 'false'}
      data-sort-direction={sortDirection || ''}
      data-resizable={isResizable ? 'true' : 'false'}
      data-column-width={columnWidth || ''}
    >
      <div className="d-flex align-items-center">
        <span>{column.label}</span>
        {getSortIcon()}
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
