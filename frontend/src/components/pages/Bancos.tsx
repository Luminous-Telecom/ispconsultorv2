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

  // Definição das colunas da tabela
  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (banco: Banco) => <code className="text-primary">#{banco.id}</code>
    },
    {
      key: 'nome',
      label: 'Nome',
      render: (banco: Banco) => <strong>{banco.nome}</strong>
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (banco: Banco) => (
        <span className={`badge ${getTipoBadgeClass(banco.tipo)}`}>
          {banco.tipo ? banco.tipo.charAt(0).toUpperCase() + banco.tipo.slice(1) : 'Desconhecido'}
        </span>
      )
    },
    {
      key: 'url',
      label: 'URL',
      render: (banco: Banco) => (
        <a href={banco.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
          <i className="bi bi-box-arrow-up-right"></i> {banco.url}
        </a>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (banco: Banco) => (
        <span className={`badge ${banco.ativo ? 'bg-success' : 'bg-danger'}`}>
          {banco.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'data_criacao',
      label: 'Data de Criação',
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
        <h1 className="h2">Bancos</h1>
        <div className="btn-group" role="group">
          <Link to="/bancos/create" className="btn btn-primary">
            <i className="bi bi-plus"></i> Novo Banco
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <TableFilters
        fields={[
          {
            name: 'search',
            label: 'Buscar',
            type: 'text',
            placeholder: 'Nome do banco',
            value: search,
            onChange: setSearch
          },
          {
            name: 'tipo',
            label: 'Tipo',
            type: 'select',
            value: tipo,
            onChange: setTipo,
            options: [
              { value: '', label: 'Todos' },
              { value: 'efi', label: 'EFI' },
              { value: 'asaas', label: 'ASAAS' },
              { value: 'tradicional', label: 'Tradicional' }
            ]
          }
        ]}
        onFilter={handleFilter}
        onReset={handleReset}
        showResetButton={true}
      />

      {/* Tabela de Bancos */}
      <DataTable
        columns={columns}
        data={bancosData?.data || []}
        isLoading={isLoading}
        pagination={bancosData?.pagination}
        limit={limit}
        setLimit={setLimit}
        setPage={setPage}
        emptyMessage="Nenhum banco encontrado"
        actions={renderActions}
      />
    </>
  );
};

export default Bancos;