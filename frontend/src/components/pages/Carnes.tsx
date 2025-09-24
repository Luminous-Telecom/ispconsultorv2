import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CarneService } from '../../services/carneService';
import { getApiUrl } from '../../config/api';
import { useNotification } from '../../hooks/useNotification';

const Carnes: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { success, error, warning } = useNotification() as any;

  const { data: carnesData, isLoading, refetch } = useQuery({
    queryKey: ['carnes', search, status, page],
    queryFn: () => CarneService.list({
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
      case 'cancelado': return 'bg-danger';
      case 'pago': return 'bg-primary';
      case 'pendente': return 'bg-warning';
      case 'parcial': return 'bg-warning';
      case 'registrado': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleDelete = async (carneId: number) => {
    try {
      // Buscar detalhes para verificar parcelas pagas
      const carne = await CarneService.getById(carneId);
      const temParcelasPagas = Array.isArray((carne as any).parcelas)
        ? (carne as any).parcelas.some((p: any) => p.pago === true)
        : false;

      if (temParcelasPagas) {
        warning ? warning('Não é possível excluir carnê com parcelas pagas.') : error('Não é possível excluir carnê com parcelas pagas.');
        return;
      }

      if (window.confirm('Tem certeza que deseja excluir este carnê?')) {
        await CarneService.delete(carneId);
        success('Carnê excluído com sucesso!');
        refetch();
      }
    } catch (err) {
      error('Erro ao excluir carnê');
    }
  };

  const handleImprimir = async (carneId: number) => {
    try {
      const blob = await CarneService.imprimir(carneId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (err) {
      error('Erro ao imprimir carnê');
    }
  };

  const handlePdf = async (carneId: number) => {
    try {
      const blob = await CarneService.gerarPdf(carneId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (err) {
      error('Erro ao gerar PDF do carnê');
    }
  };

  const pagination = carnesData?.pagination;
  const totalPages = pagination ? pagination.last_page : 1;
  const currentPage = pagination ? pagination.current_page : 1;

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Carnês</h1>
        <div className="btn-group" role="group">
          <Link to="/carnes/create" className="btn btn-primary">
            <i className="bi bi-plus"></i> Gerar Carnê
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
                    placeholder="Número do carnê ou cliente"
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
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
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

      {/* Tabela de Carnês */}
      <div className="card">
        <div className="card-body p-2">
          <div className="table-responsive">
            <table className="table table-striped table-sm">
              <thead>
                <tr>
                  <th className="py-1 px-2">ID</th>
                  <th className="py-1 px-2">Carnet ID</th>
                  <th className="py-1 px-2">Número do Carnê</th>
                  <th className="py-1 px-2">Cliente</th>
                  <th className="py-1 px-2">Valor Total</th>
                  <th className="py-1 px-2">Parcelas Pagas</th>
                  <th className="py-1 px-2">Status</th>
                  <th className="py-1 px-2">Data de Criação</th>
                  <th className="py-1 px-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center">
                      <div className="spinner-border" role="status">
                        <span className="visualmente-hidden">Carregando...</span>
                      </div>
                    </td>
                  </tr>
                ) : carnesData?.data && carnesData.data.length > 0 ? (
                  carnesData.data.map((carne: any) => (
                    <tr key={carne.id}>
                      <td className="py-1 px-2">
                        <code className="text-primary">#{carne.id}</code>
                      </td>
                      <td className="py-1 px-2">
                        <code className="text-info">
                          {carne.carnet_id || 'Não gerado'}
                        </code>
                      </td>
                      <td className="py-1 px-2">
                        <strong>{carne.numero_carne}</strong>
                      </td>
                      <td className="py-1 px-2">{carne.cliente?.razao_social || 'N/A'}</td>
                      <td className="py-1 px-2">
                        <strong>R$ {parseFloat(carne.valor_total).toFixed(2).replace('.', ',')}</strong>
                      </td>
                      <td className="py-1 px-2">
                        <span className="badge bg-success">{carne.parcelas_pagas || 0}</span>
                        <span className="text-muted"> / </span>
                        <span className="badge bg-secondary">{carne.quantidade_parcelas}</span>
                      </td>
                      <td className="py-1 px-2">
                        <span className={`badge ${getStatusBadgeClass(carne.status)}`}>
                          {carne.status.charAt(0).toUpperCase() + carne.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-1 px-2">{new Date(carne.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="py-1 px-2">
                        <div className="btn-group btn-group-sm" role="group">
                          <Link 
                            to={`/carne-parcelas?carne_id=${carne.id}`} 
                            className="btn btn-outline-info"
                            title="Ver Parcelas"
                          >
                            <i className="bi bi-list-ol"></i>
                          </Link>
                          <button 
                            type="button" 
                            className="btn btn-outline-primary"
                            title="Imprimir"
                            onClick={() => window.open(getApiUrl(`/api/carnes/${carne.id}/imprimir`), '_blank')}
                          >
                            <i className="bi bi-printer"></i>
                          </button>
                          <Link 
                            to={`/carnes/${carne.id}/edit`} 
                            className="btn btn-outline-warning"
                            title="Editar"
                          >
                            <i className="bi bi-pencil"></i>
                          </Link>
                          <button 
                            type="button" 
                            className="btn btn-outline-danger"
                            title="Excluir"
                            onClick={() => handleDelete(carne.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center">Nenhum carnê encontrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {pagination && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span>
                Página {pagination.current_page} de {pagination.last_page}
              </span>
              <div className="btn-group">
                <button className="btn btn-outline-secondary" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
                <button className="btn btn-outline-secondary" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Próximo</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Carnes;