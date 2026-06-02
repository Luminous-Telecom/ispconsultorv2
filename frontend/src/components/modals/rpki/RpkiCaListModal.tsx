import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useRpkiListModal } from 'hooks/useRpkiListModal';
import { RpkiCa, RpkiCaService } from 'services/rpkiCaService';
import { ClienteService } from 'services/clienteService';
import { useRpkiCas } from 'hooks/useRpkiCas';
import { renderStatusBadge } from 'components/ui/StatusBadge';
import { getRpkiCaStatusBadgeConfig } from 'utils/tableStatusBadges';
import RpkiCaCreateModal from './RpkiCaCreateModal';
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
  const rpki = useRpkiListModal<RpkiCa>();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

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
      rpki.setSelectedRow(null);
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

  const { rows: pagedRows, pagination } = rpki.paginateClientSide(cas, getSortableValue, (row, term) => {
    const status = String(row.status || '').toLowerCase();
    return (
      String(row.id).includes(term) ||
      String(row.nome || '').toLowerCase().includes(term) ||
      String(row.handle || '').toLowerCase().includes(term) ||
      status.includes(term)
    );
  });

  const clienteNomeById = useMemo(
    () => new Map(clientes.map((c) => [c.id, c.razao_social || c.nome_fantasia || ''])),
    [clientes]
  );

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
      {
        key: 'handle',
        label: 'Handle',
        sortable: true,
        width: '220px',
        render: (item) => item.handle || '-',
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (item) => renderStatusBadge(getRpkiCaStatusBadgeConfig(item.status)),
      }
    );
    return base;
  }, [clienteIdFilter, clienteNomeById]);

  const handleAuditCa = useCallback(
    (item: RpkiCa) => {
      void rpki.auditoria.handleAudit('RpkiCa', item.id);
    },
    [rpki.auditoria]
  );

  const bulkActions = useMemo(
    () => [
      {
        label: rpki.bulkBtn.novo.label,
        variant: rpki.bulkBtn.novo.variant,
        action: () => setShowCreateModal(true),
      },
      {
        label: rpki.bulkBtn.deletar.label,
        variant: rpki.bulkBtn.deletar.variant,
        disabled: (selectedItems: RpkiCa[]) =>
          selectedItems.length === 0 && !rpki.selectedRow,
        action: (selectedItems: RpkiCa[]) => {
          const target = selectedItems[0] || rpki.selectedRow;
          if (!target) return;
          if (!window.confirm(rpki.t('messages.confirmDelete'))) return;
          deleteMutation.mutate(target.id);
        },
      },
      {
        label: 'Remover',
        disabled: (selectedItems: RpkiCa[]) =>
          selectedItems.length === 0 && !rpki.selectedRow,
        action: (selectedItems: RpkiCa[]) => {
          const target = selectedItems[0] || rpki.selectedRow;
          if (!target) return;
          if (!window.confirm('Tem certeza que deseja remover os recursos desta CA?')) return;
          clearResourcesMutation.mutate(target.id);
        },
      },
    ],
    [rpki, clearResourcesMutation, deleteMutation]
  );

  return (
    <>
      <ListModal<RpkiCa>
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
            { key: 'nome', label: 'Nome' },
            { key: 'handle', label: 'Handle' },
            { key: 'status', label: 'Status' },
          ],
          emptyMessage: 'Nenhuma CA encontrada',
          multiSelect: false,
        }}
        data={pagedRows}
        loading={isLoading || deleteMutation.isPending || clearResourcesMutation.isPending}
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
        show={rpki.auditoria.showPreview}
        onClose={rpki.auditoria.handleClosePreview}
        pdfUrl={rpki.auditoria.pdfUrl}
        isGenerating={rpki.auditoria.isGeneratingPdf}
        title={rpki.t('modal.auditLogs')}
        modalId="auditoria-rpki-ca-modal"
      />
    </>
  );
};

export default RpkiCaListModal;
