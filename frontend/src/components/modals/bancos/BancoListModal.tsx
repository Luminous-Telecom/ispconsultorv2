import React, { useState } from 'react';
import { useBancos, useDeleteBanco } from '../../../hooks/useBancos';
import DataTable from '../../common/DataTable';
import TableFilters from '../../common/TableFilters';
import DraggableModal from '../../common/DraggableModal';
import ModalHeaderActions from '../../common/ModalHeaderActions';
import { BancoCreateModal } from './index';
import { Banco } from '../../../types';

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
      action: (selectedItems: Banco[]) => {
        if (selectedItems.length > 0) {
        }
      }
    },
    {
      label: 'Excluir',
      action: (selectedItems: Banco[]) => {
        if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} banco(s)?`)) {
          selectedItems.forEach(item => handleDelete(item.id));
        }
      }
    }
  ];

  // Ações para o header do modal usando componente reutilizável
  const headerActions = (
    <ModalHeaderActions
      bulkActions={bulkActions}
      selectedItems={selectedItems}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar por nome do banco..."
      limit={limit}
      onLimitChange={setLimit}
      pagination={bancosData?.pagination}
      onPageChange={setPage}
      onRefresh={() => refetch()}
    />
  );

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      headerActions={headerActions}
    >
      <div style={{ paddingLeft: '0.5rem' }}>
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
