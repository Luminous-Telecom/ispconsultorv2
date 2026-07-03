import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useRpkiListModal } from 'hooks/useRpkiListModal';
import { RpkiCaService, type RpkiAspa } from 'services/rpkiCaService';
import { useRpkiCas } from 'hooks/useRpkiCas';
import { renderStatusBadge } from 'components/ui/StatusBadge';
import { getRpkiAspaStatusBadgeConfig } from 'utils/tableStatusBadges';
import RpkiAspaCreateModal from './RpkiAspaCreateModal';
import ImprimirModal from 'components/common/ImprimirModal';

interface RpkiAspaListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  clienteIdFilter?: number;
  tableTitle?: string;
}

function getSortableValue(row: RpkiAspa, sortKey: string): string {
  switch (sortKey) {
    case 'id':
      return String(row.id);
    case 'ca_id':
      return String(row.ca_id);
    case 'customer_asn':
      return String(row.customer_asn || '');
    case 'status':
      return String(row.status || '');
    default:
      return '';
  }
}

const RpkiAspaListModal: React.FC<RpkiAspaListModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  clienteIdFilter,
  tableTitle = 'ASPAs',
}) => {
  const rpki = useRpkiListModal<RpkiAspa>();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const [aspas, setAspas] = useState<RpkiAspa[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { cas, caIdsKey } = useRpkiCas(clienteIdFilter);
  const caNomeById = useMemo(() => new Map(cas.map((ca) => [ca.id, ca.nome])), [cas]);

  const { isLoading, refetch } = useQuery({
    queryKey: ['rpki-aspas', caIdsKey],
    queryFn: async () => {
      const all: RpkiAspa[] = [];
      for (const ca of cas) {
        const items = await RpkiCaService.listAspas(ca.id);
        all.push(...items);
      }
      setAspas(all);
      return all;
    },
    enabled: cas.length > 0,
  });

  const { rows: pagedRows, pagination } = rpki.paginateClientSide(
    aspas,
    getSortableValue,
    (row, term) =>
      String(row.id).includes(term) ||
      row.customer_asn.toLowerCase().includes(term) ||
      (row.providers_json ?? []).join(', ').toLowerCase().includes(term) ||
      (caNomeById.get(row.ca_id) ?? '').toLowerCase().includes(term)
  );

  const handleAuditAspa = useCallback(
    (item: RpkiAspa) => {
      void rpki.auditoria.handleAudit('RpkiAspa', item.id);
    },
    [rpki.auditoria]
  );

  const columns: ListModalConfig<RpkiAspa>['columns'] = [
    { key: 'id', label: 'ID', sortable: true, width: '60px', render: (item) => item.id },
    {
      key: 'ca_id',
      label: 'CA',
      sortable: true,
      width: '180px',
      render: (item) => caNomeById.get(item.ca_id) ?? `#${item.ca_id}`,
    },
    {
      key: 'customer_asn',
      label: 'Customer ASN',
      sortable: true,
      width: '150px',
      render: (item) => `AS${item.customer_asn}`,
    },
    {
      key: 'providers_json',
      label: 'Providers',
      sortable: false,
      render: (item) => (item.providers_json ?? []).map((p) => `AS${p}`).join(', ') || '-',
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '110px',
      render: (item) => renderStatusBadge(getRpkiAspaStatusBadgeConfig(item.status)),
    },
  ];

  const bulkActions = useMemo(
    () => [
      {
        label: rpki.bulkBtn.novo.label,
        variant: rpki.bulkBtn.novo.variant,
        action: () => setShowCreateModal(true),
      },
      {
        label: 'Revogar',
        variant: 'primary' as const,
        action: (selectedItems: RpkiAspa[]) => {
          const selected = selectedItems[0];
          if (!selected) return;
          if (!window.confirm('Tem certeza que deseja revogar este ASPA?')) return;
          RpkiCaService.revokeAspa(selected.ca_id, selected.id)
            .then(() => {
              setAspas((prev) =>
                prev.map((a) =>
                  a.id === selected.id
                    ? { ...a, status: 'revoked' as const, revoked_at: new Date().toISOString() }
                    : a
                )
              );
              success('ASPA revogado com sucesso');
            })
            .catch((err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_ASPA_REVOKE_ERROR));
        },
      },
      {
        label: 'Excluir',
        variant: 'primary' as const,
        action: (selectedItems: RpkiAspa[]) => {
          const selected = selectedItems[0];
          if (!selected) return;
          if (!window.confirm('Deseja excluir este ASPA permanentemente?')) return;
          RpkiCaService.deleteAspa(selected.ca_id, selected.id)
            .then(() => {
              setAspas((prev) => prev.filter((a) => a.id !== selected.id));
              success('ASPA excluído com sucesso');
            })
            .catch((err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_ASPA_DELETE_ERROR));
        },
      },
    ],
    [rpki.bulkBtn, showApiError, success]
  );

  return (
    <>
      <ListModal<RpkiAspa>
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
            { key: 'customer_asn', label: 'Customer ASN' },
            { key: 'providers_json', label: 'Providers' },
          ],
          emptyMessage: 'Nenhum ASPA encontrado',
          multiSelect: false,
        }}
        data={pagedRows}
        loading={isLoading}
        search={rpki.tableFilters.search}
        onSearchChange={rpki.handleSearchChange}
        sortColumn={rpki.tableFilters.sortColumn}
        sortDirection={rpki.tableFilters.sortDirection}
        onSortChange={rpki.tableFilters.setSort}
        pagination={pagination}
        onPageChange={rpki.tableFilters.setPage}
        onLimitChange={rpki.tableFilters.setLimit}
        onRefresh={() => refetch()}
        bulkActions={bulkActions}
        onAudit={handleAuditAspa}
        auditEntity="RpkiAspa"
        tableId="rpki-aspas-list-modal"
      />

      <RpkiAspaCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        allowedCaIds={cas.map((c) => c.id)}
        initialCaId={cas.length === 1 ? cas[0].id : null}
        onSave={(payload) => {
          RpkiCaService.createAspa(payload)
            .then((created) => {
              setAspas((prev) => [created, ...prev]);
              setShowCreateModal(false);
              success('ASPA salvo com sucesso');
            })
            .catch((err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_ASPA_CREATE_ERROR));
        }}
      />

      <ImprimirModal
        show={rpki.auditoria.showPreview}
        onClose={rpki.auditoria.handleClosePreview}
        pdfUrl={rpki.auditoria.pdfUrl}
        isGenerating={rpki.auditoria.isGeneratingPdf}
        title={rpki.t('modal.auditLogs')}
        modalId="auditoria-rpki-aspa-modal"
      />
    </>
  );
};

export default RpkiAspaListModal;
