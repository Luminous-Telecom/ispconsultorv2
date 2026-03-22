import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import { SshAuditService } from 'services/sshAuditService';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import { SshAuditLog, SshAuditAction } from 'types';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';

interface SshAuditModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const ACTION_BADGE: Record<SshAuditAction, { cls: string; label: string }> = {
  CONNECT:        { cls: 'bg-success',          label: 'Conectado' },
  DISCONNECT:     { cls: 'bg-secondary',         label: 'Desconectado' },
  COMMAND:        { cls: 'bg-primary',           label: 'Comando' },
  TERMINAL_COMMAND: { cls: 'bg-primary',        label: 'Comando Terminal' },
  AUTH_FAIL:      { cls: 'bg-danger',            label: 'Falha de Auth' },
  TERMINAL_OPEN:  { cls: 'bg-info text-dark',    label: 'Terminal Aberto' },
  TERMINAL_CLOSE: { cls: 'bg-secondary',         label: 'Terminal Fechado' },
};

const SSH_ACTIONS: SshAuditAction[] = [
  'CONNECT', 'DISCONNECT', 'COMMAND', 'TERMINAL_COMMAND', 'AUTH_FAIL', 'TERMINAL_OPEN', 'TERMINAL_CLOSE',
];

type SshAuditLogRow = SshAuditLog & { id: string };

