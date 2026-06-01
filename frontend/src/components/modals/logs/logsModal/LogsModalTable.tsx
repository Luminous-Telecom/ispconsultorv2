import React from 'react';
import { LimparButton } from 'components/ui';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { DateRangeFilter } from 'components/ui';
import { TableConfig } from 'components/tables/types';
import type { useLogsContent } from './hooks/useLogsContent';

type LogsContent = ReturnType<typeof useLogsContent>;

interface BulkAction {
  label: string;
  variant: 'primary';
  disabled: (items: unknown[]) => boolean;
  requiresSelection: boolean;
  action: (items: unknown[]) => void;
}

interface LogsModalTableProps {
  effectiveVariant: 'erp' | 'saas';
  logType: string;
  ctx: LogsContent;
  columns: TableConfig<unknown>['columns'];
  modalData: { id: number | string }[];
  isLoading: boolean;
  title: string;
  emptyMessage: string;
  searchPlaceholder: string;
  defaultSearchField: string;
  searchFields: { key: string; label: string }[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
  bulkActions: BulkAction[];
  isEquipamentosOuAgentes: boolean;
  handleSearchChange: (value: string, field?: string) => void;
  handleClearFilters: () => void;
  handleSelectionChange: (items: { id: number | string }[]) => void;
  refetch: () => void;
}

const LogsModalTable: React.FC<LogsModalTableProps> = ({
  effectiveVariant,
  logType,
  ctx,
  columns,
  modalData,
  isLoading,
  title,
  emptyMessage,
  searchPlaceholder,
  defaultSearchField,
  searchFields,
  pagination,
  bulkActions,
  isEquipamentosOuAgentes,
  handleSearchChange,
  handleClearFilters,
  handleSelectionChange,
  refetch,
}) => {
  const {
    tableFilters,
    filterStartDate,
    filterEndDate,
    setFilterStartDate,
    setFilterEndDate,
  } = ctx;

  const equipamentosAgentesDateControls = isEquipamentosOuAgentes && (
    <div
      className="d-flex flex-nowrap align-items-center justify-content-center small filter-compact"
      style={{ gap: 2 }}
    >
      <DateRangeFilter
        startDate={filterStartDate}
        endDate={filterEndDate}
        onStartDateChange={(v) => {
          setFilterStartDate(v);
          tableFilters.setPage(1);
        }}
        onEndDateChange={(v) => {
          setFilterEndDate(v);
          tableFilters.setPage(1);
        }}
      />
      <LimparButton
        type="button"
        size="sm"
        className="table-toolbar-btn"
        style={{ fontSize: '0.65rem', height: '1.25rem' }}
        onClick={handleClearFilters}
      />
    </div>
  );

  return (
    <EmbeddedTablePanel
      title={title}
      config={{
        columns,
        data: modalData,
        loading: isLoading,
        searchable: true,
        searchPlaceholder,
        searchField: tableFilters.searchField || defaultSearchField,
        searchFields,
        sortable: true,
        sortColumn: tableFilters.sortColumn,
        sortDirection: tableFilters.sortDirection,
        striped: true,
        hover: true,
        responsive: true,
        selectable: true,
        multiSelect: false,
        customControls: equipamentosAgentesDateControls || undefined,
        bulkActions: bulkActions.map((a) => ({
          key: a.label.toLowerCase().replace(/\s+/g, '-'),
          label: a.label,
          onClick: a.action,
          disabled: a.disabled,
          variant: a.variant,
          requiresSelection: a.requiresSelection,
        })),
        emptyMessage,
        pagination,
      }}
      tableId={`logs-table-${effectiveVariant}-${logType}`}
      onSelectionChange={(items) => handleSelectionChange(items as { id: number | string }[])}
      onRefresh={() => refetch()}
      onPageChange={(p) => setTimeout(() => tableFilters.setPage(p), 0)}
      onPageSizeChange={(l) => setTimeout(() => tableFilters.setLimit(l), 0)}
      onSort={(col, dir) => setTimeout(() => tableFilters.setSort(col, dir), 0)}
      onSearch={handleSearchChange}
      onSearchFieldChange={(f) => setTimeout(() => tableFilters.setSearchField(f), 0)}
      search={tableFilters.search}
    />
  );
};

export default LogsModalTable;
