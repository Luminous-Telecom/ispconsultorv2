import React, { useState, useMemo } from 'react';
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
  const [status, setStatus] = useState('');
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

  // Query para buscar planos (buscando todos para filtrar localmente)
  const { data: planosData, isLoading, refetch } = usePlanos({
    search: undefined,
    status: status || undefined,
    page: 1,
    limit: 1000
  });

  const deletePlanoMutation = useDeletePlano();

  // Filtrar planos localmente
  const filteredPlanos = useMemo(() => {
    if (!planosData?.data) return [];
    
    let filtered = [...planosData.data];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.nome_plano?.toLowerCase().includes(searchLower) ||
        p.id?.toString().includes(searchLower) ||
        p.descricao?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [planosData, search]);

  // Paginar planos
  const paginatedPlanos = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredPlanos.slice(startIndex, startIndex + limit);
  }, [filteredPlanos, page, limit]);

  // Criar paginação manual
  const pagination = {
    from: (page - 1) * limit + 1,
    to: Math.min(page * limit, filteredPlanos.length),
    total: filteredPlanos.length,
    current_page: page,
    last_page: Math.ceil(filteredPlanos.length / limit),
    per_page: limit
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
    } catch (error: any) {
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
        data={paginatedPlanos}
        loading={isLoading}
        selectedItems={selectedItem ? [selectedItem] : []}
        onSelectionChange={handleSelectionChange}
        search={search}
        onSearchChange={setSearch}
        pagination={pagination}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={setLimit}
        onRefresh={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['planos'] });
        }}
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
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedPlanoId(null);
        }}
      />
    </>
  );
};

export default PlanoListModal;