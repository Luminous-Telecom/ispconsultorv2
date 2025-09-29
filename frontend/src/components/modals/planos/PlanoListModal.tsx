import React, { useState } from 'react';
import { usePlanos, useDeletePlano } from '../../../hooks/usePlanos';
import DataTable from '../../common/DataTable';
import TableFilters from '../../common/TableFilters';
import DraggableModal from '../../common/DraggableModal';

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

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setSearch('');
    setStatus('');
    setPage(1);
    refetch();
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
        <div>
          <div className="fw-bold">{item.nome_plano}</div>
          {item.descricao && (
            <small className="text-muted">{item.descricao}</small>
          )}
        </div>
      )
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
          R$ {item.valor_mensal.toFixed(2).replace('.', ',')}
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
        console.log('Abrir modal de novo plano');
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

  const topActions = [
    {
      label: 'Visualizar',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          console.log('Visualizar plano:', selectedItems[0]);
        }
      }
    },
    {
      label: 'Editar',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          console.log('Editar plano:', selectedItems[0]);
        }
      }
    }
  ];

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="xl"
    >
      <div className="d-flex flex-column h-100">
        {/* Filtros */}
        <div className="mb-3">
          <TableFilters
            fields={[
              {
                name: 'search',
                label: 'Buscar',
                type: 'text',
                placeholder: 'Buscar por nome do plano...',
                value: search,
                onChange: setSearch
              },
              {
                name: 'status',
                label: 'Status',
                type: 'select',
                value: status,
                onChange: setStatus,
                options: [
                  { value: '', label: 'Todos' },
                  { value: 'ativo', label: 'Ativos' },
                  { value: 'inativo', label: 'Inativos' },
                  { value: 'suspenso', label: 'Suspensos' }
                ]
              }
            ]}
            onFilter={handleFilter}
            onReset={handleReset}
          />
        </div>

        {/* Tabela */}
        <div className="flex-grow-1">
          <DataTable
            data={planosData?.data || []}
            columns={columns}
            isLoading={isLoading}
            pagination={{
              from: (page - 1) * limit + 1,
              to: Math.min(page * limit, planosData?.total || 0),
              total: planosData?.total || 0,
              current_page: page,
              last_page: planosData?.last_page || 1
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
            onSelectionChange={(selectedItems) => {
              // Implementar lógica de seleção se necessário
            }}
          />
        </div>
      </div>
    </DraggableModal>
  );
};

export default PlanoListModal;
