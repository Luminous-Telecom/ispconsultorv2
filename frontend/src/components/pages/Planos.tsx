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

  // Definição das colunas da tabela
  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (plano: Plano) => <code className="text-primary">#{plano.id}</code>
    },
    {
      key: 'nome_plano',
      label: 'Nome do Plano',
      render: (plano: Plano) => <strong>{plano.nome_plano}</strong>
    },
    {
      key: 'descricao',
      label: 'Descrição',
      render: (plano: Plano) => plano.descricao || '-'
    },
    {
      key: 'tipo_servico',
      label: 'Tipo de Serviço',
      render: (plano: Plano) => (
        <span className="badge bg-info">
          {plano.tipo_servico ? plano.tipo_servico.charAt(0).toUpperCase() + plano.tipo_servico.slice(1) : 'N/A'}
        </span>
      )
    },
    {
      key: 'quantidade_usuarios',
      label: 'Quantidade de Usuários',
      render: (plano: Plano) => (
        <span className="badge bg-secondary">
          {plano.quantidade_usuarios ? plano.quantidade_usuarios.toString() : 'N/A'}
        </span>
      )
    },
    {
      key: 'valor_mensal',
      label: 'Valor',
      render: (plano: Plano) => (
        <strong>R$ {plano.valor_mensal ? Number(plano.valor_mensal).toFixed(2).replace('.', ',') : '0,00'}</strong>
      )
    },
    {
      key: 'periodicidade',
      label: 'Periodicidade',
      render: (plano: Plano) => (
        <span className="badge bg-light text-dark">
          {plano.periodicidade ? plano.periodicidade.charAt(0).toUpperCase() + plano.periodicidade.slice(1) : 'N/A'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (plano: Plano) => (
        <span className={`badge ${getStatusBadgeClass(plano.status)}`}>
          {plano.status ? plano.status.charAt(0).toUpperCase() + plano.status.slice(1) : 'Desconhecido'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Data de Criação',
      render: (plano: Plano) => new Date(plano.created_at).toLocaleDateString('pt-BR')
    }
  ];

  // Renderizar ações da tabela
  const renderActions = (plano: Plano) => (
    <div className="btn-group btn-group-sm" role="group">
      <Link 
        to={`/planos/${plano.id}/edit`} 
        className="btn btn-outline-warning"
        title="Editar"
      >
        <i className="bi bi-pencil"></i>
      </Link>
      <button 
        type="button" 
        className="btn btn-outline-danger"
        title="Excluir"
        onClick={() => handleDelete(plano.id)}
        disabled={deletePlanoMutation.isPending}
      >
        <i className="bi bi-trash"></i>
      </button>
    </div>
  );

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <div className="btn-group" role="group">
          <Link to="/planos/create" className="btn btn-primary">
            <i className="bi bi-plus"></i> Novo Plano
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
            placeholder: 'Nome do plano',
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
              { value: 'inativo', label: 'Inativo' },
              { value: 'suspenso', label: 'Suspenso' }
            ]
          }
        ]}
        onFilter={handleFilter}
        onReset={handleReset}
        showResetButton={true}
      />

      {/* Tabela de Planos */}
      <DataTable
        columns={columns}
        data={planosData?.data || []}
        isLoading={isLoading}
        pagination={planosData?.pagination}
        limit={limit}
        setLimit={setLimit}
        setPage={setPage}
        emptyMessage="Nenhum plano encontrado"
        actions={renderActions}
      />
    </>
  );
};

export default Planos;