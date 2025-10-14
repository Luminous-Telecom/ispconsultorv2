import React, { FormEvent } from 'react';

interface Field {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  value: string | number;
  onChange: (value: any) => void;
  options?: { value: string | number; label: string }[];
}

interface TableFiltersProps {
  // Nova interface para compatibilidade
  fields?: Field[];
  onFilter?: (e: FormEvent) => void;
  onReset?: () => void;
  showReset?: boolean;
  showResetButton?: boolean;
  // Interface original para uso direto
  searchValue?: string;
  onSearchChange?: (value: string) => void;
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
  // Campos dinâmicos (modo legacy)
  fields = [],
  onFilter,
  onReset,
  showReset = false,
  showResetButton = false,
  // Campos diretos (modo novo)
  searchValue = '',
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

  // Modo legacy: usar campos dinâmicos
  if (fields.length > 0) {
    return (
      <form onSubmit={onFilter} className="d-flex align-items-center gap-2">
        {fields.map((field) => {
          const fieldId = `filter-${field.name}`;
          return (
            <div key={field.name} className="d-flex flex-column">
              <label htmlFor={fieldId} className="form-label small mb-1">{field.label}</label>
              {field.type === 'select' ? (
                <select
                  id={fieldId}
                  name={fieldId}
                  className="form-select form-select-sm"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  style={{ height: '32px' }}
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  className="form-control form-control-sm"
                  id={fieldId}
                  name={fieldId}
                  placeholder={field.placeholder}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  style={{ height: '32px' }}
                />
              )}
            </div>
          );
        })}
        
        {onFilter && (
          <button type="submit" className="btn btn-sm btn-primary" style={{ height: '32px' }}>
            Filtrar
          </button>
        )}
        
        {(showReset || showResetButton) && onReset && (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onReset} style={{ height: '32px' }}>
            Limpar
          </button>
        )}
      </form>
    );
  }

  // Modo novo: campos diretos
  return (
    <div className="d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center gap-2">
        {/* Busca */}
        {onSearchChange && (
          <input
            type="text"
            className="form-control form-control-sm"
            id="table-search-filter"
            name="searchFilter"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ width: '200px', height: '32px' }}
            aria-label={searchPlaceholder}
          />
        )}

        {/* Seletor de limite */}
        {showLimitSelector && onLimitChange && (
          <select
            id="table-limit-selector"
            name="limitSelector"
            className="form-select form-select-sm"
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            style={{ width: '80px', height: '32px' }}
            aria-label="Itens por página"
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