import React, { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { TableConfig } from 'components/tables/types';
import { Badge } from 'components/ui';
import { useTableFilters } from 'hooks/useTableFilters';
import { useModalSelect } from 'hooks/useModalSelect';
import DraggableModal from 'components/common/DraggableModal';
import { FormField } from 'components/ui';
import { defaultApiClient } from 'services/core';
import { getOrdemServicoStatusBadgeConfig } from 'components/modals/ordens-servico/ordemServicoStatusBadges';
import { formatDateTime } from 'utils/formatters';

export interface IxcOsSyncLogRow {
  id: number;
  integracao_id: number | null;
  integracao_nome: string | null;
  event_type: string | null;
  status: string | null;
  trigger_type: string | null;
  ordem_servico_id: number | null;
  ixc_os_id: string | null;
  protocolo: string | null;
  cliente_nome: string | null;
  origem_abertura: string | null;
  operador_nome: string | null;
  status_anterior: string | null;
  status_novo: string | null;
  message: string | null;
  created_at: string;
}

const EVENT_LABELS: Record<string, string> = {
  sync_batch: 'Sincronização agendada',
  os_abertura: 'Abertura de OS',
  os_fechamento: 'Fechamento de OS',
  os_mensagem: 'Nova mensagem',
  os_status: 'Alteração de status',
  os_sync: 'Atualização de OS',
};

const ORIGEM_LABELS: Record<string, string> = {
  backnet: 'BackNet',
  ixc: 'IXC Provedor',
};

const TRIGGER_LABELS: Record<string, string> = {
  scheduled: 'Agendada',
  manual: 'Manual',
  create: 'Criação',
};

const STATUS_LOG_LABELS: Record<string, string> = {
  success: 'Sucesso',
  failed: 'Falha',
  info: 'Informação',
};

const noopChange = () => undefined;

const displayText = (value?: string | null): string => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
};

interface IxcOsSyncLogsModalProps {
  show: boolean;
  onClose?: () => void;
  skipWrapper?: boolean;
}

type LogColumns = TableConfig<IxcOsSyncLogRow>['columns'];

