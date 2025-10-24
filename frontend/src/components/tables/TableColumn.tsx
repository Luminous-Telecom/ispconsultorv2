import React from 'react';
import { TableColumn as TableColumnType, SortDirection } from './types';

interface TableColumnProps<T = any> {
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

  const handleSort = () => {
    if (!isSortable) return;
    
    let direction: SortDirection = 'asc';
    if (isSorted && sortDirection === 'asc') {
      direction = 'desc';
    }
    
    onSort(column.key, direction);
  };

  const getSortIcon = () => {
    if (!isSortable) return null;
    
    if (isSorted) {
      return sortDirection === 'asc' ? (
        <i className="bi bi-chevron-up"></i>
      ) : (
        <i className="bi bi-chevron-down"></i>
      );
    }
    
    return <i className="bi bi-chevron-expand text-muted"></i>;
  };

  const getColumnStyles = () => {
    const styles: React.CSSProperties = {};
    
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
  };

  const getColumnClasses = () => {
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
  };

  return (
    <th
      className={getColumnClasses()}
      style={getColumnStyles()}
      onClick={handleSort}
      title={column.tooltip}
      data-sortable={isSortable}
      data-sorted={isSorted}
      data-sort-direction={sortDirection}
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

export default TableColumn;
