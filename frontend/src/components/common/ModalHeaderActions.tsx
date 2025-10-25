import React from 'react';

interface BulkAction {
  label: string;
  action: (selectedItems: any[]) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
  disabled?: (selectedItems: any[]) => boolean;
}

interface ModalHeaderActionsProps {
  bulkActions: BulkAction[];
  selectedItems: any[];
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  limit: number;
  onLimitChange: (limit: number) => void;
  pagination?: {
    from: number;
    to: number;
    total: number;
    current_page: number;
    last_page: number;
  };
  onPageChange: (page: number) => void;
  onRefresh?: () => void;
  idPrefix?: string; // Para tornar IDs únicos
}

const ModalHeaderActions: React.FC<ModalHeaderActionsProps> = ({
  bulkActions,
  selectedItems,
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  limit,
  onLimitChange,
  pagination,
  onPageChange,
  onRefresh,
  idPrefix = 'modal-header'
}) => {
  const goToFirstPage = () => onPageChange(1);
  const goToLastPage = () => onPageChange(pagination?.last_page || 1);
  const goToPrevPage = () => onPageChange(Math.max(1, (pagination?.current_page || 1) - 1));
  const goToNextPage = () => onPageChange(Math.min(pagination?.last_page || 1, (pagination?.current_page || 1) + 1));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* Linha 1: Botões */}
      <div className="d-flex justify-content-start">
        <div className="d-flex" style={{ gap: '8px' }}>
          {bulkActions.map((bulkAction, index) => {
            const isNewButton = bulkAction.label.toLowerCase().includes('nova') || bulkAction.label.toLowerCase().includes('novo');
            const isDisabledBySelection = !isNewButton && selectedItems.length === 0;
            const isDisabledByCondition = bulkAction.disabled ? bulkAction.disabled(selectedItems) : false;
            const isDisabled = isDisabledBySelection || isDisabledByCondition;
            
            return (
              <button
                key={index}
                className={`btn btn-sm btn-${bulkAction.variant || 'primary'}`}
                onClick={() => {
                  if (!isDisabled) {
                    bulkAction.action(selectedItems);
                  }
                }}
                disabled={isDisabled}
                style={{ flexShrink: 0 }}
              >
                {bulkAction.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Linha 2: Busca à esquerda, paginação à direita */}
      <div className="d-flex">
        {/* Busca à esquerda */}
        <div className="d-flex gap-2">
          <input
            type="text"
            className="form-control form-control-sm"
            id={`search-header-${Math.random().toString(36).substr(2, 9)}`}
            name="searchHeader"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ width: '300px', height: '32px' }}
          />
        </div>

        {/* Paginação à direita */}
        <div className="d-flex gap-2" style={{ marginLeft: 'auto' }}>
          {/* Seletor de linhas por página */}
          <select 
            className="form-select form-select-sm" 
            id={`${idPrefix}-limit`}
            name="modalHeaderLimit"
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            style={{ width: '80px', height: '32px', cursor: 'pointer' }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          {/* Paginação compacta */}
          <div className="d-flex gap-1">
            <button 
              className="btn btn-outline-secondary btn-sm" 
              onClick={goToFirstPage}
              disabled={!pagination || pagination.current_page <= 1}
            >
              <i className="bi bi-chevron-double-left"></i>
            </button>
            <button 
              className="btn btn-outline-secondary btn-sm" 
              onClick={goToPrevPage}
              disabled={!pagination || pagination.current_page <= 1}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <span className="small text-muted mx-2">
              {pagination ? `${pagination.from} - ${pagination.to} / ${pagination.total}` : '0 - 0 / 0'}
            </span>
            <button 
              className="btn btn-outline-secondary btn-sm" 
              onClick={goToNextPage}
              disabled={!pagination || pagination.current_page >= (pagination?.last_page || 1)}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
            <button 
              className="btn btn-outline-secondary btn-sm" 
              onClick={goToLastPage}
              disabled={!pagination || pagination.current_page >= (pagination?.last_page || 1)}
            >
              <i className="bi bi-chevron-double-right"></i>
            </button>
          </div>

          {/* Botão de refresh */}
          {onRefresh && (
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={onRefresh}
              title="Recarregar dados"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalHeaderActions;
