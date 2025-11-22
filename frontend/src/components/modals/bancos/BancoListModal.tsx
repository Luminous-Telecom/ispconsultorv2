import React, { useState } from 'react';
import { useBancos, useDeleteBanco } from '../../../hooks/useBancos';
import { useModalSelect } from '../../../hooks/useModalSelect';
import { useListModal } from '../../../hooks/useListModal';
import ListModal from '../../common/ListModal';
import BancoModal from './BancoModal';
import { Banco } from '../../../types';
import { formatDateTime } from '../../../utils/formatters';
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [showBancoModal, setShowBancoModal] = useState(false);
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

  // Debounce da busca para evitar muitas requisições
  const [searchParam, setSearchParam] = useState<string | undefined>(undefined);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParam(search || undefined);
      setPage(1); // Resetar para primeira página ao buscar
    }, 300); // 300ms de debounce
    
    return () => clearTimeout(timer);
  }, [search]);

  // Query para buscar bancos no backend com paginação
  const { data: bancosData, isLoading, refetch } = useBancos({
    search: searchParam,
    tipo_banco: undefined,
    page,
    limit
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
    current_page: page,
    last_page: 1,
    per_page: limit,
    total: 0,
    from: 0,
    to: 0
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
    try {
      await deleteBancoMutation.mutateAsync(bancoId);
      refetch();
    } catch (error) {
      console.error('Erro ao excluir banco:', error);
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
      disabled: () => !selectedBanco,
      action: handleSelect
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
      disabled: () => !selectedBanco,
      action: () => {
        if (selectedBanco) {
          setSelectedBancoId(selectedBanco.id);
          setShowBancoModal(true);
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
        data={bancosData?.data || []}
        loading={isLoading}
        selectedItems={selectedBanco ? [selectedBanco] : []}
        onSelectionChange={handleSelectionChange}
        search={search}
        onSearchChange={setSearch}
        pagination={pagination}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={setLimit}
        refreshQueryKeys={['bancos']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
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
