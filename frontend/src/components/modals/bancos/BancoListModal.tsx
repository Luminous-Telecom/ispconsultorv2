import React, { useState, useMemo } from 'react';
import { useBancos, useDeleteBanco } from '../../../hooks/useBancos';
import { useModalSelect } from '../../../hooks/useModalSelect';
import { useListModal } from '../../../hooks/useListModal';
import ListModal from '../../common/ListModal';
import BancoCreateModal from './BancoCreateModal';
import BancoEditModal from './BancoEditModal';
import { Banco } from '../../../types';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBancoId, setSelectedBancoId] = useState<number | null>(null);
  
  // Usar hook customizado para gerenciar seleção
  const {
    selectedItem: selectedBanco,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<Banco>(
    onSelectBanco ? (banco) => {
      onSelectBanco(banco);
      onClose();
    } : undefined
  );

  // Configurar modal centralizado
  const modal = useListModal({
    title,
    columns: [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        render: (item: Banco) => <span>{item.id}</span>
      },
      {
        key: 'nome',
        label: 'Nome',
        sortable: true,
        render: (item: Banco) => <strong>{item.nome}</strong>
      },
      {
        key: 'descricao',
        label: 'Descrição',
        sortable: false,
        render: (item: Banco) => item.descricao || '-'
      },
      {
        key: 'tipo',
        label: 'Tipo',
        sortable: true,
        render: (item: Banco) => (
          <span className="badge bg-info">
            {item.tipo === 'efi' ? 'EFI' : 'Asaas'}
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
    ],
    searchPlaceholder: 'Buscar por nome do banco...',
    multiSelect: false
  });

  // Query para buscar bancos (buscando todos para filtrar localmente)
  const { data: bancosData, isLoading, refetch } = useBancos({
    search: undefined,
    tipo_banco: undefined,
    page: 1,
    limit: 1000
  });

  const deleteBancoMutation = useDeleteBanco();

  // Filtrar bancos localmente
  const filteredBancos = useMemo(() => {
    if (!bancosData?.data) return [];
    
    let filtered = [...bancosData.data];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(b => 
        b.nome?.toLowerCase().includes(searchLower) ||
        b.id?.toString().includes(searchLower) ||
        b.descricao?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [bancosData, search]);

  // Paginar bancos
  const paginatedBancos = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredBancos.slice(startIndex, startIndex + limit);
  }, [filteredBancos, page, limit]);

  // Criar paginação manual
  const pagination = {
    from: (page - 1) * limit + 1,
    to: Math.min(page * limit, filteredBancos.length),
    total: filteredBancos.length,
    current_page: page,
    last_page: Math.ceil(filteredBancos.length / limit),
    per_page: limit
  };

  const handleSelect = () => {
    if (selectedBanco) {
      clearSelection();
      if (onSelectBanco) {
        onSelectBanco(selectedBanco);
        onClose();
      }
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

  // Bulk actions
  const bulkActions = onSelectBanco ? [
    {
      label: 'Cancelar',
      variant: 'secondary' as const,
      action: () => {
        clearSelection();
        onClose();
      }
    },
    {
      label: 'Selecionar',
      variant: 'primary' as const,
      disabled: () => !selectedBanco,
      action: handleSelect
    }
  ] : [
    {
      label: 'Novo',
      variant: 'primary' as const,
      action: () => setShowCreateModal(true)
    },
    {
      label: 'Editar',
      variant: 'primary' as const,
      disabled: () => !selectedBanco,
      action: () => {
        if (selectedBanco) {
          setSelectedBancoId(selectedBanco.id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: 'Excluir',
      variant: 'danger' as const,
      disabled: () => !selectedBanco,
      action: () => {
        if (selectedBanco && window.confirm('Tem certeza que deseja excluir este banco?')) {
          handleDelete(selectedBanco.id);
        }
      }
    }
  ];

  return (
    <>
      <ListModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        config={modal.config}
        data={paginatedBancos}
        loading={isLoading}
        selectedItems={selectedBanco ? [selectedBanco] : []}
        onSelectionChange={handleSelectionChange}
        search={search}
        onSearchChange={setSearch}
        pagination={pagination}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={setLimit}
        onRefresh={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['bancos'] });
        }}
        bulkActions={bulkActions}
      />

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
          refetch();
          setShowEditModal(false);
          setSelectedBancoId(null);
        }}
      />
    </>
  );
};

export default BancoListModal;
