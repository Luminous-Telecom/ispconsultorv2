import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useTableFilters } from 'hooks/useTableFilters';
import { useI18n } from 'contexts/I18nContext';
import { useBulkBtn } from 'components/ui';
import { RpkiCa, RpkiCaService } from 'services/rpkiCaService';
import { ClienteService } from 'services/clienteService';
import { useRpkiCas } from 'hooks/useRpkiCas';
import RpkiCaCreateModal from './RpkiCaCreateModal';
import { useAuditoria } from 'hooks/useAuditoria';
import ImprimirModal from 'components/common/ImprimirModal';

interface RpkiCaListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  clienteIdFilter?: number;
  tableTitle?: string;
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

const RpkiCaListModal: React.FC<RpkiCaListModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  clienteIdFilter,
  tableTitle = 'CAs RPKI',
}) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCa, setSelectedCa] = useState<RpkiCa | null>(null);
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
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

  const handleSearchChange = useCallback(
    (search: string, field?: string) => {
      tableFilters.setSearch(search);
      if (field) {
        tableFilters.setSearchField(field);
      }
    },
    [tableFilters]
  );

  const { cas, isLoading, refetch } = useRpkiCas(clienteIdFilter);
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-rpki'],
    queryFn: async () => {
      const response = await ClienteService.list({ limit: 1000 });
      return response.data ?? [];
    },
    enabled: clienteIdFilter == null,
  });
  const deleteMutation = useMutation({
    mutationFn: (caId: number) => RpkiCaService.delete(caId),
    onSuccess: () => {
      success('CA removida com sucesso');
      setSelectedCa(null);
      queryClient.invalidateQueries({ queryKey: ['rpki-cas'] });
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_CA_DELETE_ERROR),
  });

  const clearResourcesMutation = useMutation({
    mutationFn: (caId: number) => RpkiCaService.clearResources(caId),
    onSuccess: () => {
      success('Recursos da CA removidos com sucesso');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_CA_RESOURCES_DELETE_ERROR),
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

  const columns: ListModalConfig<RpkiCa>['columns'] = useMemo(() => {
    const base: ListModalConfig<RpkiCa>['columns'] = [
      { key: 'id', label: 'ID', sortable: true, width: '50px', render: (item) => item.id },
      { key: 'nome', label: 'Nome', sortable: true, width: '220px', render: (item) => item.nome },
    ];
    if (clienteIdFilter == null) {
      base.push({
        key: 'cliente_id',
        label: 'Cliente',
        sortable: false,
        width: '220px',
        render: (item) =>
          item.cliente_id != null ? (clienteNomeById.get(item.cliente_id) ?? '—') : '—',
      });
    }
    base.push(
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
      }
    );
    return base;
  }, [clienteIdFilter, clienteNomeById]);

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
        disabled: (selectedItems: RpkiCa[]) => selectedItems.length === 0 && !selectedCa,
        action: (selectedItems: RpkiCa[]) => {
          const target = selectedItems[0] || selectedCa;
          if (!target) return;
          if (!window.confirm(t('messages.confirmDelete'))) return;
          deleteMutation.mutate(target.id);
        },
      },
      {
        label: 'Remover',
        disabled: (selectedItems: RpkiCa[]) => selectedItems.length === 0 && !selectedCa,
        action: (selectedItems: RpkiCa[]) => {
          const target = selectedItems[0] || selectedCa;
          if (!target) return;
          if (!window.confirm('Tem certeza que deseja remover os recursos desta CA?')) return;
          clearResourcesMutation.mutate(target.id);
        },
      },
    ],
    [bulkBtn, clearResourcesMutation, deleteMutation, selectedCa, t]
  );

  return (
    <>
      <ListModal<RpkiCa>
        show={show}
        onClose={onClose}
        skipWrapper={skipWrapper}
        config={{
          title: tableTitle,
          columns,
          searchPlaceholder: 'Buscar...',
          searchFields: [
            { key: 'id', label: 'ID' },
            { key: 'nome', label: 'Nome' },
            { key: 'handle', label: 'Handle' },
            { key: 'status', label: 'Status' },
          ],
          emptyMessage: 'Nenhuma CA encontrada',
          multiSelect: false,
        }}
        data={pagedRows}
        loading={isLoading || deleteMutation.isPending || clearResourcesMutation.isPending}
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
        onSelectionChange={(items) => setSelectedCa(items[0] ?? null)}
        onAudit={handleAuditCa}
        auditEntity="RpkiCa"
        tableId="rpki-cas-list-modal"
      />

      <RpkiCaCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        defaultClienteId={clienteIdFilter}
      />

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
