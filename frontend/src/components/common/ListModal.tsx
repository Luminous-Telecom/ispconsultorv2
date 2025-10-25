import React from 'react';
import DraggableModal from './DraggableModal';
import ModalHeaderActions from './ModalHeaderActions';
import { Table } from '../tables';
import { ListModalProps } from '../../types/modal';

function ListModal<T extends { id: any }>({
  show,
  onClose,
  config,
  data,
  loading = false,
  selectedItems = [],
  onSelectionChange,
  search = '',
  onSearchChange,
  pagination,
  onPageChange,
  limit = 15,
  onLimitChange,
  onRefresh,
  bulkActions = []
}: ListModalProps<T>) {
  const {
    title,
    columns,
    searchPlaceholder = 'Buscar...',
    emptyMessage = 'Nenhum item encontrado',
    multiSelect = false
  } = config;

  // Converter colunas para o formato da Table
  const tableColumns = columns.map(col => ({
    key: col.key,
    label: col.label,
    sortable: col.sortable,
    width: col.width,
    render: col.render
  }));

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      className="no-padding"
      headerActions={
        bulkActions.length > 0 ? (
          <ModalHeaderActions
            bulkActions={bulkActions}
            selectedItems={selectedItems}
            search=""
            onSearchChange={() => {}}
            searchPlaceholder=""
            limit={15}
            onLimitChange={() => {}}
            pagination={undefined}
            onPageChange={() => {}}
            onRefresh={onRefresh}
          />
        ) : undefined
      }
    >
      <div style={{ padding: '16px' }}>
        {/* Busca e Paginação na mesma linha */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          {/* Campo de busca à esquerda */}
          {onSearchChange && (
            <div className="d-flex align-items-center">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{ width: '400px', height: '32px' }}
              />
            </div>
          )}
          
          {/* Paginação à direita */}
          {pagination && (
            <div className="d-flex align-items-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <select
                  className="form-select form-select-sm"
                  value={limit}
                  onChange={(e) => onLimitChange?.(parseInt(e.target.value))}
                  style={{ width: '80px' }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="small text-muted">Itens por página</span>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted">
                  {pagination.from} - {pagination.to} de {pagination.total}
                </span>
                <div className="d-flex gap-1">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => onPageChange?.(1)}
                    disabled={pagination.current_page <= 1}
                  >
                    <i className="bi bi-chevron-double-left"></i>
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => onPageChange?.(pagination.current_page - 1)}
                    disabled={pagination.current_page <= 1}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => onPageChange?.(pagination.current_page + 1)}
                    disabled={pagination.current_page >= pagination.last_page}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => onPageChange?.(pagination.last_page)}
                    disabled={pagination.current_page >= pagination.last_page}
                  >
                    <i className="bi bi-chevron-double-right"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <Table
          config={{
            columns: tableColumns,
            data,
            loading,
            pagination: undefined, // Paginação gerenciada externamente pelo ListModal
            selectable: true,
            multiSelect,
            searchable: false, // Busca gerenciada externamente pelo ListModal
            searchPlaceholder,
            emptyMessage,
            className: 'no-padding'
          }}
          onSelectionChange={onSelectionChange}
          onPageChange={onPageChange}
          onPageSizeChange={onLimitChange}
          onRefresh={onRefresh}
        />
      </div>
    </DraggableModal>
  );
}

export default ListModal;
