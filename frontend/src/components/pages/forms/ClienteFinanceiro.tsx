import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../common/DataTable';
import { useTitulos } from '../../../hooks/useTitulos';
import { useMarcarTituloPago } from '../../../hooks/useTitulos';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { getApiUrl } from '../../../config/api';
import { TituloEditModal, TituloCreateModal } from '../../modals/titulos';

interface ClienteFinanceiroProps {
  cliente: any;
  onDataChange: (field: string, value: any) => void;
}

const ClienteFinanceiro: React.FC<ClienteFinanceiroProps> = ({ 
  cliente, 
  onDataChange 
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [sortColumnParcelas, setSortColumnParcelas] = useState<string>('');
  const [sortDirectionParcelas, setSortDirectionParcelas] = useState<'asc' | 'desc'>('asc');
  const [showParcelaEditModal, setShowParcelaEditModal] = useState(false);
  const [selectedParcelaId, setSelectedParcelaId] = useState<number | null>(null);
  const [showParcelaCreateModal, setShowParcelaCreateModal] = useState(false);
  const { addNotification } = useNotificationContext();
  const navigate = useNavigate();

  const handleTabChange = (tabIndex: number) => {
    setActiveTab(tabIndex);
  };

  // Funções de ordenação
  const handleSortParcelas = (column: string, direction: 'asc' | 'desc') => {
    setSortColumnParcelas(column);
    setSortDirectionParcelas(direction);
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

  // Buscar parcelas do cliente
  const { data: parcelasData, isLoading: parcelasLoading, refetch: refetchParcelas } = useTitulos({ 
    cliente_id: cliente?.id 
  });

  // Debug: verificar se os dados estão chegando
  console.log('ClienteFinanceiro - cliente:', cliente);
  console.log('ClienteFinanceiro - parcelasData:', parcelasData);
  console.log('ClienteFinanceiro - parcelasLoading:', parcelasLoading);
  
  const marcarPagoMutation = useMarcarTituloPago();

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

  const handleEditarParcela = (selectedItems: any[]) => {
    if (selectedItems.length > 0) {
      setSelectedParcelaId(selectedItems[0].id);
      setShowParcelaEditModal(true);
    }
  };

  const handleCloseParcelaEditModal = () => {
    setShowParcelaEditModal(false);
    setSelectedParcelaId(null);
  };

  const handleParcelaEditSuccess = () => {
    refetchParcelas();
  };

  const handleCloseParcelaCreateModal = () => {
    setShowParcelaCreateModal(false);
  };

  const handleParcelaCreateSuccess = () => {
    refetchParcelas();
  };


  const parcelasColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'numero_titulo', label: 'Título', sortable: true },
    { 
      key: 'status', 
      label: 'Status', 
      render: (item: any) => (
        <span className={`badge ${item.status === 'pago' ? 'bg-success' : item.status === 'vencido' ? 'bg-danger' : 'bg-secondary'}`}>
          {item.status}
        </span>
      )
    },
    { key: 'valor', label: 'Valor', render: (item: any) => {
        const valor = parseFloat(item.valor) || 0;
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

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Títulos Individuais ({parcelas.length})</h6>
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
                  label: 'Novo Título',
                  action: () => setShowParcelaCreateModal(true)
                },
                {
                  label: 'Editar',
                  action: handleEditarParcela
                },
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

      {/* Modal de edição de parcela */}
      <TituloEditModal
        show={showParcelaEditModal}
        onClose={handleCloseParcelaEditModal}
        parcelaId={selectedParcelaId || 0}
        onSuccess={handleParcelaEditSuccess}
      />

      {/* Modal de criação de parcela */}
      <TituloCreateModal
        show={showParcelaCreateModal}
        onClose={handleCloseParcelaCreateModal}
        onSuccess={handleParcelaCreateSuccess}
        clienteId={cliente.id}
      />
    </div>
  );
};

export default ClienteFinanceiro;
