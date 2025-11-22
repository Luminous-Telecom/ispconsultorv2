import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePlanos, useDeletePlano } from '@/hooks/usePlanos';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { Plano } from '@/types';
import { formatDateTime } from '@/utils/formatters';
import ListModal from '../../common/ListModal';
import PlanoModal from './PlanoModal';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState<number | null>(null);
  
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
      },
      {
        key: 'created_at',
        label: 'Criado em',
        sortable: true,
        render: (item: Plano & { created_at?: string; created_at_formatada?: string | null }) => {
          // Usar created_at_formatada se disponível (vem do backend já formatada)
          if (item.created_at_formatada) {
            return item.created_at_formatada;
          }
          // Fallback para formatDateTime se não tiver formato do backend
          return item.created_at ? formatDateTime(item.created_at) : '-';
        }
      }
    ],
    searchPlaceholder: 'Buscar por nome do plano...',
    multiSelect: false
  });

  // Hook para buscar planos usando parâmetros do useTableFilters
  const { data: planosData, isLoading, refetch } = usePlanos({
    search: tableFilters.debouncedSearch || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit
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
    current_page: tableFilters.page,
    last_page: 1,
    per_page: tableFilters.limit,
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
      // Erro tratado pelo useNotificationContext
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
        search={tableFilters.search}
        onSearchChange={tableFilters.setSearch}
        pagination={pagination}
        onPageChange={tableFilters.setPage}
        limit={tableFilters.limit}
        onLimitChange={tableFilters.setLimit}
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