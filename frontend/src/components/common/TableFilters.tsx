import React from 'react';

interface TableFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  showLimitSelector?: boolean;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
  showPagination?: boolean;
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  onPageChange?: (page: number) => void;
}

const TableFilters: React.FC<TableFiltersProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  showLimitSelector = true,
  limit = 15,
  onLimitChange,
  limitOptions = [10, 15, 25, 50],
  showPagination = true,
  pagination,
  onPageChange
}) => {
  const goToFirstPage = () => onPageChange?.(1);
  const goToLastPage = () => onPageChange?.(pagination?.last_page || 1);
  const goToPrevPage = () => onPageChange?.(Math.max(1, (pagination?.current_page || 1) - 1));
  const goToNextPage = () => onPageChange?.(Math.min(pagination?.last_page || 1, (pagination?.current_page || 1) + 1));

  return (
    <div className="d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center gap-2">
        {/* Busca */}
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ width: '200px', height: '32px' }}
        />

        {/* Seletor de limite */}
        {showLimitSelector && onLimitChange && (
          <select
            className="form-select form-select-sm"
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            style={{ width: '80px', height: '32px' }}
          >
            {limitOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Paginação */}
      {showPagination && pagination && onPageChange && (
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">
            Página {pagination.current_page} de {pagination.last_page}
          </span>
          
          <div className="btn-group" role="group">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={goToFirstPage}
              disabled={pagination.current_page === 1}
            >
              <i className="bi bi-chevron-double-left"></i>
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={goToPrevPage}
              disabled={pagination.current_page === 1}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={goToNextPage}
              disabled={pagination.current_page === pagination.last_page}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={goToLastPage}
              disabled={pagination.current_page === pagination.last_page}
            >
              <i className="bi bi-chevron-double-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableFilters;