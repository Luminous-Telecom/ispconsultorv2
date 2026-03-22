import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import { SshAuditService } from 'services/sshAuditService';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import { SshAuditLog } from 'types';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import { DateRangeFilter } from 'components/ui';
import { TableConfig } from 'components/tables/types';

interface LogsAgentesModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const AGENT_ACTION_BADGE: Record<string, { cls: string; label: string }> = {
  AGENT_CONNECT:  { cls: 'bg-success',            label: 'Conectado' },
  AGENT_DISCONNECT: { cls: 'bg-warning text-dark', label: 'Desconectado' },
};

const AGENT_ACTIONS = ['AGENT_CONNECT', 'AGENT_DISCONNECT'] as const;

type SshAuditLogRow = SshAuditLog & { id: string };

const LogsAgentesModal: React.FC<LogsAgentesModalProps> = ({ show, onClose, skipWrapper = false }) => {
  const { t } = useI18n();
  const [filterAction, setFilterAction] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SshAuditLog | null>(null);

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const { selectedItem, handleSelectionChange, clearSelection } = useModalSelect<SshAuditLogRow>();

  const handleSearchChange = useCallback(
    (value: string, field?: string) => {
      setTimeout(() => {
        tableFilters.setSearch(value);
        if (field) tableFilters.setSearchField(field);
        tableFilters.setPage(1);
      }, 0);
    },
    [tableFilters]
  );

  const handleSearchFieldChange = useCallback(
    (field: string) => {
      setTimeout(() => {
        tableFilters.setSearchField(field);
        tableFilters.setPage(1);
      }, 0);
    },
    [tableFilters]
  );

  const handleClearFilters = useCallback(() => {
    setTimeout(() => {
      tableFilters.setSearch('');
      tableFilters.setSearchField('');
      setFilterAction('');
      setFilterStartDate('');
      setFilterEndDate('');
      tableFilters.setPage(1);
    }, 0);
  }, [tableFilters]);

  const handleViewDetails = useCallback((log: SshAuditLogRow) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  }, []);

  const formatTimestamp = useCallback((timestamp: string) => {
    try {
      return formatDateTime(new Date(timestamp));
    } catch {
      return timestamp;
    }
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['logs-agentes', {
      page: tableFilters.page,
      limit: tableFilters.limit,
      search: tableFilters.debouncedSearch || undefined,
      searchField: tableFilters.searchField || undefined,
      action: filterAction || undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
    }],
    queryFn: () => SshAuditService.list({
      logType: 'agentes',
      page: tableFilters.page,
      limit: tableFilters.limit,
      search: tableFilters.debouncedSearch || undefined,
      searchField: tableFilters.searchField || undefined,
      action: filterAction || undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
    }),
    enabled: show,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const modalData = useMemo(
    () => (data?.data ?? []).map((item, idx) => ({ ...item, id: item.id ?? `audit-${idx}` })),
    [data]
  );

  const pagination = useMemo(() => {
    const pag = data?.pagination;
    if (!pag || typeof pag !== 'object') {
      return {
        current_page: 1,
        last_page: 1,
        per_page: tableFilters.limit,
        total: 0,
        from: 0,
        to: 0,
      };
    }
    const total = pag.total ?? 0;
    const perPage = pag.per_page ?? tableFilters.limit;
    const currentPage = pag.current_page ?? 1;
    let lastPage = pag.last_page;
    if (!lastPage && total > 0) {
      lastPage = Math.max(1, Math.ceil(total / perPage));
    } else if (!lastPage) {
      lastPage = 1;
    }
    return {
      current_page: currentPage,
      last_page: lastPage,
      per_page: perPage,
      total,
      from: pag.from ?? ((currentPage - 1) * perPage) + 1,
      to: pag.to ?? Math.min(currentPage * perPage, total),
    };
  }, [data?.pagination, tableFilters.limit]);

  const bulkActions = useMemo(() => [
    {
      label: t('audit.viewDetails'),
      variant: 'primary' as const,
      disabled: (selectedItems: SshAuditLogRow[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: SshAuditLogRow[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) handleViewDetails(item);
      },
    },
  ], [t, selectedItem, handleViewDetails]);

  const tableColumns: TableConfig<SshAuditLog>['columns'] = useMemo(() => [
    {
      key: 'timestamp',
      label: t('audit.timestamp'),
      sortable: false,
      width: '155px',
      render: (item: SshAuditLog) => (
        <span className="font-monospace small">{formatTimestamp(item.timestamp)}</span>
      ),
    },
    {
      key: 'action',
      label: t('table.action'),
      sortable: false,
      width: '140px',
      render: (item: SshAuditLog) => {
        const a = AGENT_ACTION_BADGE[item.action] ?? { cls: 'bg-secondary', label: item.action };
        return <span className={`badge ${a.cls}`}>{a.label}</span>;
      },
    },
    {
      key: 'deviceName',
      label: t('logs.agentColumn'),
      sortable: false,
      width: '180px',
      render: (item: SshAuditLog) => item.deviceName ?? '-',
    },
    {
      key: 'clienteName',
      label: t('table.client'),
      sortable: false,
      width: '150px',
      render: (item: SshAuditLog) => (
        <span className="small">{item.clienteName?.trim() || '—'}</span>
      ),
    },
    {
      key: 'ip',
      label: t('audit.ip'),
      sortable: false,
      width: '120px',
      render: (item: SshAuditLog) => <span className="font-monospace small">{item.ip}</span>,
    },
  ], [t, formatTimestamp]);

  const filterControls = (
    <div className="d-flex flex-nowrap align-items-center justify-content-center small filter-compact" style={{ gap: 2 }}>
      <div className="d-flex align-items-center filter-compact" style={{ gap: 2 }}>
        <span className="text-muted" style={{ fontSize: '0.65rem', lineHeight: 1 }}>{t('table.action')}:</span>
        <select
          className="form-select form-select-sm"
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); tableFilters.setPage(1); }}
          style={{ width: 'auto', fontSize: '0.65rem', height: '1.25rem', lineHeight: 1, boxSizing: 'border-box' }}
        >
          <option value="">{t('audit.actions.all')}</option>
          {AGENT_ACTIONS.map((a) => (
            <option key={a} value={a}>{AGENT_ACTION_BADGE[a]?.label ?? a}</option>
          ))}
        </select>
      </div>
      <DateRangeFilter
        startDate={filterStartDate}
        endDate={filterEndDate}
        onStartDateChange={(v) => { setFilterStartDate(v); tableFilters.setPage(1); }}
        onEndDateChange={(v) => { setFilterEndDate(v); tableFilters.setPage(1); }}
      />
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        style={{ fontSize: '0.65rem', height: '1.25rem', lineHeight: 1, boxSizing: 'border-box' }}
        onClick={handleClearFilters}
      >
        {t('buttons.clear')}
      </button>
    </div>
  );

  const modalContent = (
    <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
      <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            title={t('logs.agentes')}
            config={{
              columns: tableColumns,
              data: modalData,
              loading: isLoading,
              searchable: true,
              searchPlaceholder: t('layout.searchPlaceholder'),
              searchField: tableFilters.searchField || 'deviceName',
              searchFields: [
                { key: 'deviceName', label: t('logs.agentColumn') },
                { key: 'ip', label: t('audit.ip') },
              ],
              sortable: false,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              customControls: filterControls,
              bulkActions: bulkActions.map(action => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                onClick: action.action,
                disabled: action.disabled,
                variant: action.variant,
              })),
              emptyMessage: t('logs.agentesEmpty'),
              pagination,
            }}
            tableId="logs-agentes-list"
            syncWithHeader={false}
            onSelectionChange={handleSelectionChange}
            onRefresh={refetch}
            onPageChange={(page) => setTimeout(() => tableFilters.setPage(page), 0)}
            onPageSizeChange={(limit) => setTimeout(() => tableFilters.setLimit(limit), 0)}
            onSearch={handleSearchChange}
            onSearchFieldChange={handleSearchFieldChange}
            search={tableFilters.search}
          />
        </div>
      </div>
    </div>
  );

  const detailsModal = selectedLog && (
    <DraggableModal
      show={showDetailsModal}
      onClose={() => {
        setShowDetailsModal(false);
        setSelectedLog(null);
      }}
      title={t('audit.detailsTitle')}
      size="md"
      modalId="logs-agentes-details-modal"
    >
      <div className="p-3">
        <div className="row g-2">
          <div className="col-12">
            <label className="form-label small text-muted mb-1">{t('audit.timestamp')}</label>
            <input
              type="text"
              className="form-control form-control-sm bg-secondary bg-opacity-10"
              value={formatTimestamp(selectedLog.timestamp)}
              readOnly
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small text-muted mb-1">{t('table.action')}</label>
            <input
              type="text"
              className="form-control form-control-sm bg-secondary bg-opacity-10"
              value={AGENT_ACTION_BADGE[selectedLog.action]?.label ?? selectedLog.action}
              readOnly
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small text-muted mb-1">{t('logs.agentColumn')}</label>
            <input
              type="text"
              className="form-control form-control-sm bg-secondary bg-opacity-10"
              value={selectedLog.deviceName || '-'}
              readOnly
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small text-muted mb-1">{t('table.client')}</label>
            <input
              type="text"
              className="form-control form-control-sm bg-secondary bg-opacity-10"
              value={selectedLog.clienteName?.trim() || '—'}
              readOnly
            />
          </div>
          <div className="col-12">
            <label className="form-label small text-muted mb-1">{t('audit.ip')}</label>
            <input
              type="text"
              className="form-control form-control-sm bg-secondary bg-opacity-10 font-monospace"
              value={selectedLog.ip || '-'}
              readOnly
            />
          </div>
        </div>
      </div>
    </DraggableModal>
  );

  if (skipWrapper) {
    return (
      <>
        {modalContent}
        {detailsModal}
      </>
    );
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        title={t('logs.agentes')}
        size="xl"
        modalId="logs-agentes-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>
      {detailsModal}
    </>
  );
};

export default LogsAgentesModal;
