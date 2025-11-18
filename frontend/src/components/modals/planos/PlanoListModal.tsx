import React, { useState } from 'react';
import { usePlanos, useDeletePlano } from '../../../hooks/usePlanos';
import { useModalSelect } from '../../../hooks/useModalSelect';
import { useListModal } from '../../../hooks/useListModal';
import ListModal from '../../common/ListModal';
import PlanoModal from './PlanoModal';
import { Plano } from '../../../types';
import { useQueryClient } from '@tanstack/react-query';

interface PlanoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectPlano?: (plano: Plano) => void;
  title?: string;
}

const PlanoListModal: React.FC<PlanoListModalProps> = ({ 
  show, 
  onClose, 
  onSelectPlano,
  title = "Selecionar Plano"
}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState<number | null>(null);
  
  // Usar hook customizado para gerenciar seleção
  const {
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<Plano>(
    onSelectPlano ? (plano) => {
      onSelectPlano(plano);
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
        render: (item: Plano) => <span>{item.id}</span>
      },
      {
        key: 'nome_plano',
        label: 'Nome do Plano',
        sortable: true,
        render: (item: Plano) => <strong>{item.nome_plano}</strong>
      },
      {
        key: 'descricao',
        label: 'Descrição',
        sortable: false,
        render: (item: Plano) => item.descricao || '-'
      },
      {
        key: 'tipo_servico',
        label: 'Tipo de Serviço',
        sortable: true,
        render: (item: Plano) => (
          <span className="badge bg-info">
            {getTipoServicoLabel(item.tipo_servico)}
          </span>
        )
      },
      {
        key: 'valor_mensal',
        label: 'Valor Mensal',
        sortable: true,
        render: (item: Plano) => (
          <span className="fw-bold text-success">
            R$ {Number(item.valor_mensal || 0).toFixed(2).replace('.', ',')}
          </span>
        )
      },
      {
        key: 'quantidade_usuarios',
        label: 'Usuários',
        sortable: true,
        render: (item: Plano) => (
          <span>{item.quantidade_usuarios || '-'}</span>
        )
      },
      {
        key: 'quantidade_clientes',
        label: 'Clientes',
        sortable: true,
        render: (item: Plano) => (
          <span className="badge bg-primary">
            {item.quantidade_clientes ?? (item.clientes ? item.clientes.length : 0)}
          </span>
        )
      },
      {
        key: 'periodicidade',
        label: 'Periodicidade',
        sortable: true,
        render: (item: Plano) => (
          <span className="text-capitalize">{item.periodicidade || '-'}</span>
        )
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (item: Plano) => (
          <span className={`badge ${getStatusBadgeClass(item.status)}`}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </span>
        )
      }
    ],
    searchPlaceholder: 'Buscar por nome do plano...',
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

  // Query para buscar planos no backend com paginação
  const { data: planosData, isLoading, refetch } = usePlanos({
    search: searchParam,
    status: status || undefined,
    page,
    limit
  });

  const deletePlanoMutation = useDeletePlano();

  // Paginação do backend - usar valores do backend quando disponíveis
  const pagination = planosData?.pagination ? {
    current_page: planosData.pagination.current_page,
    last_page: planosData.pagination.last_page,
    per_page: planosData.pagination.per_page,
    total: planosData.pagination.total,
    from: planosData.pagination.from,
    to: planosData.pagination.to
  } : {
    current_page: page,
    last_page: 1,
    per_page: limit,
    total: 0,
    from: 0,
    to: 0
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-success';
      case 'inativo': return 'bg-warning';
      case 'cancelado': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getTipoServicoLabel = (tipo: string) => {
    const tipos: { [key: string]: string } = {
      internet: 'Internet',
      telefonia: 'Telefonia',
      tv: 'TV',
      suporte: 'Suporte',
      infraestrutura: 'Infraestrutura',
      consultoria: 'Consultoria',
      outros: 'Outros'
    };
    return tipos[tipo] || tipo;
  };

  const handleSelect = () => {
    if (selectedItem) {
      clearSelection();
      if (onSelectPlano) {
        onSelectPlano(selectedItem);
        onClose();
      }
    }
  };

  const handleDelete = async (planoId: number) => {
    try {
      await deletePlanoMutation.mutateAsync(planoId);
      refetch();
    } catch (error: unknown) {
      console.error('Erro ao excluir plano:', error);
    }
  };

  // Bulk actions
  const bulkActions = onSelectPlano ? [
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
      disabled: () => !selectedItem,
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
      disabled: () => !selectedItem,
      action: () => {
        if (selectedItem) {
          setSelectedPlanoId(selectedItem.id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: 'Excluir',
      variant: 'danger' as const,
      disabled: () => !selectedItem,
      action: () => {
        if (selectedItem && window.confirm('Tem certeza que deseja excluir este plano?')) {
          handleDelete(selectedItem.id);
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
        data={planosData?.data || []}
        loading={isLoading}
        selectedItems={selectedItem ? [selectedItem] : []}
        onSelectionChange={handleSelectionChange}
        search={search}
        onSearchChange={setSearch}
        pagination={pagination}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={setLimit}
        refreshQueryKeys={['planos']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
      />

      {/* Modal de Criação/Edição unificado */}
      <PlanoModal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedPlanoId(null);
        }}
        planoId={showEditModal ? selectedPlanoId : null}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['planos'] });
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedPlanoId(null);
        }}
      />
    </>
  );
};

export default PlanoListModal;