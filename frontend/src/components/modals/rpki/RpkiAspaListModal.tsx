import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useI18n } from 'contexts/I18nContext';
import { useTableFilters } from 'hooks/useTableFilters';
import { RpkiCaService, type RpkiAspa } from 'services/rpkiCaService';
import RpkiAspaCreateModal from './RpkiAspaCreateModal';
import { useAuditoria } from 'hooks/useAuditoria';
import ImprimirModal from 'components/common/ImprimirModal';

interface RpkiAspaListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const statusLabels: Record<string, string> = { active: 'Ativo', revoked: 'Revogado', expired: 'Expirado' };

const RpkiAspaListModal: React.FC<RpkiAspaListModalProps> = () => {
  const { t } = useI18n();
  const { error: showError, success } = useNotificationContext();
  const auditoria = useAuditoria();
  const handleAuditAspa = useCallback(
    (item: RpkiAspa) => {
      void auditoria.handleAudit('RpkiAspa', item.id);
    },
    [auditoria]
  );
  const [aspas, setAspas] = useState<RpkiAspa[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    searchDebounceMs: 250,
    resetPageOnFilterChange: true,
  });

  const { data: cas = [] } = useQuery({
    queryKey: ['rpki-cas'],
    queryFn: () => RpkiCaService.list(),
  });

  const { isLoading, refetch } = useQuery({
    queryKey: ['rpki-aspas', cas.map((c) => c.id)],
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

  const caNomeById = useMemo(() => new Map(cas.map((ca) => [ca.id, ca.nome])), [cas]);

  const filtered = useMemo(() => {
    const term = tableFilters.debouncedSearch.trim().toLowerCase();
    let rows = aspas;
    if (term) {
      rows = rows.filter(
        (row) =>
          String(row.id).includes(term) ||
          row.customer_asn.toLowerCase().includes(term) ||
          (row.providers_json ?? []).join(', ').toLowerCase().includes(term) ||
          (caNomeById.get(row.ca_id) ?? '').toLowerCase().includes(term)
      );
    }
    const sortKey = tableFilters.sortColumn || 'id';
    const direction = tableFilters.sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = String((a as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      const vb = String((b as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      if (va < vb) return -1 * direction;
      if (va > vb) return 1 * direction;
      return 0;
    });
  }, [aspas, tableFilters.debouncedSearch, tableFilters.sortColumn, tableFilters.sortDirection, caNomeById]);

  const total = filtered.length;
  const perPage = tableFilters.limit;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(tableFilters.page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = total === 0 ? 0 : Math.min(safePage * perPage, total);
  const pagedRows = filtered.slice(from > 0 ? from - 1 : 0, to);

  const columns: TableConfig<RpkiAspa>['columns'] = [
    { key: 'id', label: 'ID', sortable: true, width: '60px', render: (item) => item.id },
    { key: 'ca_id', label: 'CA', sortable: true, width: '180px', render: (item) => caNomeById.get(item.ca_id) ?? `#${item.ca_id}` },
    { key: 'customer_asn', label: 'Customer ASN', sortable: true, width: '150px', render: (item) => `AS${item.customer_asn}` },
    { key: 'providers_json', label: 'Providers', sortable: false, render: (item) => (item.providers_json ?? []).map((p) => `AS${p}`).join(', ') || '-' },
    {
      key: 'status', label: 'Status', sortable: true, width: '110px',
      render: (item) => {
        const cor = item.status === 'active' ? 'bg-success' : item.status === 'revoked' ? 'bg-warning' : 'bg-secondary';
        return <span className={`badge ${cor}`}>{statusLabels[item.status] ?? item.status}</span>;
      },
    },
  ];

  const bulkActions = [
    {
      key: 'novo-aspa',
      label: t('actions.new'),
      variant: 'primary' as const,
      requiresSelection: false,
      onClick: () => setShowCreateModal(true),
    },
    {
      key: 'revogar',
      label: 'Revogar',
      variant: 'primary' as const,
      onClick: (selectedItems: RpkiAspa[]) => {
        const selected = selectedItems[0];
        if (!selected) return;
        if (!window.confirm('Tem certeza que deseja revogar este ASPA?')) return;
        RpkiCaService.revokeAspa(selected.ca_id, selected.id)
          .then(() => {
            setAspas((prev) => prev.map((a) => a.id === selected.id ? { ...a, status: 'revoked' as const, revoked_at: new Date().toISOString() } : a));
            success('ASPA revogado com sucesso');
          })
          .catch((err) => showError(err instanceof Error ? err.message : 'Erro ao revogar ASPA'));
      },
    },
    {
      key: 'excluir',
      label: 'Excluir',
      variant: 'primary' as const,
      onClick: (selectedItems: RpkiAspa[]) => {
        const selected = selectedItems[0];
        if (!selected) return;
        if (!window.confirm('Deseja excluir este ASPA permanentemente?')) return;
        RpkiCaService.deleteAspa(selected.ca_id, selected.id)
          .then(() => {
            setAspas((prev) => prev.filter((a) => a.id !== selected.id));
            success('ASPA excluído com sucesso');
          })
          .catch((err) => showError(err instanceof Error ? err.message : 'Erro ao excluir ASPA'));
      },
    },
  ];

  return (
    <>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            title="ASPAs"
            config={{
              columns,
              data: pagedRows,
              loading: isLoading,
              searchable: true,
              searchPlaceholder: 'Buscar...',
              searchFields: [
                { key: 'id', label: 'ID' },
                { key: 'customer_asn', label: 'Customer ASN' },
                { key: 'providers_json', label: 'Providers' },
              ],
              sortable: true,
              sortColumn: tableFilters.sortColumn,
              sortDirection: tableFilters.sortDirection,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              emptyMessage: 'Nenhum ASPA encontrado',
              pagination: { current_page: safePage, last_page: lastPage, per_page: perPage, total, from, to },
              bulkActions,
            }}
            tableId="rpki-aspas-list-modal"
            syncWithHeader={false}
            onRefresh={() => refetch()}
            onAudit={handleAuditAspa}
            auditEntity="RpkiAspa"
            onPageChange={tableFilters.setPage}
            onPageSizeChange={tableFilters.setLimit}
            onSort={(column, direction) => tableFilters.setSort(column, direction)}
            onSearch={(search) => tableFilters.setSearch(search)}
            search={tableFilters.search}
          />
        </div>
      </div>

      <RpkiAspaCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={(payload) => {
          RpkiCaService.createAspa(payload)
            .then((created) => {
              setAspas((prev) => [created, ...prev]);
              setShowCreateModal(false);
              success('ASPA criado com sucesso');
            })
            .catch((err) => showError(err instanceof Error ? err.message : 'Erro ao criar ASPA'));
        }}
      />

      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('modal.auditLogs')}
        modalId="auditoria-rpki-aspa-modal"
      />
    </>
  );
};

export default RpkiAspaListModal;
