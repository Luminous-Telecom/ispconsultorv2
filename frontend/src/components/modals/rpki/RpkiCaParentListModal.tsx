import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useRpkiListModal } from 'hooks/useRpkiListModal';
import { renderStatusBadge } from 'components/ui/StatusBadge';
import { getRpkiCaStatusBadgeConfig } from 'utils/tableStatusBadges';
import { RpkiCaParent, RpkiCaResource, RpkiCaService } from 'services/rpkiCaService';
import { ClienteService } from 'services/clienteService';
import type { Cliente } from 'types';
import { useRpkiCas } from 'hooks/useRpkiCas';
import RpkiCaParentCreateModal from './RpkiCaParentCreateModal';
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
  show,
  onClose,
  skipWrapper = false,
  clienteIdFilter,
  tableTitle = 'CAs-pai',
}) => {
  const rpki = useRpkiListModal<RpkiCaParent>();
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleAuditParent = useCallback(
    (item: RpkiCaParent) => {
      void rpki.auditoria.handleAudit('RpkiCaParent', item.id);
    },
    [rpki.auditoria]
  );

  const { cas, caIdsKey } = useRpkiCas(clienteIdFilter);
  const { data: clientes = [] as Cliente[] } = useQuery<Cliente[]>({
    queryKey: ['clientes-rpki'],
    queryFn: async () => {
      const response = await ClienteService.list({ limit: 1000 });
      return response.data ?? [];
    },
    enabled: clienteIdFilter == null,
  });

  const { data: parents = [] as RpkiCaParent[], isLoading, refetch } = useQuery<RpkiCaParent[]>({
    queryKey: ['rpki-ca-parents-all', caIdsKey],
    queryFn: async () => {
      const rows = await Promise.all(cas.map((ca) => RpkiCaService.listParents(ca.id)));
      return rows.flat();
    },
    enabled: cas.length > 0,
  });
  const { data: resourcesByCa = new Map<number, RpkiCaResource[]>() } = useQuery<Map<number, RpkiCaResource[]>>({
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
      rpki.setSelectedRow(null);
      queryClient.invalidateQueries({ queryKey: ['rpki-ca-parents-all'] });
      refetch();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_CA_PARENT_DELETE_ERROR),
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
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_CA_PARENT_SYNC_ALT_ERROR),
  });

  const caById = useMemo(() => new Map(cas.map((ca) => [ca.id, ca])), [cas]);
  const clienteNomeById = useMemo(
    () => new Map((clientes as Cliente[]).map((c) => [c.id, c.razao_social || c.nome_fantasia || ''])),
    [clientes]
  );

  const { rows: pagedRows, pagination } = rpki.paginateClientSide(
    parents,
    getSortableValue,
    (row, term) =>
      String(row.id).includes(term) ||
      String(row.parent_name || '').toLowerCase().includes(term) ||
      String(row.parent_handle || '').toLowerCase().includes(term) ||
      String(row.child_handle || '').toLowerCase().includes(term) ||
      String(row.provisioning_status || '').toLowerCase().includes(term)
  );

  const columns: ListModalConfig<RpkiCaParent>['columns'] = useMemo(() => {
    const cols: ListModalConfig<RpkiCaParent>['columns'] = [
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
        const resources: RpkiCaResource[] = (resourcesByCa as Map<number, RpkiCaResource[]>).get(item.ca_id) ?? [];
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
        const resources: RpkiCaResource[] = (resourcesByCa as Map<number, RpkiCaResource[]>).get(item.ca_id) ?? [];
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
        const resources: RpkiCaResource[] = (resourcesByCa as Map<number, RpkiCaResource[]>).get(item.ca_id) ?? [];
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
      render: (item) => renderStatusBadge(getRpkiCaStatusBadgeConfig(item.provisioning_status)),
    });
    return cols;
  }, [caById, clienteIdFilter, clienteNomeById, resourcesByCa]);

  const bulkActions = useMemo(
    () => [
      {
        label: rpki.bulkBtn.novo.label,
        variant: rpki.bulkBtn.novo.variant,
        requiresSelection: false,
        action: () => setShowCreateModal(true),
      },
      {
        label: rpki.bulkBtn.deletar.label,
        variant: rpki.bulkBtn.deletar.variant,
        disabled: (selectedItems: RpkiCaParent[]) =>
          selectedItems.length === 0 && !rpki.selectedRow,
        action: (selectedItems: RpkiCaParent[]) => {
          const target = selectedItems[0] || rpki.selectedRow;
          if (!target) return;
          if (!window.confirm(rpki.t('messages.confirmDelete'))) return;
          deleteMutation.mutate({ caId: target.ca_id, parentId: target.id });
        },
      },
      {
        label: 'Sincronizar',
        disabled: (selectedItems: RpkiCaParent[]) =>
          selectedItems.length === 0 && !rpki.selectedRow,
        action: (selectedItems: RpkiCaParent[]) => {
          const target = selectedItems[0] || rpki.selectedRow;
          if (!target) return;
          syncResourcesMutation.mutate({ caId: target.ca_id, parentId: target.id });
        },
      },
    ],
    [rpki, deleteMutation, syncResourcesMutation]
  );

  return (
    <>
      <ListModal<RpkiCaParent>
        show={show}
        onClose={onClose}
        skipWrapper={skipWrapper}
        showEmbeddedTableTitle={skipWrapper}
        config={{
          title: tableTitle,
          columns,
          searchPlaceholder: 'Buscar...',
          searchFields: [
            { key: 'id', label: 'ID' },
            { key: 'parent_name', label: 'Nome da CA-pai' },
            { key: 'parent_handle', label: 'Parent Handle' },
            { key: 'child_handle', label: 'Child Handle' },
            { key: 'provisioning_status', label: 'Status' },
          ],
          emptyMessage: 'Nenhuma CA-pai encontrada',
          multiSelect: false,
        }}
        data={pagedRows}
        loading={isLoading || deleteMutation.isPending || syncResourcesMutation.isPending}
        search={rpki.tableFilters.search}
        onSearchChange={rpki.handleSearchChange}
        sortColumn={rpki.tableFilters.sortColumn}
        sortDirection={rpki.tableFilters.sortDirection}
        onSortChange={rpki.tableFilters.setSort}
        pagination={pagination}
        onPageChange={rpki.tableFilters.setPage}
        onLimitChange={rpki.tableFilters.setLimit}
        onRefresh={refetch}
        bulkActions={bulkActions}
        onSelectionChange={(items) => rpki.setSelectedRow(items[0] ?? null)}
        onAudit={handleAuditParent}
        auditEntity="RpkiCaParent"
        tableId="rpki-ca-parents-list-modal"
      />

      <RpkiCaParentCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialCaId={cas.length === 1 ? cas[0].id : null}
        allowedCaIds={cas.map((c) => c.id)}
      />

      <ImprimirModal
        show={rpki.auditoria.showPreview}
        onClose={rpki.auditoria.handleClosePreview}
        pdfUrl={rpki.auditoria.pdfUrl}
        isGenerating={rpki.auditoria.isGeneratingPdf}
        title={rpki.t('modal.auditLogs')}
        modalId="auditoria-rpki-ca-parent-modal"
      />
    </>
  );
};

export default RpkiCaParentListModal;
