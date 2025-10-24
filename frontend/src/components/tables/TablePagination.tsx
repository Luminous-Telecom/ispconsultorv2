import React from 'react';
import { TablePagination as TablePaginationType } from './types';
import Button from '../ui/Button';

interface TablePaginationProps {
  pagination: TablePaginationType;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showPageInfo?: boolean;
  className?: string;
}

const TablePagination: React.FC<TablePaginationProps> = ({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 15, 25, 50, 100],
  showPageSizeSelector = true,
  showPageInfo = true,
  className = '',
}) => {
  const { current_page, last_page, per_page, total, from, to } = pagination;

  // Calcular páginas visíveis
  const getVisiblePages = () => {
    const delta = 2; // Número de páginas antes e depois da atual
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, current_page - delta); i <= Math.min(last_page - 1, current_page + delta); i++) {
      range.push(i);
    }

    if (current_page - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current_page + delta < last_page - 1) {
      rangeWithDots.push('...', last_page);
    } else if (last_page > 1) {
      rangeWithDots.push(last_page);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  // Renderizar informações da página
  const renderPageInfo = () => {
    if (!showPageInfo) return null;

    const start = from || ((current_page - 1) * per_page) + 1;
    const end = to || Math.min(current_page * per_page, total);

    return (
      <div className="pagination-info">
        <span className="text-muted">
          Mostrando {start} a {end} de {total} registros
        </span>
      </div>
    );
  };

  // Renderizar seletor de tamanho da página
  const renderPageSizeSelector = () => {
    if (!showPageSizeSelector) return null;

    return (
      <div className="page-size-selector d-flex align-items-center gap-2">
        <label htmlFor="page-size" className="form-label mb-0 small">
          Por página:
        </label>
        <select
          id="page-size"
          className="form-select form-select-sm"
          value={per_page}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{ width: 'auto' }}
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Renderizar botões de navegação
  const renderNavigationButtons = () => {
    return (
      <div className="pagination-nav">
        {/* Primeira página */}
        <Button
          variant="outline-secondary"
          size="sm"
          icon="chevron-double-left"
          disabled={current_page === 1}
          onClick={() => onPageChange(1)}
          tooltip="Primeira página"
        >
          {''}
        </Button>

        {/* Página anterior */}
        <Button
          variant="outline-secondary"
          size="sm"
          icon="chevron-left"
          disabled={current_page === 1}
          onClick={() => onPageChange(current_page - 1)}
          tooltip="Página anterior"
        >
          {''}
        </Button>

        {/* Páginas numeradas */}
        {visiblePages.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`dots-${index}`} className="pagination-dots">
                ...
              </span>
            );
          }

          const pageNumber = page as number;
          const isActive = pageNumber === current_page;

          return (
            <Button
              key={pageNumber}
              variant={isActive ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => onPageChange(pageNumber)}
              className={isActive ? 'active' : ''}
            >
              {pageNumber}
            </Button>
          );
        })}

        {/* Próxima página */}
        <Button
          variant="outline-secondary"
          size="sm"
          icon="chevron-right"
          disabled={current_page === last_page}
          onClick={() => onPageChange(current_page + 1)}
          tooltip="Próxima página"
        >
          {''}
        </Button>

        {/* Última página */}
        <Button
          variant="outline-secondary"
          size="sm"
          icon="chevron-double-right"
          disabled={current_page === last_page}
          onClick={() => onPageChange(last_page)}
          tooltip="Última página"
        >
          {''}
        </Button>
      </div>
    );
  };

  // Se não há dados para paginar
  if (last_page <= 1) {
    return (
      <div className={`table-pagination ${className}`}>
        {renderPageInfo()}
        {renderPageSizeSelector()}
      </div>
    );
  }

  return (
    <div className={`table-pagination d-flex justify-content-between align-items-center ${className}`}>
      <div className="d-flex align-items-center gap-3">
        {renderPageInfo()}
        {renderPageSizeSelector()}
      </div>
      
      <div className="d-flex align-items-center gap-1">
        {renderNavigationButtons()}
      </div>
    </div>
  );
};

export default TablePagination;
