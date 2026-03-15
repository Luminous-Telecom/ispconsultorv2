import React, { useCallback, useEffect } from 'react';
import { Table } from '../tables';
import { useClientes } from 'hooks/useClientes';
import { Cliente } from 'types';
import { formatDateTime } from 'utils/formatters';
import { useModal } from 'contexts/ModalContext';
import { useTableFilters } from 'hooks/useTableFilters';

interface DashboardSearchResultProps {
  searchTerm: string;
  searchField: string;
}

const DashboardSearchResult: React.FC<DashboardSearchResultProps> = ({ searchTerm, searchField }) => {
  const { openModal } = useModal();

  // Hook unificado para filtros, busca, ordenação e paginação
  const tableFilters = useTableFilters({
    initialSearch: searchTerm,
    initialPage: 1,
    initialLimit: 20,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  // Atualizar search quando searchTerm mudar (vem do header)
  useEffect(() => {
    if (searchTerm !== tableFilters.search) {
      tableFilters.setSearch(searchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Buscar clientes baseado no termo do header e ordenação
  const { data: clientesData, isLoading, refetch } = useClientes({
    search: tableFilters.debouncedSearch || searchTerm,
    searchField: searchField,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  });

  const tableData = React.useMemo(() => clientesData?.data || [], [clientesData?.data]);

  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '42px',
      render: (item: Cliente) => <span>{item.id}</span>
    },
    {
      key: 'cnpj',
      label: 'CNPJ',
      sortable: true,
      width: '130px',
      render: (item: Cliente) => (
        <span className="text-nowrap">{item.cnpj}</span>
      )
    },
    {
      key: 'razao_social',
      label: 'Razão Social',
      width: '200px',
      sortable: true,
      render: (item: Cliente) => (
        item.razao_social
      )
    },
    {
      key: 'nome_fantasia',
      label: 'Nome Fantasia',
      sortable: true,
      render: (item: Cliente) => (
        <span className="text-muted">{item.nome_fantasia || '-'}</span>
      )
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (item: Cliente) => (
        <span className="text-nowrap">{item.email}</span>
      )
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      sortable: false,
      render: (item: Cliente) => (
        <span className="text-nowrap">{item.whatsapp || '-'}</span>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      width: '100px',
      render: (item: Cliente) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (item: Cliente & { created_at?: string; created_at_formatada?: string | null }) => {
        if (item.created_at_formatada) return item.created_at_formatada;
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ];

  const handleRowClick = useCallback((cliente: Cliente) => {
    // Ao clicar no cliente, abrimos o modal de edição diretamente
    // passando o clienteId como parâmetro para o ModalContext
    openModal('cliente-modal', { clienteId: cliente.id });
  }, [openModal]);

  return (
    <div className="dashboard-search-results animate__animated animate__fadeIn">
      <div className="card border-0 shadow-sm p-3 mb-3 bg-custom-secondary">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h4 className="mb-0 text-custom-primary">
            Resultados da busca por "{searchTerm}"
          </h4>
          <span className="badge bg-primary">
            {Math.max(clientesData?.pagination?.total || 0, clientesData?.data?.length || 0)} encontrados
          </span>
        </div>
        
        <Table
          title="Resultados da Busca"
          config={{
            columns,
            data: tableData,
            loading: isLoading,
            pagination: (clientesData?.pagination && clientesData.pagination.total > 0) ? {
              currentPage: clientesData.pagination.current_page,
              lastPage: clientesData.pagination.last_page,
              perPage: clientesData.pagination.per_page,
              total: clientesData.pagination.total,
              from: clientesData.pagination.from,
              to: clientesData.pagination.to
            } : (clientesData?.data && clientesData.data.length > 0) ? {
              currentPage: 1,
              lastPage: 1,
              perPage: clientesData.data.length,
              total: clientesData.data.length,
              from: 1,
              to: clientesData.data.length
            } : undefined,
            selectable: false,
            searchable: true, // Isso permitirá que a tabela se registre no header
            searchPlaceholder: 'Refinar busca...',
            searchField: searchField, // Manter o campo selecionado pelo usuário
            searchFields: [
              { key: 'id', label: 'ID' },
              { key: 'cnpj', label: 'CNPJ' },
              { key: 'razao_social', label: 'Razão Social' },
              { key: 'nome_fantasia', label: 'Nome Fantasia' },
              { key: 'email', label: 'Email' },
              { key: 'status', label: 'Status' }
            ],
            sortable: true,
            sortColumn: tableFilters.sortColumn,
            sortDirection: tableFilters.sortDirection,
            emptyMessage: 'Nenhum cliente encontrado para esta busca.',
          }}
          onRowClick={handleRowClick}
          onRefresh={refetch}
          onSort={(column: string, direction: 'asc' | 'desc') => {
            tableFilters.setSort(column, direction);
          }}
          onSearch={(_term, _field) => {
             // O header já atualiza o searchValue, o que causará o re-render deste componente
             // e disparará o useClientes novamente.
          }}
        />
      </div>
    </div>
  );
};

export default DashboardSearchResult;
