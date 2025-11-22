import React, { useMemo, useCallback } from 'react';
import { TableColumn as TableColumnType, SortDirection } from './types';

interface TableColumnProps<T = Record<string, unknown>> {
  column: TableColumnType<T>;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
  className?: string;
}

const TableColumn = <T extends { id: number | string }>({
  column,
  sortColumn,
  sortDirection,
  onSort,
  className = '',
}: TableColumnProps<T>) => {
  const isSorted = sortColumn === column.key;
  const isSortable = column.sortable && onSort;

  const handleSort = useCallback(() => {
    if (!isSortable || !onSort) return;
    
    let direction: SortDirection = 'asc';
    if (isSorted && sortDirection === 'asc') {
      direction = 'desc';
    }
    
    onSort(column.key, direction);
  }, [isSortable, isSorted, sortDirection, onSort, column.key]);

  const getSortIcon = () => {
    if (!isSortable) return null;
    
    if (isSorted) {
      return (
        <div className="d-flex flex-column">
          <i 
            className={`bi bi-caret-up-fill`}
            style={{ 
              fontSize: '0.6rem', 
              lineHeight: '0.5',
              color: sortDirection === 'asc' ? '#ffffff' : '#adb5bd'
            }}
          ></i>
          <i 
            className={`bi bi-caret-down-fill`}
            style={{ 
              fontSize: '0.6rem', 
              lineHeight: '0.5',
              color: sortDirection === 'desc' ? '#ffffff' : '#adb5bd'
            }}
          ></i>
        </div>
      );
    }
    
    return (
      <div className="d-flex flex-column">
        <i 
          className={`bi bi-caret-up-fill`}
          style={{ 
            fontSize: '0.6rem', 
            lineHeight: '0.5',
            color: '#adb5bd'
          }}
        ></i>
        <i 
          className={`bi bi-caret-down-fill`}
          style={{ 
            fontSize: '0.6rem', 
            lineHeight: '0.5',
            color: '#adb5bd'
          }}
        ></i>
      </div>
    );
  };

  const columnStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      textTransform: 'none',
      padding: '0.5rem',
      fontSize: '0.75rem',
    };
    
    if (column.width) {
      styles.width = typeof column.width === 'number' ? `${column.width}px` : column.width;
    }
    
    if (column.minWidth) {
      styles.minWidth = typeof column.minWidth === 'number' ? `${column.minWidth}px` : column.minWidth;
    }
    
    if (column.maxWidth) {
      styles.maxWidth = typeof column.maxWidth === 'number' ? `${column.maxWidth}px` : column.maxWidth;
    }
    
    return styles;
  }, [column.width, column.minWidth, column.maxWidth]);

  const columnClasses = useMemo(() => {
    const classes = ['table-column'];
    
    if (column.className) {
      classes.push(column.className);
    }
    
    if (column.align || column.headerAlign) {
      const align = column.headerAlign || column.align;
      classes.push(`text-${align}`);
    }
    
    if (isSortable) {
      classes.push('sortable');
    }
    
    if (isSorted) {
      classes.push('sorted');
    }
    
    if (column.fixed) {
      classes.push(`fixed-${column.fixed}`);
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  }, [column.className, column.align, column.headerAlign, column.fixed, isSortable, isSorted, className]);

  return (
    <th
      className={columnClasses}
      style={columnStyles}
      onClick={handleSort}
      title={column.tooltip}
      data-sortable={isSortable ? 'true' : 'false'}
      data-sorted={isSorted ? 'true' : 'false'}
      data-sort-direction={sortDirection || ''}
    >
      <div className="d-flex align-items-center justify-content-between">
        <span className="column-label">
          {column.label}
        </span>
        
        {isSortable && (
          <span className="sort-icon ms-1">
            {getSortIcon()}
          </span>
        )}
      </div>
    </th>
  );
};

// Memoizar componente para evitar re-renderizações desnecessárias
export default React.memo(TableColumn) as typeof TableColumn;
