import React, { useState } from 'react';
import { Spinner } from '../ui';
import Button from '../ui/Button';

interface DataTableColumn<T = Record<string, unknown>> {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, record?: T) => React.ReactNode;
}

interface DataTablePagination {
  current: number;
  total: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface DataTableProps<T = Record<string, unknown>> {
  data: T[];
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  pagination?: DataTablePagination;
  limit?: number;
  setLimit?: (limit: number) => void;
  setPage?: (page: number) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSearch?: (search: string) => void;
  searchPlaceholder?: string;
  onRefresh?: () => void;
  emptyMessage?: string;
  showHeader?: boolean;
}

const DataTable = <T extends Record<string, unknown> = Record<string, unknown>>({
  data,
  columns,
  isLoading = false,
  pagination,
  limit = 20,
  setLimit,
  setPage,
  onSort,
  sortColumn,
  sortDirection = 'desc',
  onSearch,
  searchPlaceholder = 'Buscar...',
  onRefresh,
  emptyMessage = 'Nenhum registro encontrado',
  showHeader = true
}: DataTableProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSort) return;

    const newDirection = sortColumn === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column.key, newDirection);
  };

  const handlePageChange = (page: number) => {
    if (setPage) {
      setPage(page);
    }
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(e.target.value);
    if (setLimit) {
      setLimit(newLimit);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="data-table-container">
      {showHeader && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            {onSearch && (
              <div className="input-group" style={{ maxWidth: '300px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            )}
            {onRefresh && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <i className="fas fa-sync-alt"></i>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width, cursor: column.sortable ? 'pointer' : 'default' }}
                  onClick={() => handleSort(column)}
                >
                  {column.title}
                  {column.sortable && sortColumn === column.key && (
                    <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ms-1`}></i>
                  )}
                  {column.sortable && sortColumn !== column.key && (
                    <i className="fas fa-sort ms-1 text-muted"></i>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-4">
                  <Spinner />
                  <div className="mt-2">Carregando...</div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-4 text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr key={(record as Record<string, unknown>).id as string || index}>
                  {columns.map((column) => (
                    <td key={column.key} style={{ verticalAlign: 'middle' }}>
                      {column.render
                        ? column.render((record as Record<string, unknown>)[column.key], record)
                        : String((record as Record<string, unknown>)[column.key] || '-')
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted">
              Mostrando {((pagination.current - 1) * pagination.pageSize) + 1} a{' '}
              {Math.min(pagination.current * pagination.pageSize, pagination.total)} de {pagination.total} registros
            </span>
            {setLimit && (
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted">por página:</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={limit}
                  onChange={handleLimitChange}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>

          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${!pagination.hasPrev ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(pagination.current - 1)}
                  disabled={!pagination.hasPrev}
                >
                  Anterior
                </button>
              </li>

              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.current - 2)) + i;
                if (pageNum > pagination.totalPages) return null;

                return (
                  <li key={pageNum} className={`page-item ${pageNum === pagination.current ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  </li>
                );
              })}

              <li className={`page-item ${!pagination.hasNext ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(pagination.current + 1)}
                  disabled={!pagination.hasNext}
                >
                  Próximo
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
};

export default DataTable;