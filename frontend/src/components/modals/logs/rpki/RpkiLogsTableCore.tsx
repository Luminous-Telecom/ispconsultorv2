import React, { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSaasPortalPath } from 'hooks/useSaasPortalPath';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { TableConfig } from 'components/tables/types';
import { Badge } from 'components/ui';
import { useTableFilters } from 'hooks/useTableFilters';
import { useModalSelect } from 'hooks/useModalSelect';
import DraggableModal from 'components/common/DraggableModal';
import DetailFieldGrid, { DetailFieldItem } from 'components/common/DetailFieldGrid';
import FormField from 'components/ui/FormField';
import { defaultApiClient } from 'services/core';
import { formatDateTime } from 'utils/formatters';
import { useI18n } from 'contexts/I18nContext';
import {
  RPKI_LOGS_BY_KIND,
  TYPE_LABEL,
  TYPE_TIP,
  type RpkiLogsKind,
} from './rpkiLogsConfig';

export interface RpkiSyncLogRow {
  id: number;
  ca_id: number | null;
  type: string;
  trigger_type?: string | null;
  status: 'success' | 'failed';
  empresa_saas?: string | null;
  ca_nome?: string | null;
  cliente_nome?: string | null;
  remote_host: string | null;
  message: string | null;
  created_at: string;
}

interface RpkiLogsTableCoreProps {
  kind: RpkiLogsKind;
  show: boolean;
  onClose?: () => void;
  skipWrapper?: boolean;
}

type LogColumns = TableConfig<RpkiSyncLogRow>['columns'];

