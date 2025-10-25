import React, { useState, useMemo } from 'react';
import { usePlanos, useDeletePlano } from '../../../hooks/usePlanos';
import { useModalSelect } from '../../../hooks/useModalSelect';
import DraggableModal from '../../common/DraggableModal';
import ModalHeaderActions from '../../common/ModalHeaderActions';
import PlanoCreateModal from './PlanoCreateModal';
import PlanoEditModal from './PlanoEditModal';
import { Plano } from '../../../types';
import { Table } from '../../tables';
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
    if (window.confirm('Tem certeza que deseja excluir este plano?')) {
      try {
        await deletePlanoMutation.mutateAsync(planoId);
        refetch();
      } catch (error: any) {
        console.error('Erro ao excluir plano:', error);
      }
    }
  };

  const columns = [
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
      render: (item: Plano) => (
        <div className="fw-bold">{item.nome_plano}</div>
      )
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
  ];

  return (
    <DraggableModal
      show={show}
      onClose={() => {
        clearSelection();
        onClose();
      }}
      title={title}
      size="lg"
      modalId="plano-list-modal"
      headerActions={
        <ModalHeaderActions
          bulkActions={onSelectPlano ? [
            {
              label: 'Cancelar',
              variant: 'secondary',
              action: () => {
                clearSelection();
                onClose();
              }
            },
            {
              label: 'Selecionar',
              variant: 'primary',
              disabled: () => !selectedItem,
              action: handleSelect
            }
          ] : [
            {
              label: 'Novo',
              variant: 'primary',
              action: () => setShowCreateModal(true)
            },
            {
              label: 'Editar',
              variant: 'primary',
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
              variant: 'danger',
              disabled: () => !selectedItem,
              action: () => {
                if (selectedItem && window.confirm('Tem certeza que deseja excluir este plano?')) {
                  handleDelete(selectedItem.id);
                }
              }
            }
          ]}
          selectedItems={selectedItem ? [selectedItem] : []}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome do plano..."
          limit={limit}
          onLimitChange={setLimit}
          pagination={pagination}
          onPageChange={setPage}
          onRefresh={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['planos'] });
          }}
          idPrefix="plano-list"
        />
      }
    >
      <div>
        <Table
          config={{
            columns,
            data: paginatedPlanos,
            loading: isLoading,
            pagination,
            selectable: true,
            multiSelect: false,
            emptyMessage: 'Nenhum plano encontrado',
            className: 'no-padding'
          }}
          onSelectionChange={handleSelectionChange}
        />
      </div>

      {/* Modal de Criação */}
      <PlanoCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch();
          setShowCreateModal(false);
        }}
      />

      {/* Modal de Edição */}
      <PlanoEditModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPlanoId(null);
        }}
        planoId={selectedPlanoId}
        onSuccess={() => {
          refetch();
          setShowEditModal(false);
          setSelectedPlanoId(null);
        }}
      />
    </DraggableModal>
  );
};

export default PlanoListModal;
