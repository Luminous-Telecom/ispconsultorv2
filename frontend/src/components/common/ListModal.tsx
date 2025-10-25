import React from 'react';
import DraggableModal from './DraggableModal';
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
    >
      <div style={{ padding: '16px' }}>
        <Table
          config={{
            columns: tableColumns,
            data,
            loading,
            pagination,
            selectable: true,
            multiSelect,
            searchable: !!onSearchChange,
            searchPlaceholder,
            emptyMessage,
            className: 'no-padding',
            bulkActions: bulkActions.map(action => ({
              key: action.label.toLowerCase().replace(/\s+/g, '-'),
              label: action.label,
              onClick: action.action,
              disabled: action.disabled
            }))
          }}
          onSelectionChange={onSelectionChange}
          onSearch={onSearchChange}
          onPageChange={onPageChange}
          onPageSizeChange={onLimitChange}
          onRefresh={onRefresh}
        />
      </div>
    </DraggableModal>
  );
}

export default ListModal;
