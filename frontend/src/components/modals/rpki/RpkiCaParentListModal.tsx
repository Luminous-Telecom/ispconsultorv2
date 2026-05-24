import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import { useTableFilters } from 'hooks/useTableFilters';
import { RpkiCaParent, RpkiCaResource, RpkiCaService } from 'services/rpkiCaService';
import { ClienteService } from 'services/clienteService';
import { useRpkiCas } from 'hooks/useRpkiCas';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import RpkiCaParentCreateModal from './RpkiCaParentCreateModal';
import { useAuditoria } from 'hooks/useAuditoria';
import ImprimirModal from 'components/common/ImprimirModal';

interface RpkiCaParentListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  clienteIdFilter?: number;
  tableTitle?: string;
}

function getSortableValue(row: RpkiCaParent, sortKey: string): string {
  switch (sortKey) {
    case 'id':
      return String(row.id);
    case 'parent_name':
      return String(row.parent_name || '');
    case 'parent_handle':
      return String(row.parent_handle || '');
    case 'child_handle':
      return String(row.child_handle || '');
    case 'provisioning_status':
      return String(row.provisioning_status || '');
    case 'last_sync_at':
      return String(row.last_sync_at || '');
    default:
      return '';
  }
}

const RpkiCaParentListModal: React.FC<RpkiCaParentListModalProps> = ({
  clienteIdFilter,
  tableTitle = 'CAs-pai',
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const auditoria = useAuditoria();
  const handleAuditParent = useCallback(
    (item: RpkiCaParent) => {
      void auditoria.handleAudit('RpkiCaParent', item.id);
    },
    [auditoria]
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState<RpkiCaParent | null>(null);

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    searchDebounceMs: 250,
    resetPageOnFilterChange: true,
  });

  const { cas, caIdsKey } = useRpkiCas(clienteIdFilter);
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-rpki'],
    queryFn: async () => {
      const response = await ClienteService.list({ limit: 1000 });
      return response.data ?? [];
    },
    enabled: clienteIdFilter == null,
  });

  const { data: parents = [], isLoading, refetch } = useQuery({
    queryKey: ['rpki-ca-parents-all', caIdsKey],
    queryFn: async () => {
      const rows = await Promise.all(cas.map((ca) => RpkiCaService.listParents(ca.id)));
      return rows.flat();
    },
    enabled: cas.length > 0,
  });
  const { data: resourcesByCa = new Map<number, RpkiCaResource[]>() } = useQuery({
    queryKey: ['rpki-ca-resources-all', caIdsKey],
    queryFn: async () => {
      const rows = await Promise.all(
        cas.map(async (ca) => ({
          caId: ca.id,
          resources: await RpkiCaService.listResources(ca.id),
        }))
      );
      const map = new Map<number, RpkiCaResource[]>();
      rows.forEach((row) => map.set(row.caId, row.resources));
      return map;
    },
    enabled: cas.length > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { caId: number; parentId: number }) => RpkiCaService.deleteParent(payload),
    onSuccess: () => {
      success('CA-pai removida com sucesso');
      setSelectedParent(null);
      queryClient.invalidateQueries({ queryKey: ['rpki-ca-parents-all'] });
      refetch();
    },
    onError: (err: unknown) => {
      const withMessage = err as { message?: string };
      error(withMessage.message || 'Erro ao remover CA-pai');
    },
  });
  const syncResourcesMutation = useMutation({
    mutationFn: (payload: { caId: number; parentId: number }) => RpkiCaService.syncParentResources(payload),
    onSuccess: () => {
      success('Recursos sincronizados com sucesso');
      queryClient.invalidateQueries({ queryKey: ['rpki-cas'] });
      queryClient.invalidateQueries({ queryKey: ['rpki-ca-resources-all'] });
      queryClient.invalidateQueries({ queryKey: ['rpki-ca-parents-all'] });
      refetch();
    },
    onError: (err: unknown) => {
      const withMessage = err as { message?: string };
      error(withMessage.message || 'Erro ao sincronizar recursos');
    },
  });

  const caById = useMemo(() => {
    const map = new Map<number, (typeof cas)[number]>();
    for (const ca of cas) map.set(ca.id, ca);
    return map;
  }, [cas]);
  const clienteNomeById = useMemo(() => {
    const map = new Map<number, string>();
    for (const cliente of clientes) {
      map.set(cliente.id, cliente.razao_social || cliente.nome_fantasia || '');
    }
    return map;
  }, [clientes]);

  const filtered = useMemo(() => {
    const term = tableFilters.debouncedSearch.trim().toLowerCase();
    let rows = parents;

    if (term) {
      rows = rows.filter((row) => {
        return (
          String(row.id).includes(term) ||
          String(row.parent_name || '').toLowerCase().includes(term) ||
          String(row.parent_handle || '').toLowerCase().includes(term) ||
          String(row.child_handle || '').toLowerCase().includes(term) ||
          String(row.provisioning_status || '').toLowerCase().includes(term)
        );
      });
    }

    const sortKey = tableFilters.sortColumn || 'id';
    const direction = tableFilters.sortDirection === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const va = getSortableValue(a, sortKey).toLowerCase();
      const vb = getSortableValue(b, sortKey).toLowerCase();
      if (va < vb) return -1 * direction;
      if (va > vb) return 1 * direction;
      return 0;
    });

    return rows;
  }, [parents, tableFilters.debouncedSearch, tableFilters.sortColumn, tableFilters.sortDirection]);

  const total = filtered.length;
  const currentPage = tableFilters.page;
  const perPage = tableFilters.limit;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(currentPage, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = total === 0 ? 0 : Math.min(safePage * perPage, total);
  const pagedRows = filtered.slice(from > 0 ? from - 1 : 0, to);

  const columns: TableConfig<RpkiCaParent>['columns'] = useMemo(() => {
    const cols: TableConfig<RpkiCaParent>['columns'] = [
      { key: 'id', label: 'ID', sortable: true, width: '50px', render: (item) => item.id },
      {
        key: 'ca_id',
        label: 'CA',
        sortable: false,
        width: '200px',
        render: (item) => caById.get(item.ca_id)?.nome || `#${item.ca_id}`,
      },
    ];
    if (clienteIdFilter == null) {
      cols.push({
        key: 'cliente',
        label: 'Cliente',
        sortable: false,
        width: '220px',
        render: (item) => {
          const ca = caById.get(item.ca_id);
          if (!ca?.cliente_id) return '—';
          return clienteNomeById.get(ca.cliente_id) || '—';
        },
      });
    }
    cols.push(
    { key: 'parent_name', label: 'Nome da CA-pai', sortable: true, width: '220px', render: (item) => item.parent_name || '-' },
    {
      key: 'asn',
      label: 'ASN',
      sortable: false,
      width: '180px',
      render: (item) => {
        const resources = resourcesByCa.get(item.ca_id) ?? [];
        const asn = resources
          .filter((r) => r.resource_type === 'asn')
          .map((r) => (r.end_range ? `${r.start_range}-${r.end_range}` : r.start_range));
        return asn.length > 0 ? asn.join(', ') : '—';
      },
    },
    {
      key: 'ipv4',
      label: 'IPv4',
      sortable: false,
      width: '200px',
      render: (item) => {
        const resources = resourcesByCa.get(item.ca_id) ?? [];
        const ipv4 = resources
          .filter((r) => r.resource_type === 'ipv4')
          .map((r) => (r.end_range ? `${r.start_range}-${r.end_range}` : r.start_range));
        return ipv4.length > 0 ? ipv4.join(', ') : '—';
      },
    },
    {
      key: 'ipv6',
      label: 'IPv6',
      sortable: false,
      width: '220px',
      render: (item) => {
        const resources = resourcesByCa.get(item.ca_id) ?? [];
        const ipv6 = resources
          .filter((r) => r.resource_type === 'ipv6')
          .map((r) => (r.end_range ? `${r.start_range}-${r.end_range}` : r.start_range));
        return ipv6.length > 0 ? ipv6.join(', ') : '—';
      },
    },
    { key: 'parent_handle', label: 'Parent Handle', sortable: true, width: '180px', render: (item) => item.parent_handle || '-' },
    { key: 'child_handle', label: 'Child Handle', sortable: true, width: '180px', render: (item) => item.child_handle || '-' },
    {
      key: 'updown_status',
      label: 'Up-down',
      sortable: false,
      width: '160px',
      render: (item) => {
        if (item.last_error) return <span className="badge bg-danger">Falha</span>;
        if (item.last_sync_at) return <span className="badge bg-success">OK</span>;
        return <span className="badge bg-secondary">Pendente</span>;
      },
    },
    {
      key: 'provisioning_status',
      label: 'Status',
      sortable: true,
      badgeLabels: ['pending', 'active', 'error'],
      render: (item) => {
        const labels: Record<string, string> = { pending: 'Pendente', active: 'Ativo', error: 'Erro' };
        const cor = item.provisioning_status === 'active' ? 'bg-success' : item.provisioning_status === 'error' ? 'bg-danger' : 'bg-secondary';
        return <span className={`badge ${cor}`}>{labels[item.provisioning_status] ?? item.provisioning_status}</span>;
      },
    });
    return cols;
  }, [caById, clienteIdFilter, clienteNomeById, resourcesByCa]);

  return (
    <>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            title={tableTitle}
            config={{
              columns,
              data: pagedRows,
              loading: isLoading || deleteMutation.isPending || syncResourcesMutation.isPending,
              searchable: true,
              searchPlaceholder: 'Buscar...',
              searchFields: [
                { key: 'id', label: 'ID' },
                { key: 'parent_name', label: 'Nome da CA-pai' },
                { key: 'parent_handle', label: 'Parent Handle' },
                { key: 'child_handle', label: 'Child Handle' },
                { key: 'provisioning_status', label: 'Status' },
              ],
              sortable: true,
              sortColumn: tableFilters.sortColumn,
              sortDirection: tableFilters.sortDirection,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              emptyMessage: 'Nenhuma CA-pai encontrada',
              pagination: {
                current_page: safePage,
                last_page: lastPage,
                per_page: perPage,
                total,
                from,
                to,
              },
              bulkActions: [
                {
                  key: 'novo-ca-pai',
                  label: t('buttons.new'),
                  variant: 'primary',
                  requiresSelection: false,
                  onClick: () => setShowCreateModal(true),
                },
                {
                  key: 'deletar-ca-pai',
                  label: t('actions.delete'),
                  disabled: (selectedItems: RpkiCaParent[]) =>
                    selectedItems.length === 0 && !selectedParent,
                  onClick: (selectedItems: RpkiCaParent[]) => {
                    const target = selectedItems[0] || selectedParent;
                    if (!target) return;
                    if (!window.confirm(t('messages.confirmDelete'))) return;
                    deleteMutation.mutate({ caId: target.ca_id, parentId: target.id });
                  },
                },
                {
                  key: 'sincronizar-recursos-ca-pai',
                  label: 'Sincronizar',
                  disabled: (selectedItems: RpkiCaParent[]) =>
                    selectedItems.length === 0 && !selectedParent,
                  onClick: (selectedItems: RpkiCaParent[]) => {
                    const target = selectedItems[0] || selectedParent;
                    if (!target) return;
                    syncResourcesMutation.mutate({ caId: target.ca_id, parentId: target.id });
                  },
                },
              ],
            }}
            tableId="rpki-ca-parents-list-modal"
            syncWithHeader={false}
            onSelectionChange={(items) => setSelectedParent(items[0] ?? null)}
            onRefresh={refetch}
            onAudit={handleAuditParent}
            auditEntity="RpkiCaParent"
            onPageChange={tableFilters.setPage}
            onPageSizeChange={tableFilters.setLimit}
            onSort={(column, direction) => tableFilters.setSort(column, direction)}
            onSearch={(search) => tableFilters.setSearch(search)}
            search={tableFilters.search}
          />
        </div>
      </div>

      <RpkiCaParentCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialCaId={cas.length === 1 ? cas[0].id : null}
        allowedCaIds={cas.map((c) => c.id)}
      />

      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('modal.auditLogs')}
        modalId="auditoria-rpki-ca-parent-modal"
      />
    </>
  );
};

export default RpkiCaParentListModal;
