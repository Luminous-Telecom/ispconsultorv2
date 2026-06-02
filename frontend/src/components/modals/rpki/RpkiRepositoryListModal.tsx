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
import { ClienteService } from 'services/clienteService';
import { RpkiCaRepository, RpkiCaService } from 'services/rpkiCaService';
import { useRpkiCas } from 'hooks/useRpkiCas';
import RpkiRepositoryCreateModal from './RpkiRepositoryCreateModal';
import ImprimirModal from 'components/common/ImprimirModal';

type RepositoryRow = RpkiCaRepository & {
  ca_nome?: string;
  cliente_nome?: string;
};

interface RpkiRepositoryListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  clienteIdFilter?: number;
  tableTitle?: string;
}

function getSortableValue(row: RepositoryRow, sortKey: string): string {
  switch (sortKey) {
    case 'id':
      return String(row.id);
    case 'ca_nome':
      return String(row.ca_nome || '');
    case 'cliente_nome':
      return String(row.cliente_nome || '');
    case 'repository_name':
      return String(row.repository_name || '');
    case 'publication_status':
      return String(row.publication_status || '');
    case 'last_publish_at':
      return String(row.last_publish_at || '');
    default:
      return '';
  }
}

function formatLastExchange(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR');
}

const RpkiRepositoryListModal: React.FC<RpkiRepositoryListModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  clienteIdFilter,
  tableTitle = 'Repositórios RPKI',
}) => {
  const rpki = useRpkiListModal<RepositoryRow>();
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleAuditRepository = useCallback(
    (item: RepositoryRow) => {
      void rpki.auditoria.handleAudit('RpkiRepository', item.id);
    },
    [rpki.auditoria]
  );

  const { cas, caIdsKey } = useRpkiCas(clienteIdFilter);
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-rpki'],
    queryFn: async () => {
      const response = await ClienteService.list({ limit: 1000 });
      return response.data ?? [];
    },
    enabled: clienteIdFilter == null,
  });
  const { data: repositories = [], isLoading, refetch } = useQuery({
    queryKey: ['rpki-repositories-all', caIdsKey],
    queryFn: async () => {
      const rows = await Promise.all(cas.map((ca) => RpkiCaService.listRepositories(ca.id)));
      return rows.flat();
    },
    enabled: cas.length > 0,
  });

  const caById = useMemo(() => new Map(cas.map((ca) => [ca.id, ca])), [cas]);
  const clienteNomeById = useMemo(
    () => new Map(clientes.map((c) => [c.id, c.razao_social || c.nome_fantasia || ''])),
    [clientes]
  );

  const decoratedRows = useMemo<RepositoryRow[]>(
    () =>
      repositories.map((row) => {
        const ca = caById.get(row.ca_id);
        return {
          ...row,
          ca_nome: ca?.nome || `#${row.ca_id}`,
          cliente_nome: ca?.cliente_id ? clienteNomeById.get(ca.cliente_id) || '—' : '—',
        };
      }),
    [repositories, caById, clienteNomeById]
  );

  const deleteMutation = useMutation({
    mutationFn: (payload: { caId: number; repositoryId: number }) => RpkiCaService.deleteRepository(payload),
    onSuccess: () => {
      success('Repositório removido com sucesso');
      rpki.setSelectedRow(null);
      queryClient.invalidateQueries({ queryKey: ['rpki-repositories-all'] });
      refetch();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_REPOSITORY_DELETE_ERROR),
  });
  const syncRepositoryMutation = useMutation({
    mutationFn: (payload: { caId: number; repositoryId: number }) => RpkiCaService.syncRepository(payload),
    onSuccess: () => {
      success('Repositório atualizado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['rpki-repositories-all'] });
      refetch();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_REPOSITORY_UPDATE_ERROR),
  });

  const { rows: pagedRows, pagination } = rpki.paginateClientSide(
    decoratedRows,
    getSortableValue,
    (row, term) =>
      String(row.id).includes(term) ||
      String(row.ca_nome || '').toLowerCase().includes(term) ||
      String(row.cliente_nome || '').toLowerCase().includes(term) ||
      String(row.repository_name || '').toLowerCase().includes(term) ||
      String(row.publication_status || '').toLowerCase().includes(term)
  );

  const columns: ListModalConfig<RepositoryRow>['columns'] = useMemo(() => {
    const cols: ListModalConfig<RepositoryRow>['columns'] = [
      { key: 'id', label: 'ID', sortable: true, width: '50px', render: (item) => item.id },
      { key: 'ca_nome', label: 'CA', sortable: true, width: '180px', render: (item) => item.ca_nome || '-' },
    ];
    if (clienteIdFilter == null) {
      cols.push({
        key: 'cliente_nome',
        label: 'Cliente',
        sortable: true,
        width: '200px',
        render: (item) => item.cliente_nome || '-',
      });
    }
    cols.push(
    { key: 'repository_name', label: 'Publisher Handle', sortable: true, width: '220px', render: (item) => item.repository_name || '-' },
    { key: 'publication_service_uri', label: 'Service URI', sortable: false, width: '250px', render: (item) => item.publication_service_uri || '—' },
    { key: 'rsync_base_uri', label: 'rsync', sortable: false, width: '220px', render: (item) => item.rsync_base_uri || '—' },
    {
      key: 'last_publish_at',
      label: 'Última Troca',
      sortable: true,
      width: '170px',
      render: (item) => formatLastExchange(item.last_publish_at),
    },
    {
      key: 'publication_status',
      label: 'Status',
      sortable: true,
      badgeLabels: ['pending', 'active', 'error'],
      render: (item) =>
        renderStatusBadge(getRpkiCaStatusBadgeConfig(item.publication_status)),
    });
    return cols;
  }, [clienteIdFilter]);

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
        disabled: (selectedItems: RepositoryRow[]) =>
          selectedItems.length === 0 && !rpki.selectedRow,
        action: (selectedItems: RepositoryRow[]) => {
          const target = selectedItems[0] || rpki.selectedRow;
          if (!target) return;
          if (!window.confirm(rpki.t('messages.confirmDelete'))) return;
          deleteMutation.mutate({ caId: target.ca_id, repositoryId: target.id });
        },
      },
      {
        label: 'Atualizar',
        disabled: (selectedItems: RepositoryRow[]) =>
          selectedItems.length === 0 && !rpki.selectedRow,
        action: (selectedItems: RepositoryRow[]) => {
          const target = selectedItems[0] || rpki.selectedRow;
          if (!target) return;
          syncRepositoryMutation.mutate({ caId: target.ca_id, repositoryId: target.id });
        },
      },
    ],
    [rpki, deleteMutation, syncRepositoryMutation]
  );

  return (
    <>
      <ListModal<RepositoryRow>
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
            { key: 'ca_nome', label: 'CA' },
            { key: 'cliente_nome', label: 'Cliente' },
            { key: 'repository_name', label: 'Publisher Handle' },
            { key: 'publication_status', label: 'Status' },
          ],
          emptyMessage: 'Nenhum repositório encontrado',
          multiSelect: false,
        }}
        data={pagedRows}
        loading={isLoading || deleteMutation.isPending || syncRepositoryMutation.isPending}
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
        onAudit={handleAuditRepository}
        auditEntity="RpkiRepository"
        tableId="rpki-repositories-list-modal"
      />

      <RpkiRepositoryCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        allowedCaIds={cas.map((c) => c.id)}
        initialCaId={cas.length === 1 ? cas[0].id : null}
      />

      <ImprimirModal
        show={rpki.auditoria.showPreview}
        onClose={rpki.auditoria.handleClosePreview}
        pdfUrl={rpki.auditoria.pdfUrl}
        isGenerating={rpki.auditoria.isGeneratingPdf}
        title={rpki.t('modal.auditLogs')}
        modalId="auditoria-rpki-repository-modal"
      />
    </>
  );
};

export default RpkiRepositoryListModal;
