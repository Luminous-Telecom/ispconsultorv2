import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import { useI18n } from 'contexts/I18nContext';
import { useTableFilters } from 'hooks/useTableFilters';
import { RpkiCaService, type RpkiAspa } from 'services/rpkiCaService';
import RpkiAspaCreateModal from './RpkiAspaCreateModal';

interface RpkiAspaListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

function getSortableValue(row: RpkiAspa, sortKey: string): string {
  switch (sortKey) {
    case 'id':          return String(row.id);
    case 'ca_id':       return String(row.ca_id);
    case 'customer_asn': return row.customer_asn;
    case 'providers':   return (row.providers_json ?? []).join(', ');
    case 'status':      return row.status;
    default:            return '';
  }
}

const RpkiAspaListModal: React.FC<RpkiAspaListModalProps> = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
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

  const { data: aspas = [], isLoading, refetch } = useQuery({
    queryKey: ['rpki-aspas'],
    queryFn: async () => {
      const all: RpkiAspa[] = [];
      for (const ca of cas) {
        const items = await RpkiCaService.listAspas(ca.id);
        all.push(...items);
      }
      return all;
    },
    enabled: cas.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { caId: number; customerAsn: string; providers: string }) =>
      RpkiCaService.createAspa(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rpki-aspas'] });
      setShowCreateModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ caId, aspaId }: { caId: number; aspaId: number }) =>
      RpkiCaService.deleteAspa(caId, aspaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rpki-aspas'] }),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ caId, aspaId }: { caId: number; aspaId: number }) =>
      RpkiCaService.revokeAspa(caId, aspaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rpki-aspas'] }),
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
      const va = getSortableValue(a, sortKey).toLowerCase();
      const vb = getSortableValue(b, sortKey).toLowerCase();
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

  const statusLabels: Record<string, string> = { active: 'Ativo', revoked: 'Revogado', expired: 'Expirado' };

  const columns: TableConfig<RpkiAspa>['columns'] = [
    { key: 'id', label: 'ID', sortable: true, width: '60px', render: (item) => item.id },
    { key: 'ca_id', label: 'CA', sortable: true, width: '180px', render: (item) => caNomeById.get(item.ca_id) ?? `#${item.ca_id}` },
    { key: 'customer_asn', label: 'Customer ASN', sortable: true, width: '150px', render: (item) => `AS${item.customer_asn}` },
    { key: 'providers', label: 'Providers', sortable: false, render: (item) => (item.providers_json ?? []).map((p) => `AS${p}`).join(', ') || '-' },
    {
      key: 'status', label: 'Status', sortable: true, width: '110px',
      render: (item) => {
        const cor = item.status === 'active' ? 'bg-success' : item.status === 'revoked' ? 'bg-warning' : 'bg-secondary';
        return <span className={`badge ${cor}`}>{statusLabels[item.status] ?? item.status}</span>;
      },
    },
    {
      key: 'acoes', label: 'Ações', sortable: false, width: '130px',
      render: (item) => (
        <div className="d-flex gap-1">
          {item.status === 'active' && (
            <button
              className="btn btn-warning btn-sm"
              disabled={revokeMutation.isPending}
              onClick={() => {
                if (window.confirm('Revogar este ASPA?')) revokeMutation.mutate({ caId: item.ca_id, aspaId: item.id });
              }}
            >
              Revogar
            </button>
          )}
          <button
            className="btn btn-danger btn-sm"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm('Excluir este ASPA?')) deleteMutation.mutate({ caId: item.ca_id, aspaId: item.id });
            }}
          >
            Excluir
          </button>
        </div>
      ),
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
              loading: isLoading || createMutation.isPending || deleteMutation.isPending,
              searchable: true,
              searchPlaceholder: 'Buscar...',
              searchFields: [
                { key: 'id', label: 'ID' },
                { key: 'customer_asn', label: 'Customer ASN' },
                { key: 'providers', label: 'Providers' },
              ],
              sortable: true,
              sortColumn: tableFilters.sortColumn,
              sortDirection: tableFilters.sortDirection,
              striped: true,
              hover: true,
              responsive: true,
              selectable: false,
              emptyMessage: 'Nenhum ASPA encontrado',
              pagination: { current_page: safePage, last_page: lastPage, per_page: perPage, total, from, to },
              bulkActions: [
                {
                  key: 'novo-aspa',
                  label: t('actions.new'),
                  variant: 'primary',
                  requiresSelection: false,
                  onClick: () => setShowCreateModal(true),
                },
              ],
            }}
            tableId="rpki-aspas-list-modal"
            syncWithHeader={false}
            onRefresh={() => refetch()}
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
        onSave={(payload) => createMutation.mutate(payload)}
        isPending={createMutation.isPending}
      />
    </>
  );
};

export default RpkiAspaListModal;
