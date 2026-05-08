import React, { useMemo } from 'react';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import { useTableFilters } from 'hooks/useTableFilters';

interface RpkiHistoryRow {
  id: number | string;
  cliente_nome?: string;
  created_at?: string;
  prefix?: string;
  asn?: string;
  prefix_length?: number;
  state?: 'valid' | 'invalid' | 'not-found';
  reason?: string;
}

interface RpkiHistoryModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const RpkiHistoryModal: React.FC<RpkiHistoryModalProps> = () => {
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    initialSortColumn: 'created_at',
    initialSortDirection: 'desc',
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const data: RpkiHistoryRow[] = [];
  const tableColumns: TableConfig<RpkiHistoryRow>['columns'] = useMemo(() => [
    { key: 'cliente_nome', label: 'Cliente', sortable: true, width: '180px', render: (item) => String(item.cliente_nome ?? '-') },
    { key: 'created_at', label: 'Data', sortable: true, width: '130px', render: (item) => String(item.created_at ?? '-') },
    { key: 'prefix', label: 'Prefixo', sortable: true, width: '170px', render: (item) => String(item.prefix ?? '-') },
    { key: 'asn', label: 'ASN', sortable: true, width: '110px', render: (item) => String(item.asn ?? '-') },
    { key: 'prefix_length', label: 'Length', sortable: true, width: '100px', render: (item) => String(item.prefix_length ?? '-') },
    {
      key: 'state',
      label: 'Estado',
      sortable: true,
      badgeLabels: ['valid', 'invalid', 'not-found'],
      render: (item) => {
        const state = String(item.state ?? 'not-found');
        const className =
          state === 'valid' ? 'bg-success' :
          state === 'invalid' ? 'bg-danger' : 'bg-secondary';
        return <span className={`badge ${className}`}>{state}</span>;
      },
    },
    { key: 'reason', label: 'Motivo', sortable: true, width: '260px', render: (item) => String(item.reason ?? '-') },
  ], []);

  const pagination = useMemo(() => ({
    current_page: tableFilters.page,
    last_page: 1,
    per_page: tableFilters.limit,
    total: 0,
    from: 0,
    to: 0,
  }), [tableFilters.page, tableFilters.limit]);

  const searchFields = [
    { key: 'prefix', label: 'Prefixo' },
    { key: 'asn', label: 'ASN' },
    { key: 'state', label: 'Estado' },
    { key: 'reason', label: 'Motivo' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table
          title="Historico de validacoes"
          config={{
            columns: tableColumns,
            data,
            loading: false,
            searchable: true,
            searchPlaceholder: 'Buscar...',
            searchFields,
            sortable: true,
            sortColumn: tableFilters.sortColumn,
            sortDirection: tableFilters.sortDirection,
            striped: true,
            hover: true,
            responsive: true,
            selectable: false,
            emptyMessage: 'Sem validacoes registradas',
            pagination,
          }}
          tableId="rpki-history-modal"
          syncWithHeader={false}
          onRefresh={() => {}}
          onPageChange={tableFilters.setPage}
          onPageSizeChange={tableFilters.setLimit}
          onSort={(column, direction) => tableFilters.setSort(column, direction)}
          onSearch={(search, field) => {
            tableFilters.setSearch(search);
            if (field) tableFilters.setSearchField(field);
          }}
          search={tableFilters.search}
        />
      </div>
    </div>
  );
};

export default RpkiHistoryModal;

