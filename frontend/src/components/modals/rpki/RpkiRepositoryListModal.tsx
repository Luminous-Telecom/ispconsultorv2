import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import { useI18n } from 'contexts/I18nContext';
import { useBulkBtn } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useTableFilters } from 'hooks/useTableFilters';
import { ClienteService } from 'services/clienteService';
import { RpkiCaRepository, RpkiCaService } from 'services/rpkiCaService';
import { useRpkiCas } from 'hooks/useRpkiCas';
import RpkiRepositoryCreateModal from './RpkiRepositoryCreateModal';
import { useAuditoria } from 'hooks/useAuditoria';
import ImprimirModalBase from 'components/common/ImprimirModal';

const AuditPdfModal = ImprimirModalBase;

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
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const auditoria = useAuditoria();
  const handleAuditRepository = useCallback(
    (item: RepositoryRow) => {
      void auditoria.handleAudit('RpkiRepository', item.id);
    },
    [auditoria]
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RepositoryRow | null>(null);

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    searchDebounceMs: 250,
    resetPageOnFilterChange: true,
  });

  const handleSearchChange = useCallback(
    (search: string, field?: string) => {
      tableFilters.setSearch(search);
      if (field) {
        tableFilters.setSearchField(field);
      }
    },
    [tableFilters]
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

  const caById = useMemo(() => {
    const map = new Map<number, (typeof cas)[number]>();
    cas.forEach((ca) => map.set(ca.id, ca));
    return map;
  }, [cas]);
  const clienteNomeById = useMemo(() => {
    const map = new Map<number, string>();
    clientes.forEach((cliente) => map.set(cliente.id, cliente.razao_social || cliente.nome_fantasia || ''));
    return map;
  }, [clientes]);

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
      setSelectedRow(null);
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

  const filtered = useMemo(() => {
    const term = tableFilters.debouncedSearch.trim().toLowerCase();
    let rows = decoratedRows;
    if (term) {
      rows = rows.filter(
        (row) =>
          String(row.id).includes(term) ||
          String(row.ca_nome || '').toLowerCase().includes(term) ||
          String(row.cliente_nome || '').toLowerCase().includes(term) ||
          String(row.repository_name || '').toLowerCase().includes(term) ||
          String(row.publication_status || '').toLowerCase().includes(term)
      );
    }
    const sortKey = tableFilters.sortColumn || 'id';
    const direction = tableFilters.sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getSortableValue(a, sortKey).toLowerCase();
      const vb = getSortableValue(b, sortKey).toLowerCase();
      if (va < vb) return -1 * direction;
      if (va > vb) return 1 * direction;
      return 0;
    });
  }, [decoratedRows, tableFilters.debouncedSearch, tableFilters.sortColumn, tableFilters.sortDirection]);

  const total = filtered.length;
  const perPage = tableFilters.limit;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(tableFilters.page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = total === 0 ? 0 : Math.min(safePage * perPage, total);
  const pagedRows = filtered.slice(from > 0 ? from - 1 : 0, to);

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
      render: (item) => {
        const labels: Record<string, string> = { pending: 'Pendente', active: 'Ativo', error: 'Erro' };
        const cor = item.publication_status === 'active' ? 'bg-success' : item.publication_status === 'error' ? 'bg-danger' : 'bg-secondary';
        return <span className={`badge ${cor}`}>{labels[item.publication_status] ?? item.publication_status}</span>;
      },
    });
    return cols;
  }, [clienteIdFilter]);

  const bulkActions = useMemo(
    () => [
      {
        label: bulkBtn.novo.label,
        variant: bulkBtn.novo.variant,
        requiresSelection: false,
        action: () => setShowCreateModal(true),
      },
      {
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (selectedItems: RepositoryRow[]) => selectedItems.length === 0 && !selectedRow,
        action: (selectedItems: RepositoryRow[]) => {
          const target = selectedItems[0] || selectedRow;
          if (!target) return;
          if (!window.confirm(t('messages.confirmDelete'))) return;
          deleteMutation.mutate({ caId: target.ca_id, repositoryId: target.id });
        },
      },
      {
        label: 'Atualizar',
        disabled: (selectedItems: RepositoryRow[]) => selectedItems.length === 0 && !selectedRow,
        action: (selectedItems: RepositoryRow[]) => {
          const target = selectedItems[0] || selectedRow;
          if (!target) return;
          syncRepositoryMutation.mutate({ caId: target.ca_id, repositoryId: target.id });
        },
      },
    ],
    [bulkBtn, deleteMutation, selectedRow, syncRepositoryMutation, t]
  );

  return (
    <>
      <ListModal<RepositoryRow>
        show={show}
        onClose={onClose}
        skipWrapper={skipWrapper}
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
        search={tableFilters.search}
        onSearchChange={handleSearchChange}
        sortColumn={tableFilters.sortColumn}
        sortDirection={tableFilters.sortDirection}
        onSortChange={tableFilters.setSort}
        pagination={{
          current_page: safePage,
          last_page: lastPage,
          per_page: perPage,
          total,
          from,
          to,
        }}
        onPageChange={tableFilters.setPage}
        onLimitChange={tableFilters.setLimit}
        onRefresh={refetch}
        bulkActions={bulkActions}
        onSelectionChange={(items) => setSelectedRow(items[0] ?? null)}
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

      <AuditPdfModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('modal.auditLogs')}
        modalId="auditoria-rpki-repository-modal"
      />
    </>
  );
};

export default RpkiRepositoryListModal;
