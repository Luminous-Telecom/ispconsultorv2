import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BancoService } from '../../services/bancoService';
import { useNotification } from '../../hooks/useNotification';

interface Banco {
  id: number;
  nome: string;
  tipo: 'tradicional' | 'efi' | 'asaas';
  url: string;
  ativo: boolean;
  data_criacao: string;
}

const Bancos: React.FC = () => {
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [page, setPage] = useState(1);
  const { success, error } = useNotification();

  // Query para buscar bancos
  const { data: bancosData, isLoading, refetch } = useQuery({
    queryKey: ['bancos', search, tipo, page],
    queryFn: () => BancoService.list({
      search: search || undefined,
      tipo_banco: tipo || undefined,
      page,
      limit: 15
    }),
    placeholderData: (previousData) => previousData,
  });

  const getTipoBadgeClass = (tipo: string) => {
    switch (tipo) {
      case 'bancario': return 'bg-primary';
      case 'efi': return 'bg-info';
      case 'asaas': return 'bg-warning';
      case 'outros': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'bancario': return 'Banco Tradicional';
      case 'efi': return 'EFI (Gerencianet)';
      case 'asaas': return 'ASAAS';
      case 'outros': return 'Outros';
      default: return tipo;
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleDelete = async (bancoId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este banco?')) {
      try {
        await BancoService.delete(bancoId);
        success('Banco excluído com sucesso!');
        refetch();
      } catch (err) {
        error('Erro ao excluir banco');
      }
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Bancos</h1>
        <div className="btn-group" role="group">
          <Link to="/bancos/create" className="btn btn-primary">
            <i className="bi bi-plus"></i> Novo Banco
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
                    placeholder="Nome do banco"
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="tipo" className="form-label">Tipo</label>
                  <select 
                    className="form-select" 
                    id="tipo" 
                    name="tipo"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="bancario">Banco Tradicional</option>
                    <option value="efi">EFI (Gerencianet)</option>
                    <option value="asaas">ASAAS</option>
                    <option value="outros">Outros</option>
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

      {/* Tabela de Bancos */}
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Sandbox</th>
                  <th>Status</th>
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
                ) : bancosData?.data && bancosData.data.length > 0 ? (
                  bancosData.data.map((banco: any) => (
                    <tr key={banco.id}>
                      <td>
                        <code className="text-primary">#{banco.id}</code>
                      </td>
                      <td>
                        <strong>{banco.nome}</strong>
                      </td>
                      <td>
                        <span className={`badge ${getTipoBadgeClass(banco.tipo_banco)}`}>
                          {getTipoLabel(banco.tipo_banco)}
                        </span>
                      </td>
                      <td>
                        {banco.descricao ? (
                          banco.descricao.length > 50 
                            ? `${banco.descricao.substring(0, 50)}...` 
                            : banco.descricao
                        ) : '-'}
                      </td>
                      <td>
                        <span className={`badge ${banco.sandbox ? 'bg-warning' : 'bg-success'}`}>
                          {banco.sandbox ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${banco.ativo ? 'bg-success' : 'bg-danger'}`}>
                          {banco.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm" role="group">
                          <Link 
                            to={`/bancos/${banco.id}`} 
                            className="btn btn-outline-info"
                            title="Visualizar"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          <Link 
                            to={`/bancos/${banco.id}/edit`} 
                            className="btn btn-outline-warning"
                            title="Editar"
                          >
                            <i className="bi bi-pencil"></i>
                          </Link>
                          <button 
                            type="button" 
                            className="btn btn-outline-danger"
                            title="Excluir"
                            onClick={() => handleDelete(banco.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center">Nenhum banco encontrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {bancosData?.pagination && (
            <div className="d-flex justify-content-center mt-3">
              <nav aria-label="Paginação de bancos">
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
                  
                  {Array.from({ length: bancosData.pagination.last_page }, (_, i) => i + 1).map((pageNum) => (
                    <li key={pageNum} className={`page-item ${page === pageNum ? 'active' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </li>
                  ))}
                  
                  <li className={`page-item ${page === bancosData.pagination.last_page ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setPage(page + 1)}
                      disabled={page === bancosData.pagination.last_page}
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

export default Bancos;