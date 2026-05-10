import React, { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import { Badge } from 'components/ui';
import { useTableFilters } from 'hooks/useTableFilters';
import { useModalSelect } from 'hooks/useModalSelect';
import DraggableModal from 'components/common/DraggableModal';
import { defaultApiClient } from 'services/core';
import { formatDateTime } from 'utils/formatters';

interface SyncLogRow {
  id: number;
  ca_id: number | null;
  type: string;
  trigger_type: string | null;
  status: 'success' | 'failed';
  remote_host: string | null;
  message: string | null;
  created_at: string;
}

interface RpkiRoaLogsModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const RpkiRoaLogsModal: React.FC<RpkiRoaLogsModalProps> = ({ show }) => {
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 20,
    initialSortColumn: 'created_at',
    initialSortDirection: 'desc',
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const [selectedLog, setSelectedLog] = useState<SyncLogRow | null>(null);
  const { selectedItem, handleSelectionChange } = useModalSelect<SyncLogRow>();

  const queryParams = useMemo(() => ({
    page: tableFilters.page,
    limit: tableFilters.limit,
    search: tableFilters.debouncedSearch || undefined,
  }), [tableFilters.page, tableFilters.limit, tableFilters.debouncedSearch]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['rpki-logs-roas', queryParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(queryParams.page));
      params.set('limit', String(queryParams.limit));
      if (queryParams.search) params.set('search', queryParams.search);
      const res = await defaultApiClient.get<{
        data: SyncLogRow[];
        pagination: { total: number; per_page: number; current_page: number; last_page: number; from: number; to: number };
      }>(`/rpki/logs/roas?${params.toString()}`);
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

  const handleViewDetails = useCallback((items: unknown[]) => {
    const item = items.length > 0 ? items[0] : selectedItem;
    if (item) setSelectedLog(item as SyncLogRow);
  }, [selectedItem]);

  const columns: TableConfig<SyncLogRow>['columns'] = useMemo(() => [
    {
      key: 'created_at',
      label: 'Data',
      sortable: true,
      width: '155px',
      render: (item) => (
        <span className="small font-monospace">{formatDateTime(item.created_at)}</span>
      ),
    },
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
    {
      key: 'remote_host',
      label: 'Repositório',
      sortable: true,
      width: '240px',
      render: (item) => (
        <span
          className="small font-monospace text-muted text-truncate d-inline-block"
          style={{ maxWidth: 230 }}
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
          style={{ maxWidth: 400 }}
          title={item.message ?? undefined}
        >
          {item.message ?? '—'}
        </span>
      ),
    },
  ], []);

  return (
    <>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table<SyncLogRow>
            title="Logs de Publicação de ROAs (RFC 8181)"
            config={{
              columns,
              data: rows,
              loading: isLoading,
              searchable: true,
              searchPlaceholder: 'Buscar por repositório ou mensagem...',
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
              emptyMessage: 'Nenhuma publicação de ROA registrada',
              pagination,
            }}
            tableId="rpki-roa-logs"
            syncWithHeader={false}
            onSelectionChange={(items) => handleSelectionChange(items as SyncLogRow[])}
            onRefresh={() => refetch()}
            onPageChange={(p) => setTimeout(() => tableFilters.setPage(p), 0)}
            onPageSizeChange={(l) => setTimeout(() => tableFilters.setLimit(l), 0)}
            onSort={(col, dir) => setTimeout(() => tableFilters.setSort(col, dir), 0)}
            onSearch={(s) => tableFilters.setSearch(s)}
            search={tableFilters.search}
          />
        </div>
      </div>

      {selectedLog && (
        <DraggableModal
          show={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Detalhes do Log de ROA"
          size="lg"
          modalId="rpki-roa-log-details"
        >
          <div className="p-3">
            <div className="row g-2">
              <div className="col-md-8">
                <label className="form-label small text-muted mb-1">Data</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-secondary bg-opacity-10"
                  value={formatDateTime(selectedLog.created_at)}
                  readOnly
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small text-muted mb-1">Status</label>
                <input
                  type="text"
                  className={`form-control form-control-sm bg-secondary bg-opacity-10 ${selectedLog.status === 'failed' ? 'text-danger' : 'text-success'}`}
                  value={selectedLog.status === 'success' ? 'Sucesso' : 'Falha'}
                  readOnly
                />
              </div>
              <div className="col-12">
                <label className="form-label small text-muted mb-1">Repositório</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-secondary bg-opacity-10 font-monospace"
                  value={selectedLog.remote_host ?? '—'}
                  readOnly
                />
              </div>
              <div className="col-12">
                <label className="form-label small text-muted mb-1">Mensagem</label>
                <textarea
                  className={`form-control form-control-sm bg-secondary bg-opacity-10 small ${selectedLog.status === 'failed' ? 'text-danger' : ''}`}
                  value={selectedLog.message ?? '—'}
                  readOnly
                  rows={Math.min(12, Math.max(3, (selectedLog.message ?? '').split('\n').length + 1))}
                  style={{ resize: 'vertical', minHeight: '4rem' }}
                />
              </div>
            </div>
          </div>
        </DraggableModal>
      )}
    </>
  );
};

export default RpkiRoaLogsModal;
