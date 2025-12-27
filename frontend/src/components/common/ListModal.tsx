import React, { useMemo } from 'react';
import DraggableModal from './DraggableModal';
import { Table } from '../tables';
import { ListModalProps } from '@/types/modal';

function ListModal<T extends { id: number | string }>({
  show,
  onClose,
  config,
  data,
  loading = false,
  selectedItems: _selectedItems = [],
  onSelectionChange,
  search: _search = '',
  onSearchChange,
  onSearchFieldChange,
  pagination,
  onPageChange,
  limit: _limit = 15,
  onLimitChange,
  onRefresh,
  refreshQueryFn,
  bulkActions = [],
  onAudit,
  auditEntity,
  skipWrapper = false
}: ListModalProps<T>) {
  const {
    title,
    columns,
    searchPlaceholder = 'Buscar...',
    searchFields,
    emptyMessage = 'Nenhum item encontrado',
    multiSelect = false
  } = config;

  const tableColumns = useMemo(() => {
    return columns.map(col => ({
      key: col.key,
      label: col.label,
      sortable: col.sortable,
      searchable: col.searchable !== false,
      width: col.width,
      render: col.render
    }));
  }, [columns]);

  const tableContent = (
    <div>
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
          searchFields,
          emptyMessage,
          className: 'no-padding',
          bulkActions: useMemo(() => {
            return bulkActions.map(action => ({
              key: action.label.toLowerCase().replace(/\s+/g, '-'),
              label: action.label,
              onClick: (selectedItems: T[]) => {
                if (action.action.length > 0) {
                  (action.action as (selectedItems: T[]) => void)(selectedItems);
                } else {
                  (action.action as () => void)();
                }
              },
              disabled: (selectedItems: T[]) => {
                if (action.disabled) {
                  if (action.disabled.length > 0) {
                    return (action.disabled as (selectedItems: T[]) => boolean)(selectedItems);
                  } else {
                    return (action.disabled as () => boolean)();
                  }
                }
                return false;
              }
            }));
          }, [bulkActions])
        }}
        onSelectionChange={onSelectionChange}
        onSearch={(search, field) => {
          onSearchChange?.(search, field);
        }}
        onSearchFieldChange={onSearchFieldChange}
        onPageChange={onPageChange}
        onPageSizeChange={onLimitChange}
        onRefresh={onRefresh || refreshQueryFn}
        onAudit={onAudit}
        auditEntity={auditEntity}
      />
    </div>
  );

  if (skipWrapper) {
    return tableContent;
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      className="no-padding"
    >
      {tableContent}
    </DraggableModal>
  );
}

export default ListModal;