const SshAuditModal: React.FC<SshAuditModalProps> = ({ show, onClose, skipWrapper = false }) => {
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

  const handleClearFilters = useCallback(() => {
    setTimeout(() => {
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
    queryKey: ['ssh-audit', {
      page: tableFilters.page,
      limit: tableFilters.limit,
      action: filterAction || undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
    }],
    queryFn: () => SshAuditService.list({
      page: tableFilters.page,
      limit: tableFilters.limit,
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
      width: '130px',
      render: (item: SshAuditLog) => {
        const a = ACTION_BADGE[item.action] ?? { cls: 'bg-secondary', label: item.action };
        return <span className={`badge ${a.cls}`}>{a.label}</span>;
      },
    },
    {
      key: 'deviceName',
      label: t('sshDevice.backupDeviceColumn'),
      sortable: false,
      width: '120px',
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
      key: 'userId',
      label: t('audit.user'),
      sortable: false,
      width: '120px',
      render: (item: SshAuditLog) => item.userName?.trim() || item.userId || '-',
    },
    {
      key: 'success',
      label: t('sshAudit.result'),
      sortable: false,
      width: '80px',
      render: (item: SshAuditLog) => (
        <span className={`badge ${item.success ? 'bg-success' : 'bg-danger'}`}>
          {item.success ? 'OK' : 'ERRO'}
        </span>
      ),
    },
    {
      key: 'command',
      label: t('sshAudit.command'),
      sortable: false,
      width: '200px',
      render: (item: SshAuditLog) =>
        item.command
          ? <span className="font-monospace small text-truncate d-inline-block" style={{ maxWidth: '190px' }} title={item.command}>{item.command}</span>
          : '-',
    },
    {
      key: 'duration',
      label: t('sshAudit.duration'),
      sortable: false,
      width: '80px',
      render: (item: SshAuditLog) => item.duration != null ? `${item.duration}ms` : '-',
    },
    {
      key: 'errorMessage',
      label: t('sshAudit.error'),
      sortable: false,
      width: '200px',
      render: (item: SshAuditLog) =>
        item.errorMessage
          ? <span className="text-danger small text-truncate d-inline-block" style={{ maxWidth: '190px' }} title={item.errorMessage}>{item.errorMessage}</span>
          : '-',
    },
    {
      key: 'ip',
      label: t('audit.ip'),
      sortable: false,
      width: '110px',
      render: (item: SshAuditLog) => <span className="font-monospace small">{item.ip}</span>,
    },
  ], [t, formatTimestamp]);

  const customFilters = (
    <div className="row mb-1">
      <div className="col-md-3">
        <label className="form-label small">{t('table.action')}</label>
        <select
          className="form-select form-select-sm"
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); tableFilters.setPage(1); }}
        >
          <option value="">{t('audit.actions.all')}</option>
          {SSH_ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_BADGE[a]?.label ?? a}</option>
          ))}
        </select>
      </div>
      <div className="col-md-3">
        <label className="form-label small">{t('form.startDate')}</label>
        <input
          type="date"
          className="form-control form-control-sm"
          value={filterStartDate}
          onChange={(e) => { setFilterStartDate(e.target.value); tableFilters.setPage(1); }}
        />
      </div>
      <div className="col-md-3">
        <label className="form-label small">{t('form.endDate')}</label>
        <input
          type="date"
          className="form-control form-control-sm"
          value={filterEndDate}
          onChange={(e) => { setFilterEndDate(e.target.value); tableFilters.setPage(1); }}
        />
      </div>
      <div className="col-md-3 d-flex align-items-end">
        <button
          type="button"
          className="btn btn-sm btn-outline-primary w-100"
          onClick={handleClearFilters}
        >
          {t('buttons.clear')}
        </button>
      </div>
    </div>
  );

  const modalContent = (
    <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
      <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ padding: '16px', paddingBottom: '8px', flexShrink: 0 }}>
          {customFilters}
        </div>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            title={t('modal.sshAudit')}
            config={{
              columns: tableColumns,
              data: modalData,
              loading: isLoading,
              searchable: false,
              sortable: false,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              bulkActions: bulkActions.map(action => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                onClick: action.action,
                disabled: action.disabled,
                variant: action.variant,
              })),
              emptyMessage: t('sshAudit.emptyMessage'),
              pagination,
            }}
            tableId="ssh-audit-list"
            syncWithHeader={false}
            onSelectionChange={handleSelectionChange}
            onRefresh={refetch}
            onPageChange={(page) => setTimeout(() => tableFilters.setPage(page), 0)}
            onPageSizeChange={(limit) => setTimeout(() => tableFilters.setLimit(limit), 0)}
            search=""
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
      size="lg"
      modalId="ssh-audit-details-modal"
    >
      <div className="p-3">
        <div className="mb-3">
          <div className="row g-2">
            <div className="col-md-6">
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
                value={ACTION_BADGE[selectedLog.action]?.label ?? selectedLog.action}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('sshDevice.backupDeviceColumn')}</label>
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
                value={selectedLog.clienteName?.trim() || '-'}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('audit.user')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={selectedLog.userName?.trim() || selectedLog.userId || 'N/A'}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('audit.ip')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={selectedLog.ip || 'N/A'}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('sshAudit.result')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={selectedLog.success ? 'OK' : 'ERRO'}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('sshAudit.duration')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={selectedLog.duration != null ? `${selectedLog.duration}ms` : '-'}
                readOnly
              />
            </div>
            {selectedLog.command && (
              <div className="col-12">
                <label className="form-label small text-muted mb-1">{t('sshAudit.command')}</label>
                <textarea
                  className="form-control form-control-sm bg-secondary bg-opacity-10 font-monospace small"
                  value={selectedLog.command}
                  readOnly
                  rows={3}
                />
              </div>
            )}
            {selectedLog.errorMessage && (
              <div className="col-12">
                <label className="form-label small text-muted mb-1">{t('sshAudit.error')}</label>
                <textarea
                  className="form-control form-control-sm bg-secondary bg-opacity-10 text-danger small"
                  value={selectedLog.errorMessage}
                  readOnly
                  rows={2}
                />
              </div>
            )}
            {selectedLog.output && (
              <div className="col-12">
                <label className="form-label small text-muted mb-1">{t('audit.data')}</label>
                <textarea
                  className="form-control font-monospace small bg-secondary bg-opacity-10"
                  value={selectedLog.output}
                  readOnly
                  rows={12}
                  style={{ resize: 'none' }}
                />
              </div>
            )}
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
        title={t('modal.sshAudit')}
        size="xl"
        modalId="ssh-audit-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>
      {detailsModal}
    </>
  );
};

export default SshAuditModal;
