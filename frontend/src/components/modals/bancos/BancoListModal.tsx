import React, { useState } from 'react';
import { useBancos, useDeleteBanco } from '../../../hooks/useBancos';
import DraggableModal from '../../common/DraggableModal';
import { BancoCreateModal } from './index';
import BancoEditModal from './BancoEditModal';
import { Banco } from '../../../types';
import { Table, TableConfig } from '../../tables';

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

  // Configuração da tabela unificada
  const tableConfig: TableConfig = {
    data: bancosData?.data || [],
    loading: isLoading,
    columns: [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '80px',
        render: (item: Banco) => <span>{item.id}</span>
      },
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
        width: '100px',
        render: (item: Banco) => <span className="text-muted">{getCodigoBanco(item.tipo_banco)}</span>
      },
      {
        key: 'tipo_banco',
        label: 'Tipo',
        sortable: true,
        width: '120px',
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
        width: '120px',
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
        width: '100px',
        render: (item: Banco) => (
          <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
            {item.ativo ? 'Ativo' : 'Inativo'}
          </span>
        )
      }
    ],
    pagination: {
      current_page: page,
      last_page: bancosData?.pagination?.last_page || 1,
      per_page: limit,
      total: bancosData?.pagination?.total || 0,
      from: bancosData?.pagination?.from || (page - 1) * limit + 1,
      to: bancosData?.pagination?.to || Math.min(page * limit, bancosData?.pagination?.total || 0)
    },
    bulkActions: onSelectBanco ? [] : [
      {
        key: 'create',
        label: 'Novo',
        icon: 'plus',
        variant: 'primary',
        onClick: () => setShowCreateModal(true)
      },
      {
        key: 'edit',
        label: 'Editar',
        icon: 'pencil',
        variant: 'primary',
        onClick: (selectedItems: Banco[]) => {
          if (selectedItems.length === 1) {
            setSelectedBancoId(selectedItems[0].id);
            setShowEditModal(true);
          }
        },
        disabled: (selectedItems: Banco[]) => selectedItems.length !== 1
      },
      {
        key: 'delete',
        label: 'Excluir',
        icon: 'trash',
        variant: 'danger',
        onClick: (selectedItems: Banco[]) => {
          if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} banco(s)?`)) {
            selectedItems.forEach(item => handleDelete(item.id));
          }
        }
      }
    ],
    searchable: true,
    searchPlaceholder: 'Buscar por nome do banco...',
    sortable: true,
    selectable: true,
    multiSelect: false, // Sempre seleção única
    emptyMessage: 'Nenhum banco encontrado'
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


  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      modalId="banco-list-modal"
      className="no-padding"
    >
      <div>
        <Table
          config={tableConfig}
          onSort={(column: string, direction: 'asc' | 'desc') => {
            setSortColumn(column);
            setSortDirection(direction);
          }}
          onSelectionChange={(selectedItems) => {
            setSelectedItems(selectedItems);
          }}
          onRefresh={() => refetch()}
          className="banco-list-table"
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
