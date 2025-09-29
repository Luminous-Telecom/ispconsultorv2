import React, { useState } from 'react';
import { useBancos, useDeleteBanco } from '../../../hooks/useBancos';
import DataTable from '../../common/DataTable';
import TableFilters from '../../common/TableFilters';
import DraggableModal from '../../common/DraggableModal';
import { BancoCreateModal } from './index';

interface Banco {
  id: number;
  nome: string;
  tipo: 'tradicional' | 'efi' | 'asaas';
  url: string;
  ativo: boolean;
  data_criacao: string;
}

interface BancoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectBanco?: (banco: Banco) => void;
  title?: string;
}

const BancoListModal: React.FC<BancoListModalProps> = ({ 
  show, 
  onClose, 
  onSelectBanco,
  title = "Selecionar Banco"
}) => {
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

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

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'efi': return 'EFI';
      case 'asaas': return 'ASAAS';
      case 'tradicional': return 'Tradicional';
      default: return tipo;
    }
  };


  const handleDelete = async (bancoId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este banco?')) {
      try {
        await deleteBancoMutation.mutateAsync(bancoId);
        refetch();
      } catch (error) {
        console.error('Erro ao excluir banco:', error);
      }
    }
  };

  const handleRowClick = (banco: Banco) => {
    if (onSelectBanco) {
      onSelectBanco(banco);
      onClose();
    }
  };

  const columns = [
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (item: Banco) => (
        <div className="fw-bold">{item.nome}</div>
      )
    },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
      render: (item: Banco) => (
        <span className={`badge ${getTipoBadgeClass(item.tipo)}`}>
          {getTipoLabel(item.tipo)}
        </span>
      )
    },
    {
      key: 'url',
      label: 'URL',
      sortable: false,
      render: (item: Banco) => (
        <span className="text-muted small">{item.url}</span>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      render: (item: Banco) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'data_criacao',
      label: 'Data de Criação',
      sortable: true,
      render: (item: Banco) => (
        <span className="text-nowrap">
          {new Date(item.data_criacao).toLocaleDateString('pt-BR')}
        </span>
      )
    }
  ];

  const bulkActions = onSelectBanco ? [] : [
    {
      label: 'Novo Banco',
      action: () => {
        setShowCreateModal(true);
      }
    },
    {
      label: 'Editar',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          console.log('Editar banco:', selectedItems[0]);
        }
      }
    },
    {
      label: 'Excluir',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} banco(s)?`)) {
          selectedItems.forEach(item => handleDelete(item.id));
        }
      }
    }
  ];

  // Ações para o header do modal
  const headerActions = (
    <>
      {/* Botões de ação */}
      <div className="d-flex" style={{ gap: '8px' }}>
        {bulkActions.map((bulkAction, index) => {
          const isNewButton = bulkAction.label.toLowerCase().includes('nova') || bulkAction.label.toLowerCase().includes('novo');
          const isDisabled = !isNewButton && selectedItems.length === 0;
          
          return (
            <button
              key={index}
              className="btn btn-sm btn-primary"
              onClick={() => {
                if (!isDisabled) {
                  bulkAction.action(selectedItems);
                }
              }}
              disabled={isDisabled}
              style={{ flexShrink: 0 }}
            >
              {bulkAction.label}
            </button>
          );
        })}
      </div>

      {/* Filtros e controles */}
      <div className="d-flex align-items-center gap-2">
        {/* Busca */}
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Buscar por nome do banco..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '200px', height: '32px' }}
        />
        
        {/* Seletor de linhas por página */}
        <select 
          className="form-select form-select-sm" 
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value))}
          style={{ width: '100px', height: '32px', cursor: 'pointer' }}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>

        {/* Paginação compacta */}
        <div className="d-flex align-items-center gap-1">
          <button 
            className="btn btn-outline-secondary btn-sm" 
            onClick={() => setPage(1)}
            disabled={!bancosData?.pagination || bancosData.pagination.current_page <= 1}
          >
            <i className="bi bi-chevron-double-left"></i>
          </button>
          <button 
            className="btn btn-outline-secondary btn-sm" 
            onClick={() => setPage(page - 1)}
            disabled={!bancosData?.pagination || bancosData.pagination.current_page <= 1}
          >
            <i className="bi bi-chevron-left"></i>
          </button>
          <span className="small text-muted mx-2">
            {bancosData?.pagination ? `${bancosData.pagination.from} - ${bancosData.pagination.to} / ${bancosData.pagination.total}` : '0 - 0 / 0'}
          </span>
          <button 
            className="btn btn-outline-secondary btn-sm" 
            onClick={() => setPage(page + 1)}
            disabled={!bancosData?.pagination || bancosData.pagination.current_page >= bancosData.pagination.last_page}
          >
            <i className="bi bi-chevron-right"></i>
          </button>
          <button 
            className="btn btn-outline-secondary btn-sm" 
            onClick={() => setPage(bancosData?.pagination?.last_page || 1)}
            disabled={!bancosData?.pagination || bancosData.pagination.current_page >= bancosData.pagination.last_page}
          >
            <i className="bi bi-chevron-double-right"></i>
          </button>
        </div>

        {/* Botão de refresh */}
        <button 
          className="btn btn-outline-secondary btn-sm"
          onClick={() => refetch()}
          title="Recarregar dados"
        >
          <i className="bi bi-arrow-clockwise"></i>
        </button>
      </div>
    </>
  );

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      headerActions={headerActions}
    >
      <div className="d-flex flex-column h-100">
        {/* Tabela */}
        <div className="flex-grow-1">
          <DataTable
            data={bancosData?.data || []}
            columns={columns}
            isLoading={isLoading}
            pagination={{
              from: bancosData?.pagination?.from || (page - 1) * limit + 1,
              to: bancosData?.pagination?.to || Math.min(page * limit, bancosData?.pagination?.total || 0),
              total: bancosData?.pagination?.total || 0,
              current_page: bancosData?.pagination?.current_page || page,
              last_page: bancosData?.pagination?.last_page || 1
            }}
            limit={limit}
            setLimit={setLimit}
            setPage={setPage}
            onSort={(column: string, direction: 'asc' | 'desc') => {
              setSortColumn(column);
              setSortDirection(direction);
            }}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            bulkActions={bulkActions}
            onSelectionChange={setSelectedItems}
            searchPlaceholder="Buscar por nome do banco..."
            onSearch={setSearch}
            emptyMessage="Nenhum banco encontrado"
            showHeader={false}
          />
        </div>
      </div>

      {/* Modal de Criação */}
      <BancoCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch();
          setShowCreateModal(false);
        }}
      />
    </DraggableModal>
  );
};

export default BancoListModal;
