import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import { useI18n } from 'contexts/I18nContext';
import { useTableFilters } from 'hooks/useTableFilters';
import { ClienteService } from 'services/clienteService';
import { RpkiCaService } from 'services/rpkiCaService';
import RpkiAspaCreateModal from './RpkiAspaCreateModal';

interface RpkiAspaRow {
  id: number;
  caId: number;
  caNome: string;
  clienteNome: string;
  customerAsn: string;
  providers: string;
}

interface RpkiAspaListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

function getSortableValue(row: RpkiAspaRow, sortKey: string): string {
  switch (sortKey) {
    case 'id':
      return String(row.id);
    case 'caNome':
      return row.caNome;
    case 'clienteNome':
      return row.clienteNome;
    case 'customerAsn':
      return row.customerAsn;
    case 'providers':
      return row.providers;
    default:
      return '';
  }
}

const RpkiAspaListModal: React.FC<RpkiAspaListModalProps> = () => {
  const { t } = useI18n();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [aspas, setAspas] = useState<RpkiAspaRow[]>([]);

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
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-rpki'],
    queryFn: async () => {
      const response = await ClienteService.list({ limit: 1000 });
      return response.data ?? [];
    },
  });

  const clienteNomeById = useMemo(() => {
    const map = new Map<number, string>();
    for (const cliente of clientes) map.set(cliente.id, cliente.nome_fantasia || cliente.razao_social);
    return map;
  }, [clientes]);

  const filtered = useMemo(() => {
    const term = tableFilters.debouncedSearch.trim().toLowerCase();
    let rows = aspas;
    if (term) {
      rows = rows.filter(
        (row) =>
          String(row.id).includes(term) ||
          row.caNome.toLowerCase().includes(term) ||
          row.clienteNome.toLowerCase().includes(term) ||
          row.customerAsn.toLowerCase().includes(term) ||
          row.providers.toLowerCase().includes(term)
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
  }, [aspas, tableFilters.debouncedSearch, tableFilters.sortColumn, tableFilters.sortDirection]);

  const total = filtered.length;
  const perPage = tableFilters.limit;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(tableFilters.page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = total === 0 ? 0 : Math.min(safePage * perPage, total);
  const pagedRows = filtered.slice(from > 0 ? from - 1 : 0, to);

  const columns: TableConfig<RpkiAspaRow>['columns'] = [
    { key: 'id', label: 'ID', sortable: true, width: '50px', render: (item) => item.id },
    { key: 'caNome', label: 'CA', sortable: true, width: '180px', render: (item) => item.caNome || '-' },
    { key: 'clienteNome', label: 'Cliente', sortable: true, width: '220px', render: (item) => item.clienteNome || '-' },
    { key: 'customerAsn', label: 'Customer ASN', sortable: true, width: '150px', render: (item) => item.customerAsn || '-' },
    { key: 'providers', label: 'Providers', sortable: true, width: '260px', render: (item) => item.providers || '-' },
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
              loading: false,
              searchable: true,
              searchPlaceholder: 'Buscar...',
              searchFields: [
                { key: 'id', label: 'ID' },
                { key: 'caNome', label: 'CA' },
                { key: 'clienteNome', label: 'Cliente' },
                { key: 'customerAsn', label: 'Customer ASN' },
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
            onRefresh={() => {}}
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
          const ca = cas.find((item) => item.id === payload.caId);
          const clienteNome =
            ca?.cliente_id != null
              ? (clienteNomeById.get(ca.cliente_id) ?? '—')
              : '—';
          setAspas((prev) => [
            {
              id: prev.length ? Math.max(...prev.map((row) => row.id)) + 1 : 1,
              caId: payload.caId,
              caNome: ca?.nome || `#${payload.caId}`,
              clienteNome,
              customerAsn: payload.customerAsn,
              providers: payload.providers,
            },
            ...prev,
          ]);
          setShowCreateModal(false);
        }}
      />
    </>
  );
};

export default RpkiAspaListModal;

