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
      <div>
        <Table
          config={{
            columns: tableColumns,
            data,
            loading,
            pagination,
            selectable: true,
            multiSelect,
            searchable: true,
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