const RpkiLogsTableCore: React.FC<RpkiLogsTableCoreProps> = ({ kind, show }) => {
  const config = RPKI_LOGS_BY_KIND[kind];
  const { t } = useI18n();
  const isSaasPortal = useSaasPortalPath();
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 20,
    initialSortColumn: 'created_at',
    initialSortDirection: 'desc',
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const [selectedLog, setSelectedLog] = useState<RpkiSyncLogRow | null>(null);
  const { selectedItem, handleSelectionChange } = useModalSelect<RpkiSyncLogRow>();

  const queryParams = useMemo(
    () => ({
      page: tableFilters.page,
      limit: tableFilters.limit,
      search: tableFilters.debouncedSearch || undefined,
    }),
    [tableFilters.page, tableFilters.limit, tableFilters.debouncedSearch]
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: [config.queryKey, queryParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(queryParams.page));
      params.set('limit', String(queryParams.limit));
      if (queryParams.search) params.set('search', queryParams.search);
      const res = await defaultApiClient.get<{
        data: RpkiSyncLogRow[];
        pagination: {
          total: number;
          per_page: number;
          current_page: number;
          last_page: number;
          from: number;
          to: number;
        };
      }>(`${config.apiPath}?${params.toString()}`);
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
      if (item) setSelectedLog(item as RpkiSyncLogRow);
    },
    [selectedItem]
  );

  const columns = useMemo((): LogColumns => {
    const scopeCols: LogColumns = isSaasPortal
      ? [
          {
            key: 'empresa_saas',
            label: t('audit.tenants'),
            sortable: false,
            width: '200px',
            render: (item) => (
              <span
                className="small text-truncate d-inline-block"
                style={{ maxWidth: 190 }}
                title={item.empresa_saas ?? undefined}
              >
                {item.empresa_saas ?? '—'}
              </span>
            ),
          },
        ]
      : [
          {
            key: 'ca_nome',
            label: 'CA',
            sortable: false,
            width: '160px',
            render: (item) => (
              <span
                className="small text-truncate d-inline-block"
                style={{ maxWidth: 150 }}
                title={item.ca_nome ?? undefined}
              >
                {item.ca_nome ?? '—'}
              </span>
            ),
          },
          {
            key: 'cliente_nome',
            label: 'Cliente',
            sortable: false,
            width: '200px',
            render: (item) => (
              <span
                className="small text-truncate d-inline-block"
                style={{ maxWidth: 190 }}
                title={item.cliente_nome ?? undefined}
              >
                {item.cliente_nome ?? '—'}
              </span>
            ),
          },
        ];

    const base: LogColumns = [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '42px',
        render: (item) => <span className="small">{item.id}</span>,
      },
      {
        key: 'created_at',
        label: 'Data',
        sortable: true,
        width: config.showTypeColumn ? '150px' : '155px',
        render: (item) => (
          <span className="small font-monospace">{formatDateTime(item.created_at)}</span>
        ),
      },
    ];

    if (config.showTypeColumn) {
      base.push({
        key: 'type',
        label: 'Tipo',
        sortable: true,
        width: '150px',
        render: (item) => (
          <span title={TYPE_TIP[item.type]}>
            <Badge variant={item.type === 'provisioning' ? 'primary' : 'info'} pill>
              {TYPE_LABEL[item.type] ?? item.type}
            </Badge>
          </span>
        ),
      });
    }

    base.push(
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        width: '110px',
        render: (item) => (
          <Badge variant={item.status === 'success' ? 'success' : 'danger'} pill>
            {item.status === 'success' ? 'Sucesso' : 'Falha'}
          </Badge>
        ),
      },
      ...scopeCols,
      {
        key: 'remote_host',
        label: config.remoteHostColumnLabel,
        sortable: true,
        width: config.showTypeColumn ? '220px' : '240px',
        render: (item) => (
          <span
            className="small font-monospace text-muted text-truncate d-inline-block"
            style={{ maxWidth: config.showTypeColumn ? 210 : 230 }}
            title={item.remote_host ?? undefined}
          >
            {item.remote_host ?? '—'}
          </span>
        ),
      },
      {
        key: 'message',
        label: 'Mensagem',
        sortable: false,
        render: (item) => (
          <span
            className={`small text-truncate d-inline-block ${item.status === 'failed' ? 'text-danger' : 'text-muted'}`}
            style={{ maxWidth: config.messageMaxWidth }}
            title={item.message ?? undefined}
          >
            {item.message ?? '—'}
          </span>
        ),
      }
    );

    return base;
  }, [config, isSaasPortal, t]);

  const searchFields = useMemo(
    () => [
      { key: 'id', label: 'ID' },
      { key: 'remote_host', label: config.remoteHostSearchLabel },
      { key: 'message', label: 'Mensagem' },
    ],
    [config.remoteHostSearchLabel]
  );

  const detailFields = useMemo((): DetailFieldItem[] => {
    if (!selectedLog) return [];

    const fields: DetailFieldItem[] = [
      { label: 'Data', value: formatDateTime(selectedLog.created_at), colClassName: config.showTypeColumn ? 'col-md-6' : 'col-md-8' },
    ];

    if (config.showTypeColumn) {
      fields.push({
        label: 'Tipo',
        value: TYPE_LABEL[selectedLog.type] ?? selectedLog.type,
        colClassName: 'col-md-3',
      });
    }

    fields.push({
      label: 'Status',
      value: selectedLog.status === 'success' ? 'Sucesso' : 'Falha',
      inputClassName: selectedLog.status === 'failed' ? 'text-danger' : 'text-success',
      colClassName: config.showTypeColumn ? 'col-md-3' : 'col-md-4',
    });

    if (isSaasPortal) {
      fields.push({
        label: t('audit.tenants'),
        value: selectedLog.empresa_saas ?? '—',
        colClassName: 'col-12',
      });
    } else {
      fields.push(
        { label: 'CA', value: selectedLog.ca_nome ?? '—' },
        { label: 'Cliente', value: selectedLog.cliente_nome ?? '—' }
      );
    }

    fields.push({
      label: config.remoteHostColumnLabel,
      value: selectedLog.remote_host ?? '—',
      inputClassName: 'font-monospace',
      colClassName: 'col-12',
    });

    return fields;
  }, [config.remoteHostColumnLabel, config.showTypeColumn, isSaasPortal, selectedLog, t]);

  return (
    <>
      <EmbeddedTablePanel<RpkiSyncLogRow>
        config={{
          columns,
          data: rows,
          loading: isLoading,
          searchable: true,
          searchPlaceholder: config.searchPlaceholder,
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
          emptyMessage: config.emptyMessage,
          pagination,
        }}
        tableId={config.tableId}
        onSelectionChange={(items) => handleSelectionChange(items as RpkiSyncLogRow[])}
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
          title={config.detailsTitle}
          size="lg"
          modalId={config.detailsModalId}
        >
          <div className="p-3 logs-auditoria-details">
            <DetailFieldGrid fields={detailFields} />
            <div className="mt-3">
              <FormField
                name="rpki_log_message"
                type="textarea"
                label="Mensagem"
                value={selectedLog.message ?? '—'}
                onChange={() => undefined}
                size="sm"
                readOnly
                className={selectedLog.status === 'failed' ? 'text-danger' : undefined}
                rows={Math.min(12, Math.max(3, (selectedLog.message ?? '').split('\n').length + 1))}
              />
            </div>
          </div>
        </DraggableModal>
      )}
    </>
  );
};

export default RpkiLogsTableCore;
