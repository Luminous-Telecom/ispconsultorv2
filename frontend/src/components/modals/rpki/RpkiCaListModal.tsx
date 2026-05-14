import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useTableFilters } from 'hooks/useTableFilters';
import { useI18n } from 'contexts/I18nContext';
import { RpkiCa, RpkiCaService } from 'services/rpkiCaService';
import { ClienteService } from 'services/clienteService';
import RpkiCaCreateModal from './RpkiCaCreateModal';
import { useAuditoria } from 'hooks/useAuditoria';
import ImprimirModal from 'components/common/ImprimirModal';

interface RpkiCaListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

function getSortableValue(row: RpkiCa, sortKey: string): string {
  switch (sortKey) {
    case 'id':
      return String(row.id);
    case 'nome':
      return String(row.nome || '');
    case 'handle':
      return String(row.handle || '');
    case 'status':
      return String(row.status || '');
    case 'created_at':
      return String(row.created_at || '');
    case 'updated_at':
      return String(row.updated_at || '');
    default:
      return '';
  }
}

const RpkiCaListModal: React.FC<RpkiCaListModalProps> = () => {
  const { t } = useI18n();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCa, setSelectedCa] = useState<RpkiCa | null>(null);
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const auditoria = useAuditoria();
  const handleAuditCa = useCallback(
    (item: RpkiCa) => {
      void auditoria.handleAudit('RpkiCa', item.id);
    },
    [auditoria]
  );

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    searchDebounceMs: 250,
    resetPageOnFilterChange: true,
  });

  const { data: cas = [], isLoading, refetch } = useQuery({
    queryKey: ['rpki-cas'],
    queryFn: () => RpkiCaService.list(),
  });
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-rpki'],
    queryFn: async () => {
      const response = await ClienteService.list({ limit: 1000 });
      return response.data ?? [];
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (caId: number) => RpkiCaService.delete(caId),
    onSuccess: () => {
      success('CA removida com sucesso');
      setSelectedCa(null);
      queryClient.invalidateQueries({ queryKey: ['rpki-cas'] });
    },
    onError: (err: unknown) => {
      const withMessage = err as { message?: string };
      error(withMessage.message || 'Erro ao remover CA');
    },
  });

  const clearResourcesMutation = useMutation({
    mutationFn: (caId: number) => RpkiCaService.clearResources(caId),
    onSuccess: () => {
      success('Recursos da CA removidos com sucesso');
    },
    onError: (err: unknown) => {
      const withMessage = err as { message?: string };
      error(withMessage.message || 'Erro ao remover recursos da CA');
    },
  });

  const filtered = useMemo(() => {
    const term = tableFilters.debouncedSearch.trim().toLowerCase();
    let rows = cas;

    if (term) {
      rows = rows.filter((row) => {
        const status = String(row.status || '').toLowerCase();
        return (
          String(row.id).includes(term) ||
          String(row.nome || '').toLowerCase().includes(term) ||
          String(row.handle || '').toLowerCase().includes(term) ||
          status.includes(term)
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
  }, [cas, tableFilters.debouncedSearch, tableFilters.sortColumn, tableFilters.sortDirection]);

  const total = filtered.length;
  const currentPage = tableFilters.page;
  const perPage = tableFilters.limit;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(currentPage, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = total === 0 ? 0 : Math.min(safePage * perPage, total);
  const pagedRows = filtered.slice(from > 0 ? from - 1 : 0, to);

  const clienteNomeById = useMemo(() => {
    const map = new Map<number, string>();
    for (const cliente of clientes) {
      map.set(cliente.id, cliente.razao_social || cliente.nome_fantasia || '');
    }
    return map;
  }, [clientes]);

  const columns: TableConfig<RpkiCa>['columns'] = [
    { key: 'id', label: 'ID', sortable: true, width: '50px', render: (item) => item.id },
    { key: 'nome', label: 'Nome', sortable: true, width: '220px', render: (item) => item.nome },
    {
      key: 'cliente_id',
      label: 'Cliente',
      sortable: false,
      width: '220px',
      render: (item) =>
        item.cliente_id != null ? (clienteNomeById.get(item.cliente_id) ?? '—') : '—',
    },
    { key: 'handle', label: 'Handle', sortable: true, width: '220px', render: (item) => item.handle || '-' },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      badgeLabels: ['pending', 'active', 'error', 'disabled'],
      render: (item) => {
        const labels: Record<string, string> = { pending: 'Pendente', active: 'Ativo', error: 'Erro', disabled: 'Desabilitado' };
        const cor = item.status === 'active' ? 'bg-success' : item.status === 'error' ? 'bg-danger' : 'bg-secondary';
        return <span className={`badge ${cor}`}>{labels[item.status] ?? item.status}</span>;
      },
    },
  ];

  return (
    <>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            title="CAs RPKI"
            config={{
              columns,
              data: pagedRows,
              loading: isLoading || deleteMutation.isPending || clearResourcesMutation.isPending,
              searchable: true,
              searchPlaceholder: 'Buscar...',
              searchFields: [
                { key: 'id', label: 'ID' },
                { key: 'nome', label: 'Nome' },
                { key: 'handle', label: 'Handle' },
                { key: 'status', label: 'Status' },
              ],
              sortable: true,
              sortColumn: tableFilters.sortColumn,
              sortDirection: tableFilters.sortDirection,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              emptyMessage: 'Nenhuma CA encontrada',
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
                  key: 'criar-ca',
                  label: t('actions.new'),
                  variant: 'primary',
                  requiresSelection: false,
                  onClick: () => setShowCreateModal(true),
                },
                {
                  key: 'deletar-ca',
                  label: t('actions.delete'),
                  disabled: (selectedItems: RpkiCa[]) => selectedItems.length === 0 && !selectedCa,
                  onClick: (selectedItems: RpkiCa[]) => {
                    const target = selectedItems[0] || selectedCa;
                    if (!target) return;
                    if (!window.confirm(t('messages.confirmDelete'))) return;
                    deleteMutation.mutate(target.id);
                  },
                },
                {
                  key: 'remover-recursos-ca',
                  label: 'Remover',
                  disabled: (selectedItems: RpkiCa[]) => selectedItems.length === 0 && !selectedCa,
                  onClick: (selectedItems: RpkiCa[]) => {
                    const target = selectedItems[0] || selectedCa;
                    if (!target) return;
                    if (!window.confirm('Tem certeza que deseja remover os recursos desta CA?')) return;
                    clearResourcesMutation.mutate(target.id);
                  },
                },
              ],
            }}
            tableId="rpki-cas-list-modal"
            syncWithHeader={false}
            onSelectionChange={(items) => setSelectedCa(items[0] ?? null)}
            onRefresh={refetch}
            onAudit={handleAuditCa}
            auditEntity="RpkiCa"
            onPageChange={tableFilters.setPage}
            onPageSizeChange={tableFilters.setLimit}
            onSort={(column, direction) => tableFilters.setSort(column, direction)}
            onSearch={(search) => tableFilters.setSearch(search)}
            search={tableFilters.search}
          />
        </div>
      </div>

      <RpkiCaCreateModal show={showCreateModal} onClose={() => setShowCreateModal(false)} />

      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('modal.auditLogs')}
        modalId="auditoria-rpki-ca-modal"
      />
    </>
  );
};

export default RpkiCaListModal;
