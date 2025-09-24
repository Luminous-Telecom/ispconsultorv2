import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BancoService } from '../../services/bancoService';
import { useNotification } from '../../hooks/useNotification';
import DataTable from '../common/DataTable';

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
  const [limit, setLimit] = useState(15);
  const { success, error } = useNotification();

  // Query para buscar bancos
  const { data: bancosData, isLoading, refetch } = useQuery({
    queryKey: ['bancos', search, tipo, page, limit],
    queryFn: () => BancoService.list({
      search: search || undefined,
      tipo_banco: tipo || undefined,
      page,
      limit
    }),
    placeholderData: (previousData) => previousData,
  });

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

  // Definição das colunas da tabela
  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (banco: Banco) => <code className="text-primary">#{banco.id}</code>
    },
    {
      key: 'nome',
      label: 'Nome',
      render: (banco: Banco) => <strong>{banco.nome}</strong>
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (banco: Banco) => (
        <span className={`badge ${getTipoBadgeClass(banco.tipo)}`}>
          {banco.tipo.charAt(0).toUpperCase() + banco.tipo.slice(1)}
        </span>
      )
    },
    {
      key: 'url',
      label: 'URL',
      render: (banco: Banco) => (
        <a href={banco.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
          <i className="bi bi-box-arrow-up-right"></i> {banco.url}
        </a>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (banco: Banco) => (
        <span className={`badge ${banco.ativo ? 'bg-success' : 'bg-danger'}`}>
          {banco.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'data_criacao',
      label: 'Data de Criação',
      render: (banco: Banco) => new Date(banco.data_criacao).toLocaleDateString('pt-BR')
    }
  ];

  // Renderizar ações da tabela
  const renderActions = (banco: Banco) => (
    <div className="btn-group btn-group-sm" role="group">
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
  );

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
                    <option value="efi">EFI</option>
                    <option value="asaas">ASAAS</option>
                    <option value="tradicional">Tradicional</option>
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
      <DataTable
        columns={columns}
        data={bancosData?.data || []}
        isLoading={isLoading}
        pagination={bancosData?.pagination}
        limit={limit}
        setLimit={setLimit}
        setPage={setPage}
        emptyMessage="Nenhum banco encontrado"
        actions={renderActions}
      />
    </>
  );
};

export default Bancos;