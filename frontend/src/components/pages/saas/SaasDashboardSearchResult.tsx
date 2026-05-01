import React, { useCallback, useEffect } from 'react';
import { Table } from 'components/tables';
import { saasEmpresasService, type SaasEmpresa } from 'services/saas/saasEmpresasService';
import { useQuery } from '@tanstack/react-query';
import { formatDateTime } from 'utils/formatters';
import { useModal } from 'contexts/ModalContext';
import { useTableFilters } from 'hooks/useTableFilters';

interface SaasDashboardSearchResultProps {
  searchTerm: string;
  searchField: string;
}

const SaasDashboardSearchResult: React.FC<SaasDashboardSearchResultProps> = ({ searchTerm, searchField }) => {
  const { openModal } = useModal();

  const tableFilters = useTableFilters({
    initialSearch: searchTerm,
    initialPage: 1,
    initialLimit: 500,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    immediateSearch: true,
    resetPageOnFilterChange: true,
  });

  useEffect(() => {
    if (searchTerm !== tableFilters.search) {
      tableFilters.setSearch(searchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const { data: empresasResponse, isLoading } = useQuery({
    queryKey: ['saas-empresas-search', tableFilters.debouncedSearch || searchTerm, tableFilters.page, tableFilters.limit, tableFilters.sortColumn, tableFilters.sortDirection],
    queryFn: () =>
      saasEmpresasService.list({
        search: tableFilters.debouncedSearch || searchTerm,
        page: tableFilters.page,
        limit: tableFilters.limit,
        sortColumn: tableFilters.sortColumn,
        sortDirection: tableFilters.sortDirection,
      }),
    enabled: Boolean(searchTerm),
  });

  const tableData = React.useMemo(() => empresasResponse?.data?.data ?? [], [empresasResponse?.data?.data]);
  const pagination = empresasResponse?.data?.pagination;

  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '42px',
      render: (item: SaasEmpresa) => <span>{item.id}</span>,
    },
    {
      key: 'cnpj',
      label: 'CNPJ',
      sortable: true,
      width: '130px',
      render: (item: SaasEmpresa) => <span className="text-nowrap">{item.cnpj}</span>,
    },
    {
      key: 'razao_social',
      label: 'Razão Social',
      width: '200px',
      sortable: true,
      render: (item: SaasEmpresa) => item.razao_social,
    },
    {
      key: 'nome_fantasia',
      label: 'Nome Fantasia',
      sortable: true,
      render: (item: SaasEmpresa) => (
        <span className="text-muted">{item.nome_fantasia || '-'}</span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (item: SaasEmpresa) => <span className="text-nowrap">{item.email}</span>,
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (item: SaasEmpresa & { created_at?: string }) => (item.created_at ? formatDateTime(item.created_at) : '-'),
    },
  ];

  const handleRowClick = useCallback(
    (empresa: SaasEmpresa) => {
      openModal('saas-clientes', { empresaId: empresa.id });
    },
    [openModal]
  );

  return (
    <div className="dashboard-search-results animate__animated animate__fadeIn">
      <div className="card border-0 shadow-sm p-3 mb-3 bg-custom-secondary">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h4 className="mb-0 text-custom-primary">Resultados da busca por &quot;{searchTerm}&quot;</h4>
          <span className="badge bg-primary">
            {pagination?.total ?? tableData.length} encontrados
          </span>
        </div>

        <Table
          title="Resultados da Busca"
          config={{
            columns,
            data: tableData,
            loading: isLoading,
            selectable: false,
            searchable: true,
            showToolbar: false,
            searchField,
            searchFields: [
              { key: 'todos', label: 'Todos' },
              { key: 'id', label: 'ID' },
              { key: 'cnpj', label: 'CNPJ' },
              { key: 'razao_social', label: 'Razão Social' },
              { key: 'nome_fantasia', label: 'Nome Fantasia' },
              { key: 'email', label: 'Email' },
            ],
            sortable: true,
            sortColumn: tableFilters.sortColumn,
            sortDirection: tableFilters.sortDirection,
            emptyMessage: 'Nenhum cliente tenant encontrado para esta busca.',
          }}
          onRowClick={handleRowClick}
          onSort={(column: string, direction: 'asc' | 'desc') => {
            tableFilters.setSort(column, direction);
          }}
        />
      </div>
    </div>
  );
};

export default SaasDashboardSearchResult;
