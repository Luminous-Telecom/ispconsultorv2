import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../common/DataTable';
import { useCarnes } from '../../../hooks/useCarnes';
import { useCarneParcelas } from '../../../hooks/useCarneParcelas';
import { useMarcarParcelaPago } from '../../../hooks/useCarneParcelas';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { getApiUrl } from '../../../config/api';
import { CarneEditModal, CarneCreateModal } from '../../modals/carnés';

interface ClienteFinanceiroProps {
  cliente: any;
  onDataChange: (field: string, value: any) => void;
}

const ClienteFinanceiro: React.FC<ClienteFinanceiroProps> = ({ 
  cliente, 
  onDataChange 
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [sortColumnCarnes, setSortColumnCarnes] = useState<string>('');
  const [sortDirectionCarnes, setSortDirectionCarnes] = useState<'asc' | 'desc'>('asc');
  const [sortColumnParcelas, setSortColumnParcelas] = useState<string>('');
  const [sortDirectionParcelas, setSortDirectionParcelas] = useState<'asc' | 'desc'>('asc');
  const [showCarneEditModal, setShowCarneEditModal] = useState(false);
  const [selectedCarneId, setSelectedCarneId] = useState<number | null>(null);
  const [showCarneCreateModal, setShowCarneCreateModal] = useState(false);
  const { addNotification } = useNotificationContext();
  const navigate = useNavigate();

  const handleTabChange = (tabIndex: number) => {
    setActiveTab(tabIndex);
  };

  // Funções de ordenação
  const handleSortCarnes = (column: string, direction: 'asc' | 'desc') => {
    setSortColumnCarnes(column);
    setSortDirectionCarnes(direction);
  };

  const handleSortParcelas = (column: string, direction: 'asc' | 'desc') => {
    setSortColumnParcelas(column);
    setSortDirectionParcelas(direction);
  };

  // Funções para ordenar os dados localmente
  const getSortedCarnes = () => {
    if (!carnes || !sortColumnCarnes) {
      return carnes;
    }

    return [...carnes].sort((a, b) => {
      let aValue = (a as any)[sortColumnCarnes];
      let bValue = (b as any)[sortColumnCarnes];

      // Tratar campos aninhados
      if (sortColumnCarnes === 'banco') {
        aValue = a.banco?.nome || '';
        bValue = b.banco?.nome || '';
      }

      // Converter para string se necessário para comparação
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }

      // Tratar valores null/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      if (aValue < bValue) return sortDirectionCarnes === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirectionCarnes === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getSortedParcelas = () => {
    if (!parcelas || !sortColumnParcelas) {
      return parcelas;
    }

    return [...parcelas].sort((a, b) => {
      let aValue = (a as any)[sortColumnParcelas];
      let bValue = (b as any)[sortColumnParcelas];

      // Converter para string se necessário para comparação
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }

      // Tratar valores null/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      if (aValue < bValue) return sortDirectionParcelas === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirectionParcelas === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Buscar carnês do cliente
  const { data: carnesData, isLoading: carnesLoading, refetch: refetchCarnes } = useCarnes({ 
    cliente_id: cliente?.id 
  });
  
  // Buscar parcelas do cliente
  const { data: parcelasData, isLoading: parcelasLoading, refetch: refetchParcelas } = useCarneParcelas({ 
    cliente_id: cliente?.id 
  });
  
  const marcarPagoMutation = useMarcarParcelaPago();

  const carnes = carnesData?.data || [];
  const parcelas = parcelasData?.data || [];

  const handleMarcarPago = async (selectedItems: any[]) => {
    try {
      for (const item of selectedItems) {
        if (item.status !== 'pago') {
          await marcarPagoMutation.mutateAsync({ id: item.id });
        }
      }
      addNotification('success', 'Parcelas marcadas como pagas com sucesso!');
      refetchParcelas();
    } catch (error) {
      console.error('Erro ao marcar parcelas como pagas:', error);
    }
  };

  const handleImprimirParcela = (selectedItems: any[]) => {
    if (selectedItems.length > 0) {
      const url = getApiUrl(`/boleto/web/${selectedItems[0].id}`);
      window.open(url, '_blank');
    }
  };

  const handleVisualizarCarne = (selectedItems: any[]) => {
    if (selectedItems.length > 0) {
      navigate(`/carnes/${selectedItems[0].id}`);
    }
  };

  const handleEditarCarne = (selectedItems: any[]) => {
    if (selectedItems.length > 0) {
      setSelectedCarneId(selectedItems[0].id);
      setShowCarneEditModal(true);
    }
  };

  const handleImprimirCarne = (selectedItems: any[]) => {
    if (selectedItems.length > 0) {
      const url = `${process.env.REACT_APP_API_URL}/carnes/${selectedItems[0].id}/imprimir`;
      window.open(url, '_blank');
    }
  };

  const handleCloseCarneEditModal = () => {
    setShowCarneEditModal(false);
    setSelectedCarneId(null);
  };

  const handleCarneEditSuccess = () => {
    refetchCarnes();
  };

  const handleCloseCarneCreateModal = () => {
    setShowCarneCreateModal(false);
  };

  const handleCarneCreateSuccess = () => {
    refetchCarnes();
  };

  const carnesColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'numero_carne', label: 'Número', sortable: true },
    { 
      key: 'status', 
      label: 'Status', 
      render: (item: any) => (
        <span className={`badge ${item.status === 'ativo' ? 'bg-success' : item.status === 'pago' ? 'bg-info' : 'bg-secondary'}`}>
          {item.status}
        </span>
      )
    },
    { key: 'valor_total', label: 'Valor Total', render: (item: any) => {
        const valor = parseFloat(item.valor_total) || 0;
        return `R$ ${valor.toFixed(2)}`;
      }
    },
    { key: 'data_vencimento_primeira', label: 'Vencimento', sortable: true },
    { key: 'quantidade_parcelas', label: 'Total Parcelas', sortable: true },
    { 
      key: 'parcelas_pagas', 
      label: 'Pagas',
      render: (item: any) => item.parcelas_pagas || 0
    },
    { 
      key: 'banco', 
      label: 'Banco',
      render: (item: any) => item.banco?.nome || 'N/A'
    }
  ];

  const parcelasColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'numero_parcela', label: 'Parcela', sortable: true },
    { 
      key: 'status', 
      label: 'Status', 
      render: (item: any) => (
        <span className={`badge ${item.status === 'pago' ? 'bg-success' : item.status === 'vencido' ? 'bg-danger' : 'bg-secondary'}`}>
          {item.status}
        </span>
      )
    },
    { key: 'valor_parcela', label: 'Valor', render: (item: any) => {
        const valor = parseFloat(item.valor_parcela) || 0;
        return `R$ ${valor.toFixed(2)}`;
      }
    },
    { key: 'data_vencimento', label: 'Vencimento', sortable: true },
    { key: 'data_pagamento', label: 'Pagamento', sortable: true }
  ];

  if (!cliente) {
    return (
      <div>Carregando dados do cliente...</div>
    );
  }

  return (
    <div>
      <small className="mb-1 fw-bold">
        Financeiro do Cliente
      </small>

        <ul className="nav nav-tabs" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 0 ? 'active' : ''}`}
              onClick={() => handleTabChange(0)}
              type="button"
              role="tab"
            >
              Carnês ({carnes.length})
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 1 ? 'active' : ''}`}
              onClick={() => handleTabChange(1)}
              type="button"
              role="tab"
            >
              Títulos Individuais ({parcelas.length})
            </button>
          </li>
        </ul>

        <div className="tab-content">
          <div className={`tab-pane fade ${activeTab === 0 ? 'show active' : ''}`}>
            <div className="d-flex justify-content-between align-items-center mb-2 mt-2">
              <small className="mb-0">Carnês</small>
            </div>
            
            <DataTable
              data={getSortedCarnes()}
              columns={carnesColumns}
              isLoading={carnesLoading}
              pagination={carnesData?.pagination}
              limit={10}
              setLimit={() => {}}
              setPage={() => {}}
              emptyMessage="Nenhum carnê encontrado"
              searchPlaceholder="Número do carnê"
              onSearch={() => {}}
              bulkActions={[
                {
                  label: 'Novo Carnê',
                  action: () => setShowCarneCreateModal(true)
                },
                {
                  label: 'Visualizar',
                  action: handleVisualizarCarne
                },
                {
                  label: 'Editar',
                  action: handleEditarCarne
                },
                {
                  label: 'Imprimir',
                  action: handleImprimirCarne
                }
              ]}
              onSort={handleSortCarnes}
              sortColumn={sortColumnCarnes}
              sortDirection={sortDirectionCarnes}
              onRefresh={refetchCarnes}
            />
          </div>

          <div className={`tab-pane fade ${activeTab === 1 ? 'show active' : ''}`}>
            <div className="d-flex justify-content-between align-items-center mb-2 mt-2">
              <small className="mb-0">Títulos Individuais</small>
            </div>
            
            <DataTable
              data={getSortedParcelas()}
              columns={parcelasColumns}
              isLoading={parcelasLoading}
              pagination={parcelasData?.pagination}
              limit={10}
              setLimit={() => {}}
              setPage={() => {}}
              emptyMessage="Nenhuma parcela encontrada"
              searchPlaceholder="Número da parcela"
              onSearch={() => {}}
              bulkActions={[
                {
                  label: 'Marcar como Pago',
                  action: handleMarcarPago,
                  disabled: (selectedItems) => selectedItems.every(item => item.status === 'pago')
                },
                {
                  label: 'Imprimir',
                  action: handleImprimirParcela
                }
              ]}
              onSort={handleSortParcelas}
              sortColumn={sortColumnParcelas}
              sortDirection={sortDirectionParcelas}
              onRefresh={refetchParcelas}
            />
          </div>
        </div>

      {/* Modal de edição de carnê */}
      <CarneEditModal
        show={showCarneEditModal}
        onClose={handleCloseCarneEditModal}
        carneId={selectedCarneId}
        onSuccess={handleCarneEditSuccess}
      />

      {/* Modal de criação de carnê */}
      <CarneCreateModal
        show={showCarneCreateModal}
        onClose={handleCloseCarneCreateModal}
        onSuccess={handleCarneCreateSuccess}
        clienteId={cliente.id}
      />
    </div>
  );
};

export default ClienteFinanceiro;
