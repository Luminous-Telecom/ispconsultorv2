import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlanoService } from '../../services/planoService';
import { useNotification } from '../../hooks/useNotification';

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
  const { success, error } = useNotification();

  // Query para buscar planos
  const { data: planosData, isLoading, refetch } = useQuery({
    queryKey: ['planos', search, status, page],
    queryFn: () => PlanoService.list({
      search: search || undefined,
      status: status || undefined,
      page,
      limit: 15
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
                    placeholder="Nome do plano ou descrição"
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
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome do Plano</th>
                  <th>Descrição</th>
                  <th>Valor Mensal</th>
                  <th>Status</th>
                  <th>Data de Criação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Carregando...</span>
                      </div>
                    </td>
                  </tr>
                ) : planosData?.data && planosData.data.length > 0 ? (
                  planosData.data.map((plano: any) => (
                    <tr key={plano.id}>
                      <td>
                        <code className="text-primary">#{plano.id}</code>
                      </td>
                      <td>
                        <strong>{plano.nome_plano}</strong>
                      </td>
                      <td>{plano.descricao || '-'}</td>
                      <td>
                        <strong>R$ {parseFloat(plano.valor_mensal).toFixed(2).replace('.', ',')}</strong>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(plano.status)}`}>
                          {plano.status.charAt(0).toUpperCase() + plano.status.slice(1)}
                        </span>
                      </td>
                      <td>{new Date(plano.data_criacao).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div className="btn-group btn-group-sm" role="group">
                          <Link 
                            to={`/planos/${plano.id}`} 
                            className="btn btn-outline-info"
                            title="Visualizar"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
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
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center">Nenhum plano encontrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {planosData?.pagination && (
            <div className="d-flex justify-content-center mt-3">
              <nav aria-label="Paginação de planos">
                <ul className="pagination">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Anterior
                    </button>
                  </li>
                  
                  {Array.from({ length: planosData.pagination.last_page }, (_, i) => i + 1).map((pageNum) => (
                    <li key={pageNum} className={`page-item ${page === pageNum ? 'active' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </li>
                  ))}
                  
                  <li className={`page-item ${page === planosData.pagination.last_page ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setPage(page + 1)}
                      disabled={page === planosData.pagination.last_page}
                    >
                      Próximo
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Planos;