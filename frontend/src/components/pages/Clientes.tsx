import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClientes, useDeleteCliente } from '../../hooks/useClientes';
import DataTable from '../common/DataTable';
import TableFilters from '../common/TableFilters';

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

  const handleReset = () => {
    setSearch('');
    setStatus('');
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
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h4 mb-0">
              <i className="bi bi-people me-2"></i>
              Clientes
            </h1>
            <Link to="/clientes/create" className="btn btn-primary">
              <i className="bi bi-plus"></i> Novo Cliente
            </Link>
          </div>
        </div>
        <div className="card-body">

          {/* Filtros */}
          <TableFilters
        fields={[
          {
            name: 'search',
            label: 'Buscar',
            type: 'text',
            placeholder: 'Nome, CNPJ ou email',
            value: search,
            onChange: setSearch
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            value: status,
            onChange: setStatus,
            options: [
              { value: '', label: 'Todos' },
              { value: 'ativo', label: 'Ativo' },
              { value: 'inativo', label: 'Inativo' }
            ]
          }
        ]}
          onFilter={handleFilter}
          onReset={handleReset}
          showResetButton={true}
        />

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
        </div>
      </div>
    </div>
  );
};

export default Clientes;