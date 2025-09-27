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
    setPage(1); // Voltar para primeira página ao ordenar
  };

  // Função para ordenar os dados localmente
  const getSortedData = () => {
    if (!clientesData?.data || !sortColumn) {
      return clientesData?.data || [];
    }

    return [...clientesData.data].sort((a, b) => {
      let aValue = (a as any)[sortColumn];
      let bValue = (b as any)[sortColumn];

      // Converter para string se necessário para comparação
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }

      // Converter datas se necessário
      if (sortColumn.includes('data') || sortColumn.includes('created_at')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Converter números se necessário
      if (sortColumn.includes('valor') || sortColumn.includes('total')) {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      // Tratar valores nulos/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
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

  return (
    <>
      {/* Tabela de Clientes com controles integrados */}
      <DataTable
        columns={columns}
        data={getSortedData()}
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
        onRefresh={refetch}
      />
    </>
  );
};

export default Clientes;