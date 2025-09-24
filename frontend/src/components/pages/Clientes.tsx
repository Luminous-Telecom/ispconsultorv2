import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClientes, useDeleteCliente } from '../../hooks/useClientes';
import DataTable from '../common/DataTable';

interface Cliente {
  id: number;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  email: string;
  whatsapp?: string;
  ativo: boolean;
}

const Clientes: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Hooks para gerenciar clientes
  const { data: clientesData, isLoading, refetch } = useClientes({
    search: search || undefined,
    ativo: status ? status === 'ativo' : undefined,
    page,
    limit
  });

  const deleteClienteMutation = useDeleteCliente();

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleDelete = async (clienteId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      deleteClienteMutation.mutate(clienteId);
    }
  };

  // Definição das colunas da tabela
  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (cliente: Cliente) => <code className="text-primary">#{cliente.id}</code>
    },
    {
      key: 'cnpj',
      label: 'CNPJ',
      render: (cliente: Cliente) => cliente.cnpj
    },
    {
      key: 'razao_social',
      label: 'Razão Social',
      render: (cliente: Cliente) => <strong>{cliente.razao_social}</strong>
    },
    {
      key: 'nome_fantasia',
      label: 'Nome Fantasia',
      render: (cliente: Cliente) => cliente.nome_fantasia || '-'
    },
    {
      key: 'email',
      label: 'Email',
      render: (cliente: Cliente) => cliente.email
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      render: (cliente: Cliente) => cliente.whatsapp || '-'
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (cliente: Cliente) => (
        <span className={`badge ${cliente.ativo ? 'bg-success' : 'bg-danger'}`}>
          {cliente.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    }
  ];

  // Renderizar ações da tabela
  const renderActions = (cliente: Cliente) => (
    <div className="btn-group btn-group-sm" role="group">
      <Link 
        to={`/clientes/${cliente.id}/edit`} 
        className="btn btn-outline-warning"
        title="Editar"
      >
        <i className="bi bi-pencil"></i>
      </Link>
      <button 
        type="button" 
        className="btn btn-outline-danger"
        title="Excluir"
        onClick={() => handleDelete(cliente.id)}
        disabled={deleteClienteMutation.isPending}
      >
        <i className="bi bi-trash"></i>
      </button>
    </div>
  );

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Clientes</h1>
        <div className="btn-group" role="group">
          <Link to="/clientes/create" className="btn btn-primary">
            <i className="bi bi-plus"></i> Novo Cliente
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleFilter}>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="search" className="form-label">Buscar</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="search" 
                    name="search" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nome, CNPJ ou email"
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="status" className="form-label">Status</label>
                  <select 
                    className="form-select" 
                    id="status" 
                    name="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <div className="col-md-2">
                <div className="mb-3">
                  <label className="form-label">&nbsp;</label>
                  <div className="d-grid">
                    <button type="submit" className="btn btn-outline-primary">
                      <i className="bi bi-search"></i> Filtrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <DataTable
        columns={columns}
        data={clientesData?.data || []}
        isLoading={isLoading}
        pagination={clientesData?.pagination}
        limit={limit}
        setLimit={setLimit}
        setPage={setPage}
        emptyMessage="Nenhum cliente encontrado"
        actions={renderActions}
      />
    </>
  );
};

export default Clientes;