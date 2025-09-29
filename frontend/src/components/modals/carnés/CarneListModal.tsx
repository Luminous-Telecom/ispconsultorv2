import React, { useState } from 'react';
import { useCarnes, useDeleteCarne } from '../../../hooks/useCarnes';
import { API_CONFIG } from '../../../config/api';
import DataTable from '../../common/DataTable';
import TableFilters from '../../common/TableFilters';
import DraggableModal from '../../common/DraggableModal';
import { CarneCreateModal } from './index';

interface Carne {
  id: number;
  numero_carne: string;
  valor_total: number;
  quantidade_parcelas: number;
  status: 'ativo' | 'pago' | 'cancelado' | 'parcial' | 'pendente' | 'registrado';
  cliente: {
    id: number;
    razao_social: string;
    nome_fantasia?: string;
  };
  plano: {
    id: number;
    nome_plano: string;
  };
  banco: {
    id: number;
    nome: string;
  };
  created_at: string;
}

interface CarneListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectCarne?: (carne: Carne) => void;
  title?: string;
}

const CarneListModal: React.FC<CarneListModalProps> = ({ 
  show, 
  onClose, 
  onSelectCarne,
  title = "Selecionar Carnê"
}) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: carnesData, isLoading, refetch } = useCarnes({
    search: search || undefined,
    status: status || undefined,
    page,
    limit
  });

  const deleteCarneMutation = useDeleteCarne();

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-primary';
      case 'pago': return 'bg-success';
      case 'cancelado': return 'bg-danger';
      case 'parcial': return 'bg-warning';
      case 'pendente': return 'bg-info';
      case 'registrado': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo': return 'Ativo';
      case 'pago': return 'Pago';
      case 'cancelado': return 'Cancelado';
      case 'parcial': return 'Parcial';
      case 'pendente': return 'Pendente';
      case 'registrado': return 'Registrado';
      default: return status;
    }
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

  const handleDelete = async (carneId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este carnê?')) {
      try {
        await deleteCarneMutation.mutateAsync(carneId);
        refetch();
      } catch (error) {
        console.error('Erro ao excluir carnê:', error);
      }
    }
  };

  const handleRowClick = (carne: Carne) => {
    if (onSelectCarne) {
      onSelectCarne(carne);
      onClose();
    }
  };

  const handleImprimir = (carne: Carne) => {
    const url = `${API_CONFIG.BASE_URL_WITHOUT_API}/carnes/${carne.id}/imprimir`;
    window.open(url, '_blank');
  };

  const columns = [
    {
      key: 'numero_carne',
      label: 'Número',
      sortable: true,
      render: (item: Carne) => (
        <span className="fw-bold text-primary">{item.numero_carne}</span>
      )
    },
    {
      key: 'cliente',
      label: 'Cliente',
      sortable: true,
      render: (item: Carne) => (
        <div>
          <div className="fw-bold">{item.cliente.razao_social}</div>
          {item.cliente.nome_fantasia && (
            <small className="text-muted">{item.cliente.nome_fantasia}</small>
          )}
        </div>
      )
    },
    {
      key: 'plano',
      label: 'Plano',
      sortable: false,
      render: (item: Carne) => (
        <span>{item.plano.nome_plano}</span>
      )
    },
    {
      key: 'valor_total',
      label: 'Valor Total',
      sortable: true,
      render: (item: Carne) => (
        <span className="fw-bold text-success">
          R$ {Number(item.valor_total || 0).toFixed(2).replace('.', ',')}
        </span>
      )
    },
    {
      key: 'quantidade_parcelas',
      label: 'Parcelas',
      sortable: true,
      render: (item: Carne) => (
        <span className="badge bg-info">{item.quantidade_parcelas || 0}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item: Carne) => (
        <span className={`badge ${getStatusBadgeClass(item.status)}`}>
          {getStatusLabel(item.status)}
        </span>
      )
    },
    {
      key: 'banco',
      label: 'Banco',
      sortable: false,
      render: (item: Carne) => (
        <span>{item.banco.nome}</span>
      )
    }
  ];

  const bulkActions = onSelectCarne ? [] : [
    {
      label: 'Novo Carnê',
      action: () => {
        setShowCreateModal(true);
      }
    },
    {
      label: 'Excluir',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} carnê(s)?`)) {
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
          console.log('Visualizar carnê:', selectedItems[0]);
        }
      }
    },
    {
      label: 'Editar',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          console.log('Editar carnê:', selectedItems[0]);
        }
      }
    },
    {
      label: 'Imprimir',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          handleImprimir(selectedItems[0]);
        }
      }
    }
  ];

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
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
                placeholder: 'Buscar por número, cliente...',
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
                  { value: 'pago', label: 'Pagos' },
                  { value: 'cancelado', label: 'Cancelados' },
                  { value: 'parcial', label: 'Parciais' },
                  { value: 'pendente', label: 'Pendentes' },
                  { value: 'registrado', label: 'Registrados' }
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
            data={carnesData?.data || []}
            columns={columns}
            isLoading={isLoading}
            pagination={{
              from: carnesData?.pagination?.from || (page - 1) * limit + 1,
              to: carnesData?.pagination?.to || Math.min(page * limit, carnesData?.pagination?.total || 0),
              total: carnesData?.pagination?.total || 0,
              current_page: carnesData?.pagination?.current_page || page,
              last_page: carnesData?.pagination?.last_page || 1
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

      {/* Modal de Criação */}
      <CarneCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch();
          setShowCreateModal(false);
        }}
      />
    </DraggableModal>
  );
};

export default CarneListModal;
