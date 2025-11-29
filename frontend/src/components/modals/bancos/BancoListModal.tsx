import React, { useState } from 'react';
import { useBancos, useDeleteBanco } from '@/hooks/useBancos';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { Banco } from '@/types';
import { formatDateTime } from '@/utils/formatters';
import ListModal from '@/components/common/ListModal';
import BancoModal from './BancoModal';
interface BancoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectBanco?: (banco: Banco) => void;
  title?: string;
  skipWrapper?: boolean;
}

const BancoListModal: React.FC<BancoListModalProps> = ({ 
  show, 
  onClose, 
  onSelectBanco,
  title = "Selecionar Banco",
  skipWrapper = false
}) => {
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [selectedBancoId, setSelectedBancoId] = useState<number | null>(null);
  
  // Hook unificado para filtros, busca e paginação
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });
  
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
        render: (item: Banco) => {
          const tipos: Record<string, string> = {
            'efi': 'EFI',
            'asaas': 'Asaas',
            'bancario': 'Bancário',
            'outros': 'Outros'
          };
          return (
            <span className="badge bg-info">
              {tipos[item.tipo_banco] || 'N/A'}
            </span>
          );
        }
      },
      {
        key: 'sandbox',
        label: 'Sandbox',
        sortable: true,
        render: (item: Banco) => (
          <span className={`badge ${item.sandbox ? 'bg-warning' : 'bg-primary'}`}>
            {item.sandbox ? 'Sim' : 'Não'}
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
      },
      {
        key: 'created_at',
        label: 'Criado em',
        sortable: true,
        render: (item: Banco & { created_at?: string; created_at_formatada?: string | null }) => {
          // Usar created_at_formatada se disponível (vem do backend já formatada)
          if (item.created_at_formatada) {
            return item.created_at_formatada;
          }
          // Fallback para formatDateTime se não tiver formato do backend
          return item.created_at ? formatDateTime(item.created_at) : '-';
        }
      }
    ],
    searchPlaceholder: 'Buscar por nome do banco...',
    multiSelect: false
  });

  // Hook para buscar bancos usando parâmetros do useTableFilters
  const { data: bancosData, isLoading, refetch } = useBancos({
    search: tableFilters.debouncedSearch || undefined,
    tipo_banco: undefined,
    page: tableFilters.page,
    limit: tableFilters.limit
  });

  const deleteBancoMutation = useDeleteBanco();

  // Paginação do backend - usar valores do backend quando disponíveis
  const pagination = bancosData?.pagination ? {
    current_page: bancosData.pagination.current_page,
    last_page: bancosData.pagination.last_page,
    per_page: bancosData.pagination.per_page,
    total: bancosData.pagination.total,
    from: bancosData.pagination.from,
    to: bancosData.pagination.to
  } : {
    current_page: tableFilters.page,
    last_page: 1,
    per_page: tableFilters.limit,
    total: 0,
    from: 0,
    to: 0
  };

  const handleSelect = (selectedItems?: Banco[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedBanco;
    if (item) {
      clearSelection();
      if (onSelectBanco) {
        onSelectBanco(item);
        onClose();
      }
    }
  };

  const handleDelete = async (bancoId: number) => {
    try {
      await deleteBancoMutation.mutateAsync(bancoId);
      refetch();
    } catch (error) {
      // Erro tratado pelo useNotificationContext
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
      label: 'Inserir',
      variant: 'primary' as const,
      disabled: (selectedItems: Banco[]) => selectedItems.length === 0 && !selectedBanco,
      action: (selectedItems: Banco[]) => handleSelect(selectedItems)
    }
  ] : [
    {
      label: 'Novo',
      variant: 'primary' as const,
      action: () => {
        setSelectedBancoId(null);
        setShowBancoModal(true);
      }
    },
    {
      label: 'Editar',
      variant: 'primary' as const,
      disabled: (selectedItems: Banco[]) => selectedItems.length === 0 && !selectedBanco,
      action: (selectedItems: Banco[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedBanco;
        if (item) {
          setSelectedBancoId(item.id);
          setShowBancoModal(true);
        }
      }
    },
    {
      label: 'Excluir',
      variant: 'danger' as const,
      disabled: (selectedItems: Banco[]) => selectedItems.length === 0 && !selectedBanco,
      action: (selectedItems: Banco[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedBanco;
        if (item && window.confirm('Tem certeza que deseja excluir este banco?')) {
          handleDelete(item.id);
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
        data={bancosData?.data || []}
        loading={isLoading}
        selectedItems={selectedBanco ? [selectedBanco] : []}
        onSelectionChange={handleSelectionChange}
        search={tableFilters.search}
        onSearchChange={tableFilters.setSearch}
        pagination={pagination}
        onPageChange={tableFilters.setPage}
        limit={tableFilters.limit}
        onLimitChange={tableFilters.setLimit}
        refreshQueryKeys={['bancos']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
        skipWrapper={skipWrapper}
      />

      {/* Modal Unificado (Criação e Edição) */}
      <BancoModal
        show={showBancoModal}
        onClose={() => {
          setShowBancoModal(false);
          setSelectedBancoId(null);
        }}
        bancoId={selectedBancoId}
        onSuccess={(banco) => {
          refetch();
          setSelectedBancoId(banco.id);
        }}
      />
    </>
  );
};

export default BancoListModal;
