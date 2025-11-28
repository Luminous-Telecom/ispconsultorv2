import React from 'react';
import { TablePagination as TablePaginationType } from './types';
import Button from '../ui/Button';

interface TablePaginationProps {
  pagination: TablePaginationType | {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    currentPage?: number;
    lastPage?: number;
    perPage?: number;
    total: number;
    from?: number;
    to?: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showPageInfo?: boolean;
  className?: string;
}

// Helper para normalizar paginação (aceita snake_case da API ou camelCase interno)
const normalizePagination = (pagination: TablePaginationProps['pagination']): TablePaginationType => {
  const pag = pagination as TablePaginationType & {
    current_page?: number;
    last_page?: number;
    per_page?: number;
  };
  
  return {
    currentPage: pag.currentPage ?? pag.current_page ?? 1,
    lastPage: pag.lastPage ?? pag.last_page ?? 1,
    perPage: pag.perPage ?? pag.per_page ?? 15,
    total: pag.total,
    from: pag.from,
    to: pag.to,
  };
};

const TablePagination: React.FC<TablePaginationProps> = ({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 15, 25, 50, 100],
  showPageSizeSelector = true,
  showPageInfo = true,
  className = '',
}) => {
  const normalizedPagination = normalizePagination(pagination);
  const { currentPage, lastPage, perPage, total, from, to } = normalizedPagination;

  // Calcular páginas visíveis
  const getVisiblePages = () => {
    const delta = 2; // Número de páginas antes e depois da atual
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(lastPage - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < lastPage - 1) {
      rangeWithDots.push('...', lastPage);
    } else if (lastPage > 1) {
      rangeWithDots.push(lastPage);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  // Renderizar informações da página
  const renderPageInfo = () => {
    if (!showPageInfo) return null;

    const start = from || ((currentPage - 1) * perPage) + 1;
    const end = to || Math.min(currentPage * perPage, total);

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
          value={perPage}
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
          disabled={currentPage === 1}
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
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
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
          const isActive = pageNumber === currentPage;

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
          disabled={currentPage === lastPage}
          onClick={() => onPageChange(currentPage + 1)}
          tooltip="Próxima página"
        >
          {''}
        </Button>

        {/* Última página */}
        <Button
          variant="outline-secondary"
          size="sm"
          icon="chevron-double-right"
          disabled={currentPage === lastPage}
          onClick={() => onPageChange(lastPage)}
          tooltip="Última página"
        >
          {''}
        </Button>
      </div>
    );
  };

  // Se não há dados para paginar
  if (lastPage <= 1) {
    return (
      <div className={`table-pagination ${className}`}>
        {renderPageInfo()}
        {renderPageSizeSelector()}
      </div>
    );
  }

  const hasMetaContent = showPageInfo || showPageSizeSelector;

  return (
    <>
      <div className={`table-pagination d-none d-md-flex justify-content-between align-items-center ${className}`}>
        <div className="d-flex align-items-center gap-3">
          {renderPageInfo()}
          {renderPageSizeSelector()}
        </div>
        
        <div className="d-flex align-items-center gap-1">
          {renderNavigationButtons()}
        </div>
      </div>

      <div className="mobile-pagination-placeholder d-md-none" aria-hidden="true" />

      <div className={`table-pagination-mobile d-flex flex-column d-md-none ${className}`}>
        {hasMetaContent && (
          <div className="mobile-pagination-meta">
            {renderPageInfo()}
            {renderPageSizeSelector()}
          </div>
        )}

        <div className="pagination-nav-wrapper">
          {renderNavigationButtons()}
        </div>
      </div>
    </>
  );
};

export default TablePagination;
