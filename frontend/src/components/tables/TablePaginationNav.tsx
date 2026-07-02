import React from 'react';
import { PaginationNavButton } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { TablePaginationValues } from './tablePaginationUtils';

interface TablePaginationNavProps {
  values: TablePaginationValues;
  variant: 'desktop' | 'mobile-compact';
  onGoToPage: (page: number) => void;
  className?: string;
}

const TablePaginationNav: React.FC<TablePaginationNavProps> = ({
  values,
  variant,
  onGoToPage,
  className = '',
}) => {
  const { t } = useI18n();
  const { currentPage, lastPage, from, to, total, visiblePages } = values;

  if (variant === 'mobile-compact') {
    return (
      <div className={`d-flex flex-column gap-2 w-100 ${className}`.trim()}>
        <div className="text-center">
          <span className="small text-muted">
            <strong>{from}</strong> {t('pagination.to')} <strong>{to}</strong> {t('pagination.of')}{' '}
            <strong>{total}</strong>
          </span>
        </div>
        <nav aria-label={t('ui.actionsMenu')} className="d-flex justify-content-center">
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <PaginationNavButton
                label={t('ui.firstPage')}
                onClick={() => onGoToPage(1)}
                disabled={currentPage === 1}
              >
                <i className="bi bi-chevron-double-left" />
              </PaginationNavButton>
            </li>
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <PaginationNavButton
                label={t('ui.previousPage')}
                onClick={() => onGoToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <i className="bi bi-chevron-left" />
              </PaginationNavButton>
            </li>
            <li className="page-item active">
              <span className="page-link">
                {currentPage} / {lastPage}
              </span>
            </li>
            <li className={`page-item ${currentPage >= lastPage ? 'disabled' : ''}`}>
              <PaginationNavButton
                label={t('ui.nextPage')}
                onClick={() => onGoToPage(currentPage + 1)}
                disabled={currentPage >= lastPage}
              >
                <i className="bi bi-chevron-right" />
              </PaginationNavButton>
            </li>
            <li className={`page-item ${currentPage >= lastPage ? 'disabled' : ''}`}>
              <PaginationNavButton
                label={t('ui.lastPage')}
                onClick={() => onGoToPage(lastPage)}
                disabled={currentPage >= lastPage}
              >
                <i className="bi bi-chevron-double-right" />
              </PaginationNavButton>
            </li>
          </ul>
        </nav>
      </div>
    );
  }

  return (
    <div className={`d-flex align-items-center gap-3 ${className}`.trim()}>
      <div className="d-flex align-items-center gap-2">
        <span className="text-muted small">
          <strong>{from}</strong> {t('pagination.to')} <strong>{to}</strong> {t('pagination.of')}{' '}
          <strong>{total}</strong>
        </span>
      </div>
      <nav aria-label={t('ui.actionsMenu')}>
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <PaginationNavButton
              label={t('ui.firstPage')}
              onClick={() => onGoToPage(1)}
              disabled={currentPage === 1}
            >
              <i className="bi bi-chevron-double-left" />
            </PaginationNavButton>
          </li>
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <PaginationNavButton
              label={t('ui.previousPage')}
              onClick={() => onGoToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <i className="bi bi-chevron-left" />
            </PaginationNavButton>
          </li>
          {visiblePages.map((page, index) => {
            if (page === '...') {
              return (
                <li key={`dots-${index}`} className="page-item disabled">
                  <span className="page-link">...</span>
                </li>
              );
            }
            const pageNumber = page as number;
            const isActive = pageNumber === currentPage;
            return (
              <li key={pageNumber} className={`page-item ${isActive ? 'active' : ''}`}>
                <PaginationNavButton
                  label={`${t('ui.page')} ${pageNumber}`}
                  onClick={() => onGoToPage(pageNumber)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {pageNumber}
                </PaginationNavButton>
              </li>
            );
          })}
          <li className={`page-item ${currentPage >= lastPage ? 'disabled' : ''}`}>
            <PaginationNavButton
              label={t('ui.nextPage')}
              onClick={() => onGoToPage(currentPage + 1)}
              disabled={currentPage >= lastPage}
            >
              <i className="bi bi-chevron-right" />
            </PaginationNavButton>
          </li>
          <li className={`page-item ${currentPage >= lastPage ? 'disabled' : ''}`}>
            <PaginationNavButton
              label={t('ui.lastPage')}
              onClick={() => onGoToPage(lastPage)}
              disabled={currentPage >= lastPage}
            >
              <i className="bi bi-chevron-double-right" />
            </PaginationNavButton>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default TablePaginationNav;
