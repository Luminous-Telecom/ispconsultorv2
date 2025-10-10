import React, { useState } from 'react';
import { useBancos, useDeleteBanco } from '../../../hooks/useBancos';
import DataTable from '../../common/DataTable';
import TableFilters from '../../common/TableFilters';
import DraggableModal from '../../common/DraggableModal';
import ModalHeaderActions from '../../common/ModalHeaderActions';
import { BancoCreateModal } from './index';
import BancoEditModal from './BancoEditModal';
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
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBancoId, setSelectedBancoId] = useState<number | null>(null);
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

  // Helper para exibir tipo do banco formatado
  const getTipoBancoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      'efi': 'EFI',
      'asaas': 'Asaas'
    };
    return tipos[tipo] || tipo;
  };

  // Helper para obter código do banco baseado no tipo
  const getCodigoBanco = (tipo: string) => {
    const codigos: Record<string, string> = {
      'efi': '364',
      'asaas': '461'
    };
    return codigos[tipo] || '-';
  };

  const columns = [
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (item: Banco) => <div className="fw-bold">{item.nome}</div>
    },
    {
      key: 'codigo',
      label: 'Código',
      sortable: true,
      render: (item: Banco) => <span className="text-muted">{getCodigoBanco(item.tipo_banco)}</span>
    },
    {
      key: 'tipo_banco',
      label: 'Tipo',
      sortable: true,
      render: (item: Banco) => (
        <span className="badge bg-primary">
          {getTipoBancoLabel(item.tipo_banco)}
        </span>
      )
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: false,
      render: (item: Banco) => (
        <div className="text-truncate" style={{ maxWidth: '200px' }} title={item.descricao || ''}>
          {item.descricao || '-'}
        </div>
      )
    },
    {
      key: 'sandbox',
      label: 'Ambiente',
      sortable: true,
      render: (item: Banco) => (
        <span className={`badge ${item.sandbox ? 'bg-warning text-dark' : 'bg-success'}`}>
          {item.sandbox ? 'Sandbox' : 'Produção'}
        </span>
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
        if (selectedItems.length === 1) {
          setSelectedBancoId(selectedItems[0].id);
          setShowEditModal(true);
        }
      },
      disabled: (selectedItems: Banco[]) => selectedItems.length !== 1
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

      {/* Modal de Edição */}
      <BancoEditModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedBancoId(null);
        }}
        bancoId={selectedBancoId}
        onSuccess={() => {
          setShowEditModal(false);
          setSelectedBancoId(null);
          refetch();
        }}
      />
    </DraggableModal>
  );
};

export default BancoListModal;
