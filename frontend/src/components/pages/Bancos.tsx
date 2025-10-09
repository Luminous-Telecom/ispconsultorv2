import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBancos, useDeleteBanco } from '../../hooks/useBancos';
import DataTable from '../common/DataTable';
import TableFilters from '../common/TableFilters';
import { Banco } from '../../types';

const Bancos: React.FC = () => {
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
    setPage(1); // Voltar para primeira página ao ordenar
  };

  // Função para ordenar os dados localmente
  const getSortedData = () => {
    if (!bancosData?.data || !sortColumn) {
      return bancosData?.data || [];
    }

    return [...bancosData.data].sort((a, b) => {
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

  return (
    <>
      {/* Tabela de Bancos com controles integrados */}
      <DataTable
        columns={columns}
        data={getSortedData()}
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
        onRefresh={refetch}
      />
    </>
  );
};

export default Bancos;