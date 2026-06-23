import React, { useMemo } from 'react';
import DraggableModal from './DraggableModal';
import EmbeddedTablePanel from './EmbeddedTablePanel';
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
  showEmbeddedTableTitle = false,
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
    searchField: configSearchField,
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
        minWidth: col.minWidth,
        maxWidth: col.maxWidth,
        resizable: col.resizable,
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
            return action.disabled.length > 0
              ? (action.disabled as (items: T[]) => boolean)(selectedItems)
              : (action.disabled as () => boolean)();
          }
          if (typeof action.disabled === 'boolean') {
            return action.disabled;
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

  const tableConfig = useMemo(
    () => ({
      columns: tableColumns,
      data,
      loading,
      pagination,
      selectable: true,
      multiSelect,
      searchable: !!onSearchChange,
      searchPlaceholder,
      searchField: configSearchField,
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
    }),
    [
      tableColumns,
      data,
      loading,
      pagination,
      multiSelect,
      onSearchChange,
      searchPlaceholder,
      configSearchField,
      searchFields,
      sortColumn,
      sortDirection,
      sortable,
      striped,
      hover,
      responsive,
      emptyMessage,
      filters,
      mappedBulkActions,
      customControlsAfterActions,
    ]
  );

  const tableProps = {
    syncWithHeader: false as const,
    config: tableConfig,
    search: _search,
    onSelectionChange,
    onSort: onSortChange,
    onSearch: (search: string, field?: string) => {
      onSearchChange?.(search, field ?? '');
    },
    onSearchFieldChange,
    onFilter: (filterValues: Record<string, FilterValue>) => {
      onFiltersChange?.(filterValues);
    },
    onPageChange,
    onPageSizeChange: onLimitChange,
    onRefresh: onRefresh || refreshQueryFn,
    onAudit,
    auditEntity,
    onRowClick,
    onRowDoubleClick,
    onSelectAllPages,
    tableId,
  };

  if (skipWrapper) {
    if (showEmbeddedTableTitle && title) {
      return <EmbeddedTablePanel title={title} {...tableProps} />;
    }
    return <Table {...tableProps} />;
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
      <Table title={title} {...tableProps} />
    </DraggableModal>
  );
}

export default ListModal;
