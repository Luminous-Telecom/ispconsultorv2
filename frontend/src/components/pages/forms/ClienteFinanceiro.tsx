import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../common/DataTable';
import { useCarnes } from '../../../hooks/useCarnes';
import { useCarneParcelas } from '../../../hooks/useCarneParcelas';
import { useMarcarParcelaPago } from '../../../hooks/useCarneParcelas';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { getApiUrl } from '../../../config/api';

interface ClienteFinanceiroProps {
  cliente: any;
  onDataChange: (field: string, value: any) => void;
}

const ClienteFinanceiro: React.FC<ClienteFinanceiroProps> = ({ 
  cliente, 
  onDataChange 
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const { addNotification } = useNotificationContext();
  const navigate = useNavigate();

  const handleTabChange = (tabIndex: number) => {
    setActiveTab(tabIndex);
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
      navigate(`/carnes/${selectedItems[0].id}/edit`);
    }
  };

  const handleImprimirCarne = (selectedItems: any[]) => {
    if (selectedItems.length > 0) {
      const url = `${process.env.REACT_APP_API_URL}/carnes/${selectedItems[0].id}/imprimir`;
      window.open(url, '_blank');
    }
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
    { key: 'data_vencimento', label: 'Vencimento', sortable: true },
    { key: 'banco.nome', label: 'Banco' },
    {
      key: 'actions',
      label: 'Ações',
      render: (item: any) => (
        <div className="btn-group btn-group-sm">
          <button className="btn btn-outline-primary" title="Visualizar">
            <i className="bi bi-eye"></i>
          </button>
          <button className="btn btn-outline-secondary" title="Editar">
            <i className="bi bi-pencil"></i>
          </button>
          <button className="btn btn-outline-info" title="Imprimir">
            <i className="bi bi-printer"></i>
          </button>
        </div>
      )
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
    { key: 'data_pagamento', label: 'Pagamento', sortable: true },
    {
      key: 'actions',
      label: 'Ações',
      render: (item: any) => (
        <div className="btn-group btn-group-sm">
          <button className="btn btn-outline-success" title="Marcar como Pago">
            <i className="bi bi-check"></i>
          </button>
          <button className="btn btn-outline-info" title="Imprimir">
            <i className="bi bi-printer"></i>
          </button>
        </div>
      )
    }
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
              data={carnes}
              columns={carnesColumns}
              isLoading={carnesLoading}
              limit={10}
              setLimit={() => {}}
              setPage={() => {}}
              bulkActions={[
                {
                  label: 'Novo Carnê',
                  action: () => navigate('/carnes/create')
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
            />
          </div>

          <div className={`tab-pane fade ${activeTab === 1 ? 'show active' : ''}`}>
            <div className="d-flex justify-content-between align-items-center mb-1 mt-1">
              <small className="mb-0 text-muted">Títulos Individuais</small>
              <div className="btn-group">
                <button className="btn btn-primary btn-sm">
                  <i className="bi bi-plus me-1"></i>
                  Novo Título
                </button>
                <button className="btn btn-outline-secondary btn-sm">
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
            </div>
            
            <DataTable
              data={parcelas}
              columns={parcelasColumns}
              isLoading={parcelasLoading}
              limit={10}
              setLimit={() => {}}
              setPage={() => {}}
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
            />
          </div>
        </div>
      </div>
  );
};

export default ClienteFinanceiro;
