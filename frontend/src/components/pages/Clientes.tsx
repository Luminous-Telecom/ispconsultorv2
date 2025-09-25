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
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const handleTopoActions = (action: string, selectedItems: any[]) => {
    if (selectedItems.length === 0) return;
    
    switch (action) {
      case 'editar':
        if (selectedItems.length === 1) {
          window.location.href = `/clientes/${selectedItems[0].id}/edit`;
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
      render: (cliente: Cliente) => <code className="text-primary">#{cliente.id}</code>
    },
    {
      key: 'cnpj',
      label: 'CNPJ',
      sortable: true,
      render: (cliente: Cliente) => cliente.cnpj
    },
    {
      key: 'razao_social',
      label: 'Razão Social',
      sortable: true,
      render: (cliente: Cliente) => <strong>{cliente.razao_social}</strong>
    },
    {
      key: 'nome_fantasia',
      label: 'Nome Fantasia',
      sortable: true,
      render: (cliente: Cliente) => cliente.nome_fantasia || '-'
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (cliente: Cliente) => cliente.email
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      sortable: false,
      render: (cliente: Cliente) => cliente.whatsapp || '-'
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
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

          {/* Tabela de Clientes com controles integrados */}
          <DataTable
            columns={columns}
            data={clientesData?.data || []}
            isLoading={isLoading}
            pagination={clientesData?.pagination}
            limit={limit}
            setLimit={setLimit}
            setPage={setPage}
            emptyMessage="Nenhum cliente encontrado"
            searchPlaceholder="Nome, CNPJ ou email"
            onSearch={setSearch}
            bulkActions={[
              {
                label: "Novo",
                action: () => window.location.href = "/clientes/create"
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
        </div>
      </div>
    </div>
  );
};

export default Clientes;