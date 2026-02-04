import React, { useMemo } from 'react';
import DraggableModal from './DraggableModal';
import { Table } from '../tables';
import { ListModalProps } from '@/types/modal';
import { FilterValue } from '@/types/common';

function ListModal<T extends { id: number | string }>({
  show,
  onClose,
  config,
  data,
  loading = false,
  selectedItems: _selectedItems = [],
  onSelectionChange,
  onRowDoubleClick,
  search: _search = '',
  onSearchChange,
  onSearchFieldChange,
  sortColumn,
  sortDirection,
  onSortChange,
  pagination,
  onPageChange,
  limit: _limit = 15,
  onLimitChange,
  onRefresh,
  refreshQueryFn,
  bulkActions = [],
  onAudit,
  auditEntity,
  skipWrapper = false,
  filters,
  filterValues: _filterValues,
  onFilterChange: _onFilterChange,
  onFiltersChange,
  onClearFilters: _onClearFilters,
  customControlsAfterActions,
  tableId
}: ListModalProps<T> & {
  filters?: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'boolean';
    options?: Array<{ value: string | number; label: string }>;
    placeholder?: string;
  }>;
  filterValues?: Record<string, FilterValue>;
  onFilterChange?: (key: string, value: FilterValue) => void;
  onFiltersChange?: (filters: Record<string, FilterValue>) => void;
  onClearFilters?: () => void;
}) {
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
    <div className="list-modal-table-wrapper">
      <div className="list-modal-scroll-wrapper">
        <Table
        title={title}
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
          sortColumn,
          sortDirection,
          emptyMessage,
          className: 'no-padding',
          filters: filters || [],
          bulkActions: useMemo(() => {
            return bulkActions.map(action => ({
              key: action.label.toLowerCase().replace(/\s+/g, '-'),
              label: action.label,
              onClick: action.action ? (selectedItems: T[]) => {
                // Sempre passar selectedItems - funções que não usam parâmetros podem ignorá-los
                if (typeof action.action === 'function') {
                  action.action(selectedItems);
                }
              } : () => {},
              disabled: (selectedItems: T[]) => {
                if (typeof action.disabled === 'function') {
                  return action.disabled(selectedItems);
                }
                return false;
              },
              dropdown: action.dropdown ? action.dropdown.map(item => ({
                label: item.label,
                action: (selectedItems?: T[]) => {
                  if (typeof item.action === 'function') {
                    item.action(selectedItems || []);
                  }
                }
              })) : undefined
            }));
          }, [bulkActions]),
          customControlsAfterActions
        }}
        search={_search}
        onSelectionChange={onSelectionChange}
        onSort={onSortChange}
        onSearch={(search, field) => {
          onSearchChange?.(search, field);
        }}
        onSearchFieldChange={onSearchFieldChange}
        onFilter={(filters) => {
          if (onFiltersChange) {
            onFiltersChange(filters);
          }
        }}
        onPageChange={onPageChange}
        onPageSizeChange={onLimitChange}
        onRefresh={onRefresh || refreshQueryFn}
        onAudit={onAudit}
        auditEntity={auditEntity}
        onRowDoubleClick={onRowDoubleClick}
        tableId={tableId}
      />
      </div>
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
