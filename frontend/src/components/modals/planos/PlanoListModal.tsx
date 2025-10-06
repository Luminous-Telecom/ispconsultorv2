import React, { useState } from 'react';
import { usePlanos, useDeletePlano } from '../../../hooks/usePlanos';
import DataTable from '../../common/DataTable';
import TableFilters from '../../common/TableFilters';
import DraggableModal from '../../common/DraggableModal';
import ModalHeaderActions from '../../common/ModalHeaderActions';
import { PlanoCreateModal, PlanoEditModal } from './index';

interface Plano {
  id: number;
  nome_plano: string;
  descricao?: string;
  tipo_servico: 'internet' | 'telefonia' | 'tv' | 'suporte' | 'infraestrutura' | 'consultoria' | 'outros';
  quantidade_usuarios?: number;
  valor_mensal: number;
  periodicidade?: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal';
  status: 'ativo' | 'inativo' | 'suspenso';
  created_at: string;
}

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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  // Query para buscar planos
  const { data: planosData, isLoading, refetch } = usePlanos({
    search: search || undefined,
    status: status || undefined,
    page,
    limit
  });

  const deletePlanoMutation = useDeletePlano();

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-success';
      case 'inativo': return 'bg-danger';
      case 'suspenso': return 'bg-warning';
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


  const handleDelete = async (planoId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este plano?')) {
      try {
        await deletePlanoMutation.mutateAsync(planoId);
        refetch();
      } catch (error) {
        console.error('Erro ao excluir plano:', error);
      }
    }
  };

  const handleRowClick = (plano: Plano) => {
    if (onSelectPlano) {
      onSelectPlano(plano);
      onClose();
    }
  };

  const columns = [
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

  const bulkActions = onSelectPlano ? [] : [
    {
      label: 'Novo Plano',
      action: () => {
        setShowCreateModal(true);
      }
    },
    {
      label: 'Editar',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          setSelectedPlanoId(selectedItems[0].id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: 'Excluir',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} plano(s)?`)) {
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
      searchPlaceholder="Buscar por nome do plano..."
      limit={limit}
      onLimitChange={setLimit}
      pagination={planosData?.pagination}
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
            data={planosData?.data || []}
            columns={columns}
            isLoading={isLoading}
            pagination={{
              from: planosData?.pagination?.from || (page - 1) * limit + 1,
              to: planosData?.pagination?.to || Math.min(page * limit, planosData?.pagination?.total || 0),
              total: planosData?.pagination?.total || 0,
              current_page: planosData?.pagination?.current_page || page,
              last_page: planosData?.pagination?.last_page || 1
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
            searchPlaceholder="Buscar por nome do plano..."
            onSearch={setSearch}
            emptyMessage="Nenhum plano encontrado"
            showHeader={false}
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
