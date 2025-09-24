import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlanoService } from '../../services/planoService';
import { useNotification } from '../../hooks/useNotification';
import DataTable from '../common/DataTable';

interface Plano {
  id: number;
  nome_plano: string;
  descricao?: string;
  valor_mensal: number;
  status: 'ativo' | 'inativo' | 'suspenso';
  data_criacao: string;
}

const Planos: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const { success, error } = useNotification();

  // Query para buscar planos
  const { data: planosData, isLoading, refetch } = useQuery({
    queryKey: ['planos', search, status, page, limit],
    queryFn: () => PlanoService.list({
      search: search || undefined,
      status: status || undefined,
      page,
      limit
    }),
    placeholderData: (previousData) => previousData,
  });

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

  const handleDelete = async (planoId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este plano?')) {
      try {
        await PlanoService.delete(planoId);
        success('Plano excluído com sucesso!');
        refetch();
      } catch (err) {
        error('Erro ao excluir plano');
      }
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
      key: 'valor_mensal',
      label: 'Valor Mensal',
      render: (plano: Plano) => (
        <strong>R$ {plano.valor_mensal.toFixed(2).replace('.', ',')}</strong>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (plano: Plano) => (
        <span className={`badge ${getStatusBadgeClass(plano.status)}`}>
          {plano.status.charAt(0).toUpperCase() + plano.status.slice(1)}
        </span>
      )
    },
    {
      key: 'data_criacao',
      label: 'Data de Criação',
      render: (plano: Plano) => new Date(plano.data_criacao).toLocaleDateString('pt-BR')
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
      >
        <i className="bi bi-trash"></i>
      </button>
    </div>
  );

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Planos</h1>
        <div className="btn-group" role="group">
          <Link to="/planos/create" className="btn btn-primary">
            <i className="bi bi-plus"></i> Novo Plano
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
                    placeholder="Nome do plano"
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
                    <option value="suspenso">Suspenso</option>
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