const IxcOsSyncLogsModal: React.FC<IxcOsSyncLogsModalProps> = ({ show }) => {
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 20,
    initialSortColumn: 'created_at',
    initialSortDirection: 'desc',
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const [selectedLog, setSelectedLog] = useState<IxcOsSyncLogRow | null>(null);
  const { selectedItem, handleSelectionChange } = useModalSelect<IxcOsSyncLogRow>();

  const queryParams = useMemo(
    () => ({
      page: tableFilters.page,
      limit: tableFilters.limit,
      search: tableFilters.debouncedSearch || undefined,
    }),
    [tableFilters.page, tableFilters.limit, tableFilters.debouncedSearch]
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ixc-os-sync-logs', queryParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(queryParams.page));
      params.set('limit', String(queryParams.limit));
      if (queryParams.search) params.set('search', queryParams.search);
      const res = await defaultApiClient.get<{
        data: IxcOsSyncLogRow[];
        pagination: {
          total: number;
          per_page: number;
          current_page: number;
          last_page: number;
          from: number;
          to: number;
        };
      }>(`/integracao-ixc-provedor/sync-logs?${params.toString()}`);
      return res.data;
    },
    enabled: show,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const rows = data?.data ?? [];

  const pagination = useMemo(() => {
    const p = data?.pagination;
    return {
      current_page: p?.current_page ?? 1,
      last_page: p?.last_page ?? 1,
      per_page: p?.per_page ?? tableFilters.limit,
      total: p?.total ?? 0,
      from: p?.from ?? 0,
      to: p?.to ?? 0,
    };
  }, [data, tableFilters.limit]);

  const handleViewDetails = useCallback(
    (items: unknown[]) => {
      const item = items.length > 0 ? items[0] : selectedItem;
      if (item) setSelectedLog(item as IxcOsSyncLogRow);
    },
    [selectedItem]
  );

  const columns = useMemo((): LogColumns => [
    {
      key: 'created_at',
      label: 'Data',
      sortable: true,
      width: '150px',
      render: (item) => <span className="small">{formatDateTime(item.created_at)}</span>,
    },
    {
      key: 'event_type',
      label: 'Evento',
      sortable: false,
      width: '150px',
      render: (item) => (
        <span className="small">{EVENT_LABELS[item.event_type ?? ''] ?? item.event_type ?? '—'}</span>
      ),
    },
    {
      key: 'protocolo',
      label: 'OS',
      sortable: false,
      width: '110px',
      render: (item) => <span className="small">{item.protocolo ?? item.ixc_os_id ?? '—'}</span>,
    },
    {
      key: 'cliente_nome',
      label: 'Cliente',
      sortable: false,
      width: '160px',
      render: (item) => (
        <span className="small text-truncate d-inline-block truncate-max-150"  title={item.cliente_nome ?? ''}>
          {item.cliente_nome ?? '—'}
        </span>
      ),
    },
    {
      key: 'origem_abertura',
      label: 'Origem',
      sortable: false,
      width: '110px',
      render: (item) => (
        <span className="small">
          {item.origem_abertura ? ORIGEM_LABELS[item.origem_abertura] ?? item.origem_abertura : '—'}
        </span>
      ),
    },
    {
      key: 'operador_nome',
      label: 'Operador',
      sortable: false,
      width: '140px',
      render: (item) => <span className="small">{item.operador_nome ?? '—'}</span>,
    },
    {
      key: 'integracao_nome',
      label: 'Integração',
      sortable: false,
      width: '140px',
      render: (item) => (
        <span className="small text-truncate d-inline-block truncate-max-130"  title={item.integracao_nome ?? ''}>
          {item.integracao_nome ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      width: '90px',
      render: (item) => {
        const status = item.status ?? '';
        const variant = status === 'success' ? 'success' : status === 'failed' ? 'danger' : 'secondary';
        return <Badge variant={variant}>{status || 'info'}</Badge>;
      },
    },
    {
      key: 'message',
      label: 'Mensagem',
      sortable: false,
      render: (item) => (
        <span className="small text-truncate d-inline-block truncate-max-280"  title={item.message ?? ''}>
          {item.message ?? '—'}
        </span>
      ),
    },
  ], []);

  const searchFields = useMemo(
    () => [
      { key: 'protocolo', label: 'Protocolo' },
      { key: 'cliente_nome', label: 'Cliente' },
      { key: 'operador_nome', label: 'Operador' },
      { key: 'message', label: 'Mensagem' },
    ],
    []
  );

  return (
    <>
      <EmbeddedTablePanel<IxcOsSyncLogRow>
        config={{
          columns,
          data: rows,
          loading: isLoading,
          searchable: true,
          searchPlaceholder: 'Buscar por protocolo, cliente, operador...',
          searchFields,
          sortable: true,
          sortColumn: tableFilters.sortColumn,
          sortDirection: tableFilters.sortDirection,
          striped: true,
          hover: true,
          responsive: true,
          selectable: true,
          multiSelect: false,
          bulkActions: [
            {
              key: 'ver-detalhes',
              label: 'Ver detalhes',
              variant: 'primary',
              requiresSelection: true,
              onClick: handleViewDetails,
            },
          ],
          emptyMessage: 'Nenhum log de sincronização IXC registrado',
          pagination,
        }}
        tableId="ixc-os-sync-logs"
        onSelectionChange={(items) => handleSelectionChange(items as IxcOsSyncLogRow[])}
        onRefresh={() => refetch()}
        onPageChange={tableFilters.setPage}
        onPageSizeChange={tableFilters.setLimit}
        onSort={tableFilters.setSort}
        onSearch={(search, field) => {
          tableFilters.setSearch(search);
          if (field) tableFilters.setSearchField(field);
        }}
        search={tableFilters.search}
      />

      {selectedLog && (
        <DraggableModal
          show={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Detalhes do log IXC"
          size="lg"
          modalId="ixc-os-sync-log-details"
        >
          <div className="p-3 logs-auditoria-details">
            <div className="row g-2">
              <div className="col-md-6">
                <FormField
                  name="created_at"
                  type="text"
                  label="Data"
                  value={formatDateTime(selectedLog.created_at)}
                  onChange={noopChange}
                  size="sm"
                  readOnly
                />
              </div>
              <div className="col-md-6">
                <FormField
                  name="event_type"
                  type="text"
                  label="Evento"
                  value={
                    EVENT_LABELS[selectedLog.event_type ?? ''] ??
                    displayText(selectedLog.event_type)
                  }
                  onChange={noopChange}
                  size="sm"
                  readOnly
                />
              </div>
              <div className="col-md-6">
                <FormField
                  name="status"
                  type="text"
                  label="Status"
                  value={
                    STATUS_LOG_LABELS[selectedLog.status ?? ''] ??
                    displayText(selectedLog.status)
                  }
                  onChange={noopChange}
                  size="sm"
                  readOnly
                  className={
                    selectedLog.status === 'failed'
                      ? 'text-danger'
                      : selectedLog.status === 'success'
                        ? 'text-success'
                        : ''
                  }
                />
              </div>
              <div className="col-md-6">
                <FormField
                  name="trigger_type"
                  type="text"
                  label="Disparo"
                  value={
                    selectedLog.trigger_type
                      ? TRIGGER_LABELS[selectedLog.trigger_type] ?? selectedLog.trigger_type
                      : '—'
                  }
                  onChange={noopChange}
                  size="sm"
                  readOnly
                />
              </div>
              <div className="col-md-6">
                <FormField
                  name="protocolo"
                  type="text"
                  label="Protocolo"
                  value={displayText(selectedLog.protocolo)}
                  onChange={noopChange}
                  size="sm"
                  readOnly
                />
              </div>
              <div className="col-md-6">
                <FormField
                  name="ixc_os_id"
                  type="text"
                  label="ID IXC"
                  value={displayText(selectedLog.ixc_os_id)}
                  onChange={noopChange}
                  size="sm"
                  readOnly
                />
              </div>
              <div className="col-md-6">
                <FormField
                  name="cliente_nome"
                  type="text"
                  label="Cliente"
                  value={displayText(selectedLog.cliente_nome)}
                  onChange={noopChange}
                  size="sm"
                  readOnly
                />
              </div>
              <div className="col-md-6">
                <FormField
                  name="origem_abertura"
                  type="text"
                  label="Origem"
                  value={
                    selectedLog.origem_abertura
                      ? ORIGEM_LABELS[selectedLog.origem_abertura] ?? selectedLog.origem_abertura
                      : '—'
                  }
                  onChange={noopChange}
                  size="sm"
                  readOnly
                />
              </div>
              <div className="col-md-6">
                <FormField
                  name="operador_nome"
                  type="text"
                  label="Operador"
                  value={displayText(selectedLog.operador_nome)}
                  onChange={noopChange}
                  size="sm"
                  readOnly
                />
              </div>
              <div className="col-md-6">
                <FormField
                  name="integracao_nome"
                  type="text"
                  label="Integração"
                  value={displayText(selectedLog.integracao_nome)}
                  onChange={noopChange}
                  size="sm"
                  readOnly
                />
              </div>
              {selectedLog.status_anterior && (
                <div className="col-md-6">
                  <FormField
                    name="status_anterior"
                    type="text"
                    label="Status anterior"
                    value={getOrdemServicoStatusBadgeConfig(selectedLog.status_anterior).label}
                    onChange={noopChange}
                    size="sm"
                    readOnly
                  />
                </div>
              )}
              {selectedLog.status_novo && (
                <div className="col-md-6">
                  <FormField
                    name="status_novo"
                    type="text"
                    label="Status novo"
                    value={getOrdemServicoStatusBadgeConfig(selectedLog.status_novo).label}
                    onChange={noopChange}
                    size="sm"
                    readOnly
                  />
                </div>
              )}
              <div className="col-12">
                <FormField
                  name="message"
                  type="textarea"
                  label="Mensagem"
                  value={displayText(selectedLog.message)}
                  onChange={noopChange}
                  rows={Math.min(
                    12,
                    Math.max(4, (selectedLog.message ?? '').split('\n').length + 1)
                  )}
                  size="sm"
                  readOnly
                  className={selectedLog.status === 'failed' ? 'text-danger' : ''}
                />
              </div>
            </div>
          </div>
        </DraggableModal>
      )}
    </>
  );
};

export default IxcOsSyncLogsModal;
