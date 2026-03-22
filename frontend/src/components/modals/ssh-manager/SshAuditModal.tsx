import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SshAuditService } from 'services/sshAuditService';
import { useTableFilters } from 'hooks/useTableFilters';
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

const SshAuditModal: React.FC<SshAuditModalProps> = ({ show, onClose, skipWrapper = false }) => {
  const [filterAction, setFilterAction] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 20,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

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
  const pagination = useMemo(() => data?.pagination, [data]);

  const tableColumns: TableConfig<SshAuditLog>['columns'] = useMemo(() => [
    {
      key: 'timestamp',
      label: 'Data/Hora',
      sortable: false,
      width: '155px',
      render: (item: SshAuditLog) => (
        <span className="font-monospace small">
          {new Date(item.timestamp).toLocaleString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'action',
      label: 'Ação',
      sortable: false,
      width: '130px',
      render: (item: SshAuditLog) => {
        const a = ACTION_BADGE[item.action] ?? { cls: 'bg-secondary', label: item.action };
        return <span className={`badge ${a.cls}`}>{a.label}</span>;
      },
    },
    {
      key: 'deviceName',
      label: 'Device',
      sortable: false,
      width: '120px',
      render: (item: SshAuditLog) => item.deviceName ?? '-',
    },
    {
      key: 'clienteName',
      label: 'Cliente',
      sortable: false,
      width: '150px',
      render: (item: SshAuditLog) => (
        <span className="small">{item.clienteName?.trim() || '—'}</span>
      ),
    },
    {
      key: 'userId',
      label: 'Usuário',
      sortable: false,
      width: '120px',
      render: (item: SshAuditLog) => item.userName?.trim() || item.userId || '-',
    },
    {
      key: 'success',
      label: 'Resultado',
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
      label: 'Comando',
      sortable: false,
      width: '200px',
      render: (item: SshAuditLog) =>
        item.command
          ? <span className="font-monospace small text-truncate d-inline-block" style={{ maxWidth: '190px' }} title={item.command}>{item.command}</span>
          : '-',
    },
    {
      key: 'duration',
      label: 'Duração',
      sortable: false,
      width: '80px',
      render: (item: SshAuditLog) => item.duration != null ? `${item.duration}ms` : '-',
    },
    {
      key: 'errorMessage',
      label: 'Erro',
      sortable: false,
      width: '200px',
      render: (item: SshAuditLog) =>
        item.errorMessage
          ? <span className="text-danger small text-truncate d-inline-block" style={{ maxWidth: '190px' }} title={item.errorMessage}>{item.errorMessage}</span>
          : '-',
    },
    {
      key: 'ip',
      label: 'IP',
      sortable: false,
      width: '110px',
      render: (item: SshAuditLog) => <span className="font-monospace small">{item.ip}</span>,
    },
  ], []);

  const filters = (
    <div className="d-flex gap-2 flex-wrap p-3 pb-0 align-items-end">
      <div>
        <label className="form-label form-label-sm mb-1">Ação</label>
        <select
          className="form-select form-select-sm"
          style={{ width: '160px' }}
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); tableFilters.setPage(1); }}
        >
          <option value="">Todas</option>
          {SSH_ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_BADGE[a]?.label ?? a}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label form-label-sm mb-1">Data início</label>
        <input
          type="date"
          className="form-control form-control-sm"
          value={filterStartDate}
          onChange={(e) => { setFilterStartDate(e.target.value); tableFilters.setPage(1); }}
        />
      </div>
      <div>
        <label className="form-label form-label-sm mb-1">Data fim</label>
        <input
          type="date"
          className="form-control form-control-sm"
          value={filterEndDate}
          onChange={(e) => { setFilterEndDate(e.target.value); tableFilters.setPage(1); }}
        />
      </div>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => { setFilterAction(''); setFilterStartDate(''); setFilterEndDate(''); tableFilters.setPage(1); }}
      >
        Limpar
      </button>
    </div>
  );

  const modalContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {filters}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table
          title="Auditoria SSH"
          config={{
            columns: tableColumns,
            data: modalData,
            loading: isLoading,
            searchable: false,
            sortable: false,
            striped: true,
            hover: true,
            responsive: true,
            emptyMessage: 'Nenhum log de auditoria SSH encontrado',
            pagination: pagination,
          }}
          tableId="ssh-audit-list"
          syncWithHeader={false}
          onRefresh={refetch}
          onPageChange={(page) => setTimeout(() => tableFilters.setPage(page), 0)}
          onPageSizeChange={(limit) => setTimeout(() => tableFilters.setLimit(limit), 0)}
          search=""
        />
      </div>
    </div>
  );

  if (skipWrapper) return <>{modalContent}</>;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Auditoria SSH"
      size="xl"
      modalId="ssh-audit-modal"
      className="no-padding"
    >
      {modalContent}
    </DraggableModal>
  );
};

export default SshAuditModal;
