import React, { useMemo } from 'react';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import { useTableFilters } from 'hooks/useTableFilters';

interface RpkiAlertRow {
  id: number | string;
  cliente_nome?: string;
  tipo?: string;
  prefixo?: string;
  asn?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'aberto' | 'resolvido';
  created_at?: string;
}

interface RpkiAlertsModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const RpkiAlertsModal: React.FC<RpkiAlertsModalProps> = () => {
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    initialSortColumn: 'created_at',
    initialSortDirection: 'desc',
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const data: RpkiAlertRow[] = [];
  const tableColumns: TableConfig<RpkiAlertRow>['columns'] = useMemo(() => [
    { key: 'cliente_nome', label: 'Cliente', sortable: true, width: '180px', render: (item) => String(item.cliente_nome ?? '-') },
    { key: 'tipo', label: 'Tipo', sortable: true, width: '140px', render: (item) => String(item.tipo ?? '-') },
    { key: 'prefixo', label: 'Prefixo', sortable: true, width: '170px', render: (item) => String(item.prefixo ?? '-') },
    { key: 'asn', label: 'ASN', sortable: true, width: '100px', render: (item) => String(item.asn ?? '-') },
    {
      key: 'severity',
      label: 'Severidade',
      sortable: true,
      badgeLabels: ['low', 'medium', 'high', 'critical'],
      render: (item) => {
        const severity = String(item.severity ?? 'medium');
        const className =
          severity === 'critical' ? 'bg-danger' :
          severity === 'high' ? 'bg-warning' :
          severity === 'low' ? 'bg-success' : 'bg-info';
        return <span className={`badge ${className}`}>{severity}</span>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      badgeLabels: ['aberto', 'resolvido'],
      render: (item) => {
        const status = String(item.status ?? 'aberto');
        return <span className={`badge ${status === 'resolvido' ? 'bg-secondary' : 'bg-danger'}`}>{status}</span>;
      },
    },
    { key: 'created_at', label: 'Criado em', sortable: true, width: '130px', render: (item) => String(item.created_at ?? '-') },
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
    { key: 'tipo', label: 'Tipo' },
    { key: 'prefixo', label: 'Prefixo' },
    { key: 'asn', label: 'ASN' },
    { key: 'severity', label: 'Severidade' },
  ];

  const bulkActions = [
    {
      label: 'Marcar como resolvido',
      variant: 'primary' as const,
      disabled: true,
      action: () => {},
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table
          title="Alertas RPKI"
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
            selectable: true,
            multiSelect: false,
            bulkActions: bulkActions.map((action) => ({
              key: action.label.toLowerCase().replace(/\s+/g, '-'),
              label: action.label,
              onClick: action.action,
              disabled: action.disabled,
              variant: action.variant,
            })),
            emptyMessage: 'Nenhum alerta encontrado',
            pagination,
          }}
          tableId="rpki-alerts-modal"
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

export default RpkiAlertsModal;

