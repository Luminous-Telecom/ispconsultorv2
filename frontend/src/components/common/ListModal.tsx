import React, { useMemo } from 'react';
import DraggableModal from './DraggableModal';
import { Table } from '../tables';
import { ListModalProps } from 'types/modal';
import { FilterValue } from 'types/common';

function ListModal<T extends { id: number | string }>({
  show,
  onClose,
  config,
  data,
  loading = false,
  selectedItems: _selectedItems = [],
  onSelectionChange,
  onRowClick,
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
  tableId,
  modalId,
  sortable = true,
  striped = true,
  hover = true,
  responsive = true,
  modalSize = 'lg',
  wrapperTitle,
  onSelectAllPages,
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
    multiSelect = false,
  } = config;

  const tableColumns = useMemo(
    () =>
      columns.map((col) => ({
        key: col.key,
        label: col.label,
        sortable: col.sortable,
        searchable: col.searchable !== false,
        width: col.width,
        sortValue: col.sortValue,
        badgeLabels: col.badgeLabels,
        render: col.render,
      })),
    [columns]
  );

  const mappedBulkActions = useMemo(
    () =>
      bulkActions.map((action) => ({
        key: action.label.toLowerCase().replace(/\s+/g, '-'),
        label: action.label,
        onClick: action.action
          ? (selectedItems: T[]) => {
              if (typeof action.action === 'function') {
                action.action(selectedItems);
              }
            }
          : () => {},
        disabled: (selectedItems: T[]) => {
          if (typeof action.disabled === 'function') {
            return action.disabled(selectedItems);
          }
          return false;
        },
        variant: action.variant,
        requiresSelection: action.requiresSelection,
        dropdown: action.dropdown
          ? action.dropdown.map((item) => ({
              label: item.label,
              action: (selectedItems?: T[]) => {
                if (typeof item.action === 'function') {
                  item.action(selectedItems || []);
                }
              },
              disabled: item.disabled,
            }))
          : undefined,
      })),
    [bulkActions]
  );

  const tableContent = (
    <Table
      syncWithHeader={false}
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
        sortable,
        striped,
        hover,
        responsive,
        emptyMessage,
        className: 'no-padding',
        filters: filters || [],
        bulkActions: mappedBulkActions,
        customControlsAfterActions,
      }}
      search={_search}
      onSelectionChange={onSelectionChange}
      onSort={onSortChange}
      onSearch={(search, field) => {
        onSearchChange?.(search, field ?? '');
      }}
      onSearchFieldChange={onSearchFieldChange}
      onFilter={(filterValues) => {
        onFiltersChange?.(filterValues);
      }}
      onPageChange={onPageChange}
      onPageSizeChange={onLimitChange}
      onRefresh={onRefresh || refreshQueryFn}
      onAudit={onAudit}
      auditEntity={auditEntity}
      onRowClick={onRowClick}
      onRowDoubleClick={onRowDoubleClick}
      onSelectAllPages={onSelectAllPages}
      tableId={tableId}
    />
  );

  if (skipWrapper) {
    return tableContent;
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={wrapperTitle ?? title}
      size={modalSize}
      modalId={modalId ?? tableId}
      className="no-padding list-modal-no-body-scroll"
    >
      {tableContent}
    </DraggableModal>
  );
}

export default ListModal;
