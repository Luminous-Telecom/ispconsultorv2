import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlanos, useDeletePlano } from '../../hooks/usePlanos';
import DataTable from '../common/DataTable';
import TableFilters from '../common/TableFilters';

interface Plano {
  id: number;
  nome_plano: string;
  descricao?: string;
  tipo_servico: 'internet' | 'telefonia' | 'tv' | 'suporte' | 'infraestrutura' | 'consultoria' | 'outros';
  quantidade_usuarios?: number;
  valor_mensal: number;
  periodicidade?: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal';
  status: 'ativo' | 'inativo' | 'suspenso';
  created_at: string;
}

const Planos: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Query para buscar planos
  const { data: planosData, isLoading, refetch } = usePlanos({
    search: search || undefined,
    status: status || undefined,
    page,
    limit
  });

  const deletePlanoMutation = useDeletePlano();

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-success';
      case 'inativo': return 'bg-danger';
      case 'suspenso': return 'bg-warning';
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
    setStatus('');
    setPage(1);
    refetch();
  };

  const handleDelete = async (planoId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este plano?')) {
      deletePlanoMutation.mutate(planoId);
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
          window.location.href = `/planos/${selectedItems[0].id}/edit`;
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
      render: (plano: Plano) => <code className="text-primary">#{plano.id}</code>
    },
    {
      key: 'nome_plano',
      label: 'Nome do Plano',
      sortable: true,
      render: (plano: Plano) => <strong>{plano.nome_plano}</strong>
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: false,
      render: (plano: Plano) => plano.descricao || '-'
    },
    {
      key: 'tipo_servico',
      label: 'Tipo de Serviço',
      sortable: true,
      render: (plano: Plano) => (
        <span className="badge bg-info">
          {plano.tipo_servico ? plano.tipo_servico.charAt(0).toUpperCase() + plano.tipo_servico.slice(1) : 'N/A'}
        </span>
      )
    },
    {
      key: 'quantidade_usuarios',
      label: 'Quantidade de Usuários',
      sortable: true,
      render: (plano: Plano) => (
        <span className="badge bg-secondary">
          {plano.quantidade_usuarios ? plano.quantidade_usuarios.toString() : 'N/A'}
        </span>
      )
    },
    {
      key: 'valor_mensal',
      label: 'Valor',
      sortable: true,
      render: (plano: Plano) => (
        <strong>R$ {plano.valor_mensal ? Number(plano.valor_mensal).toFixed(2).replace('.', ',') : '0,00'}</strong>
      )
    },
    {
      key: 'periodicidade',
      label: 'Periodicidade',
      sortable: true,
      render: (plano: Plano) => (
        <span className="badge bg-light text-dark">
          {plano.periodicidade ? plano.periodicidade.charAt(0).toUpperCase() + plano.periodicidade.slice(1) : 'N/A'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (plano: Plano) => (
        <span className={`badge ${getStatusBadgeClass(plano.status)}`}>
          {plano.status ? plano.status.charAt(0).toUpperCase() + plano.status.slice(1) : 'Desconhecido'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Data de Criação',
      sortable: true,
      render: (plano: Plano) => new Date(plano.created_at).toLocaleDateString('pt-BR')
    }
  ];

  return (
    <>
      {/* Tabela de Planos com controles integrados */}
      <DataTable
        columns={columns}
        data={planosData?.data || []}
        isLoading={isLoading}
        pagination={planosData?.pagination}
        limit={limit}
        setLimit={setLimit}
        setPage={setPage}
        emptyMessage="Nenhum plano encontrado"
        searchPlaceholder="Nome do plano"
        onSearch={setSearch}
        bulkActions={[
          {
            label: "Novo",
            action: () => window.location.href = "/planos/create"
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

export default Planos;