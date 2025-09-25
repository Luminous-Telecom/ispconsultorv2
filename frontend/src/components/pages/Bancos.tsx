import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBancos, useDeleteBanco } from '../../hooks/useBancos';
import DataTable from '../common/DataTable';
import TableFilters from '../common/TableFilters';

interface Banco {
  id: number;
  nome: string;
  tipo: 'tradicional' | 'efi' | 'asaas';
  url: string;
  ativo: boolean;
  data_criacao: string;
}

const Bancos: React.FC = () => {
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Query para buscar bancos
  const { data: bancosData, isLoading, refetch } = useBancos({
    search: search || undefined,
    tipo_banco: tipo || undefined,
    page,
    limit
  });

  const deleteBancoMutation = useDeleteBanco();

  const getTipoBadgeClass = (tipo: string) => {
    switch (tipo) {
      case 'efi': return 'bg-primary';
      case 'asaas': return 'bg-info';
      case 'tradicional': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setSearch('');
    setTipo('');
    setPage(1);
    refetch();
  };

  const handleDelete = async (bancoId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este banco?')) {
      deleteBancoMutation.mutate(bancoId);
    }
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const handleTopoActions = (action: string, selectedItems: any[]) => {
    if (selectedItems.length === 0) return;
    
    switch (action) {
      case 'editar':
        if (selectedItems.length === 1) {
          window.location.href = `/bancos/${selectedItems[0].id}/edit`;
        }
        break;
      case 'deletar':
        if (selectedItems.length === 1) {
          handleDelete(selectedItems[0].id);
        }
        break;
    }
  };

  // Definição das colunas da tabela
  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (banco: Banco) => <code className="text-primary">#{banco.id}</code>
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (banco: Banco) => <strong>{banco.nome}</strong>
    },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
      render: (banco: Banco) => (
        <span className={`badge ${getTipoBadgeClass(banco.tipo)}`}>
          {banco.tipo ? banco.tipo.charAt(0).toUpperCase() + banco.tipo.slice(1) : 'Desconhecido'}
        </span>
      )
    },
    {
      key: 'url',
      label: 'URL',
      sortable: false,
      render: (banco: Banco) => (
        <a href={banco.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
          <i className="bi bi-box-arrow-up-right"></i> {banco.url}
        </a>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      render: (banco: Banco) => (
        <span className={`badge ${banco.ativo ? 'bg-success' : 'bg-danger'}`}>
          {banco.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'data_criacao',
      label: 'Data de Criação',
      sortable: true,
      render: (banco: Banco) => new Date(banco.data_criacao).toLocaleDateString('pt-BR')
    }
  ];

  // Renderizar ações da tabela
  const renderActions = (banco: Banco) => (
    <div className="btn-group btn-group-sm" role="group">
      <Link 
        to={`/bancos/${banco.id}/edit`} 
        className="btn btn-outline-warning"
        title="Editar"
      >
        <i className="bi bi-pencil"></i>
      </Link>
      <button 
        type="button" 
        className="btn btn-outline-danger"
        title="Excluir"
        onClick={() => handleDelete(banco.id)}
        disabled={deleteBancoMutation.isPending}
      >
        <i className="bi bi-trash"></i>
      </button>
    </div>
  );

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <div className="btn-group" role="group">
          <Link to="/bancos/create" className="btn btn-primary">
            <i className="bi bi-plus"></i> Novo Banco
          </Link>
        </div>
      </div>

      {/* Tabela de Bancos com controles integrados */}
      <DataTable
        columns={columns}
        data={bancosData?.data || []}
        isLoading={isLoading}
        pagination={bancosData?.pagination}
        limit={limit}
        setLimit={setLimit}
        setPage={setPage}
        emptyMessage="Nenhum banco encontrado"
        searchPlaceholder="Nome do banco"
        onSearch={setSearch}
        bulkActions={[
          {
            label: "Novo",
            action: () => window.location.href = "/bancos/create"
          },
          {
            label: "Editar",
            action: (selectedItems) => handleTopoActions('editar', selectedItems)
          },
          {
            label: "Deletar",
            action: (selectedItems) => handleTopoActions('deletar', selectedItems)
          }
        ]}
        onSort={handleSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
      />
    </>
  );
};

export default Bancos;