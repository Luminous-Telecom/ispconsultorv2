import React, { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import DetailFieldGrid, { type DetailFieldItem } from 'components/common/DetailFieldGrid';
import DraggableModal from 'components/common/DraggableModal';
import { TableConfig } from 'components/tables/types';
import { Badge, FormField } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { useTableFilters } from 'hooks/useTableFilters';
import { useModalSelect } from 'hooks/useModalSelect';
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

const EVENT_I18N_KEYS: Record<string, 'logs.ixc.event.syncBatch' | 'logs.ixc.event.osOpen' | 'logs.ixc.event.osClose' | 'logs.ixc.event.osMessage' | 'logs.ixc.event.osStatus' | 'logs.ixc.event.osSync'> = {
  sync_batch: 'logs.ixc.event.syncBatch',
  os_abertura: 'logs.ixc.event.osOpen',
  os_fechamento: 'logs.ixc.event.osClose',
  os_mensagem: 'logs.ixc.event.osMessage',
  os_status: 'logs.ixc.event.osStatus',
  os_sync: 'logs.ixc.event.osSync',
};

const ORIGEM_I18N_KEYS: Record<string, 'logs.ixc.origin.ispconsultor' | 'logs.ixc.origin.ixc'> = {
  ispconsultor: 'logs.ixc.origin.ispconsultor',
  ixc: 'logs.ixc.origin.ixc',
};

const TRIGGER_I18N_KEYS: Record<string, 'logs.ixc.trigger.scheduled' | 'logs.ixc.trigger.manual' | 'logs.ixc.trigger.create'> = {
  scheduled: 'logs.ixc.trigger.scheduled',
  manual: 'logs.ixc.trigger.manual',
  create: 'logs.ixc.trigger.create',
};

const STATUS_I18N_KEYS: Record<string, 'logs.ixc.status.success' | 'logs.ixc.status.failed' | 'logs.ixc.status.info'> = {
  success: 'logs.ixc.status.success',
  failed: 'logs.ixc.status.failed',
  info: 'logs.ixc.status.info',
};

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
  const { t } = useI18n();
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

  const resolveEventLabel = useCallback(
    (eventType?: string | null) => {
      if (!eventType) return '—';
      const key = EVENT_I18N_KEYS[eventType];
      return key ? t(key) : eventType;
    },
    [t]
  );

  const resolveOriginLabel = useCallback(
    (origin?: string | null) => {
      if (!origin) return '—';
      const key = ORIGEM_I18N_KEYS[origin];
      return key ? t(key) : origin;
    },
    [t]
  );

  const resolveTriggerLabel = useCallback(
    (trigger?: string | null) => {
      if (!trigger) return '—';
      const key = TRIGGER_I18N_KEYS[trigger];
      return key ? t(key) : trigger;
    },
    [t]
  );

  const resolveStatusLabel = useCallback(
    (status?: string | null) => {
      if (!status) return '—';
      const key = STATUS_I18N_KEYS[status];
      return key ? t(key) : status;
    },
    [t]
  );

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
      label: t('audit.timestamp'),
      sortable: true,
      width: '150px',
      render: (item) => <span className="small">{formatDateTime(item.created_at)}</span>,
    },
    {
      key: 'event_type',
      label: t('logs.ixc.event'),
      sortable: false,
      width: '150px',
      render: (item) => <span className="small">{resolveEventLabel(item.event_type)}</span>,
    },
    {
      key: 'protocolo',
      label: t('logs.ixc.protocol'),
      sortable: false,
      width: '110px',
      render: (item) => <span className="small">{item.protocolo ?? item.ixc_os_id ?? '—'}</span>,
    },
    {
      key: 'cliente_nome',
      label: t('table.client'),
      sortable: false,
      width: '160px',
      render: (item) => (
        <span className="small text-truncate d-inline-block truncate-max-150" title={item.cliente_nome ?? ''}>
          {item.cliente_nome ?? '—'}
        </span>
      ),
    },
    {
      key: 'origem_abertura',
      label: t('logs.ixc.origin'),
      sortable: false,
      width: '110px',
      render: (item) => <span className="small">{resolveOriginLabel(item.origem_abertura)}</span>,
    },
    {
      key: 'operador_nome',
      label: t('logs.ixc.operator'),
      sortable: false,
      width: '140px',
      render: (item) => <span className="small">{item.operador_nome ?? '—'}</span>,
    },
    {
      key: 'integracao_nome',
      label: t('logs.ixc.integration'),
      sortable: false,
      width: '140px',
      render: (item) => (
        <span className="small text-truncate d-inline-block truncate-max-130" title={item.integracao_nome ?? ''}>
          {item.integracao_nome ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('table.status'),
      sortable: false,
      render: (item) => {
        const status = item.status ?? '';
        const variant = status === 'success' ? 'success' : status === 'failed' ? 'danger' : 'secondary';
        return <Badge variant={variant}>{resolveStatusLabel(status) || 'info'}</Badge>;
      },
    },
    {
      key: 'message',
      label: t('history.message'),
      sortable: false,
      render: (item) => (
        <span className="small text-truncate d-inline-block truncate-max-280" title={item.message ?? ''}>
          {item.message ?? '—'}
        </span>
      ),
    },
  ], [resolveEventLabel, resolveOriginLabel, resolveStatusLabel, t]);

  const searchFields = useMemo(
    () => [
      { key: 'protocolo', label: t('logs.ixc.protocol') },
      { key: 'cliente_nome', label: t('table.client') },
      { key: 'operador_nome', label: t('logs.ixc.operator') },
      { key: 'message', label: t('history.message') },
    ],
    [t]
  );

  const detailFields = useMemo((): DetailFieldItem[] => {
    if (!selectedLog) return [];

    const fields: DetailFieldItem[] = [
      { label: t('audit.timestamp'), value: formatDateTime(selectedLog.created_at) },
      { label: t('logs.ixc.event'), value: resolveEventLabel(selectedLog.event_type) },
      {
        label: t('table.status'),
        value: resolveStatusLabel(selectedLog.status),
        inputClassName:
          selectedLog.status === 'failed'
            ? 'text-danger'
            : selectedLog.status === 'success'
              ? 'text-success'
              : undefined,
      },
      { label: t('logs.ixc.trigger'), value: resolveTriggerLabel(selectedLog.trigger_type) },
      { label: t('logs.ixc.protocol'), value: displayText(selectedLog.protocolo) },
      { label: t('logs.ixc.ixcId'), value: displayText(selectedLog.ixc_os_id) },
      { label: t('table.client'), value: displayText(selectedLog.cliente_nome) },
      { label: t('logs.ixc.origin'), value: resolveOriginLabel(selectedLog.origem_abertura) },
      { label: t('logs.ixc.operator'), value: displayText(selectedLog.operador_nome) },
      { label: t('logs.ixc.integration'), value: displayText(selectedLog.integracao_nome) },
    ];

    if (selectedLog.status_anterior) {
      fields.push({
        label: t('logs.ixc.previousStatus'),
        value: getOrdemServicoStatusBadgeConfig(selectedLog.status_anterior).label,
      });
    }
    if (selectedLog.status_novo) {
      fields.push({
        label: t('logs.ixc.newStatus'),
        value: getOrdemServicoStatusBadgeConfig(selectedLog.status_novo).label,
      });
    }

    return fields;
  }, [resolveEventLabel, resolveOriginLabel, resolveStatusLabel, resolveTriggerLabel, selectedLog, t]);

  return (
    <>
      <EmbeddedTablePanel<IxcOsSyncLogRow>
        config={{
          columns,
          data: rows,
          loading: isLoading,
          searchable: true,
          searchPlaceholder: t('logs.ixc.searchPlaceholder'),
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
              label: t('audit.viewDetails'),
              variant: 'primary',
              requiresSelection: true,
              onClick: handleViewDetails,
            },
          ],
          emptyMessage: t('logs.ixc.empty'),
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
          title={t('logs.ixc.detailsTitle')}
          size="lg"
          modalId="ixc-os-sync-log-details"
        >
          <div className="form-modal-simple logs-auditoria-details">
            <DetailFieldGrid fields={detailFields} />
            <div className="mt-3">
              <FormField
                name="message"
                type="textarea"
                label={t('history.message')}
                value={displayText(selectedLog.message)}
                onChange={() => undefined}
                rows={Math.min(
                  12,
                  Math.max(4, (selectedLog.message ?? '').split('\n').length + 1)
                )}
                size="sm"
                readOnly
                className={selectedLog.status === 'failed' ? 'text-danger' : undefined}
              />
            </div>
          </div>
        </DraggableModal>
      )}
    </>
  );
};

export default IxcOsSyncLogsModal;
