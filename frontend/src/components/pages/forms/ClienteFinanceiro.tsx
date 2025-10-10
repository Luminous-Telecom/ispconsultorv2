import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../common/DataTable';
import { useTitulos } from '../../../hooks/useTitulos';
import { useMarcarTituloPago } from '../../../hooks/useTitulos';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { getApiUrl } from '../../../config/api';
import { TituloEditModal, TituloCreateModal } from '../../modals/titulos';
import { TituloService } from '../../../services/tituloService';
import { Cliente, CarneParcela } from '../../../types';

interface ClienteFinanceiroProps {
  cliente: Cliente;
  onDataChange: (field: string, value: unknown) => void;
}

const ClienteFinanceiro: React.FC<ClienteFinanceiroProps> = ({ 
  cliente, 
  onDataChange 
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [sortColumnParcelas, setSortColumnParcelas] = useState<string>('id');
  const [sortDirectionParcelas, setSortDirectionParcelas] = useState<'asc' | 'desc'>('desc');
  const [showParcelaEditModal, setShowParcelaEditModal] = useState(false);
  const [selectedParcelaId, setSelectedParcelaId] = useState<number | null>(null);
  const [showParcelaCreateModal, setShowParcelaCreateModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const { addNotification } = useNotificationContext();
  const navigate = useNavigate();

  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    addNotification(type, message);
  };

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
      let aValue: any = a[sortColumnParcelas as keyof CarneParcela];
      let bValue: any = b[sortColumnParcelas as keyof CarneParcela];

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

  
  const marcarPagoMutation = useMarcarTituloPago();

  const parcelas = parcelasData?.data || [];

  const handleMarcarPago = async (selectedItems: CarneParcela[]) => {
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

  const handleImprimirSelecionados = () => {
    if (selectedItems.length > 0) {
      const ids = selectedItems.map(item => item.id);
      const idsParam = ids.join(',');
      const url = `${process.env.REACT_APP_API_URL?.replace('/api', '')}/boleto/web/multiplos?ids=${idsParam}&print=true`;
      window.open(url, '_blank');
    } else {
      showNotification('Nenhum título selecionado', 'info');
    }
  };

  const handleImprimirTodosEmAberto = () => {
    const titulosEmAberto = parcelas.filter((p: CarneParcela) => 
      p.status === 'pendente' || p.status === 'vencido'
    );
    
    if (titulosEmAberto.length > 0) {
      const ids = titulosEmAberto.map((item: CarneParcela) => item.id);
      const idsParam = ids.join(',');
      const url = `${process.env.REACT_APP_API_URL?.replace('/api', '')}/boleto/web/multiplos?ids=${idsParam}&print=true`;
      window.open(url, '_blank');
    } else {
      showNotification('Não há títulos em aberto para imprimir', 'info');
    }
  };

  const handleEditarParcela = (selectedItems: CarneParcela[]) => {
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


  // Função para obter a cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'success';
      case 'pago_atraso':
        return 'warning';
      case 'pendente':
        return 'primary';
      case 'vencido':
        return 'danger';
      case 'parcial':
        return 'info';
      case 'cancelado':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const parcelasColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'numero_titulo', label: 'Título', sortable: true },
    { 
      key: 'status', 
      label: 'Status', 
      render: (item: CarneParcela) => (
        <span className={`badge bg-${getStatusColor(item.status)}`}>
          {item.status}
        </span>
      )
    },
    { key: 'valor', label: 'Valor', render: (item: CarneParcela) => {
        const valor = parseFloat(String(item.valor_parcela)) || 0;
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
                  action: () => {
                    setShowParcelaCreateModal(true);
                  }
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
                  label: 'Consultar Recebimento',
                  action: async (selectedItems) => {
                    if (selectedItems.length > 0) {
                      const item = selectedItems[0];
                      if (!item.charge_id) {
                        showNotification('Título não possui charge_id (não foi registrado no banco)', 'warning');
                        return;
                      }

                      try {
                        const resultado = await TituloService.consultarRecebimento(item.id);
                        showNotification(resultado.message, 'success');
                        refetchParcelas();
                      } catch (err: any) {
                        showNotification(err.message || 'Erro ao consultar recebimento.', 'error');
                      }
                    }
                  },
                  disabled: (selectedItems) => selectedItems.length !== 1 || !selectedItems[0].charge_id
                },
                {
                  label: 'Estornar',
                  action: async (selectedItems) => {
                    if (selectedItems.length > 0) {
                      const item = selectedItems[0];
                      if (item.status === 'pago' || item.status === 'pago_atraso') {
                        const confirmar = window.confirm(
                          `Tem certeza que deseja estornar o título ${item.numero_titulo}?\n\n` +
                          `Valor: R$ ${item.valor_pago || item.valor}\n` +
                          `O título voltará para status PENDENTE.`
                        );
                        
                        if (confirmar) {
                          try {
                            await TituloService.estornar(item.id);
                            showNotification('Título estornado com sucesso!', 'success');
                            refetchParcelas();
                          } catch (err: any) {
                            showNotification(err.message || 'Erro ao estornar título.', 'error');
                          }
                        }
                      } else {
                        showNotification('Só é possível estornar títulos que estão pagos', 'info');
                      }
                    }
                  },
                  disabled: (selectedItems) => {
                    if (selectedItems.length === 0) return true;
                    return selectedItems.every(item => item.status !== 'pago' && item.status !== 'pago_atraso');
                  }
                },
                {
                  label: 'Imprimir',
                  dropdown: [
                    {
                      label: `Imprimir Selecionados (${selectedItems.length})`,
                      action: handleImprimirSelecionados
                    },
                    {
                      label: 'Imprimir Todos em Aberto',
                      action: handleImprimirTodosEmAberto
                    }
                  ]
                }
              ]}
              onSort={handleSortParcelas}
              sortColumn={sortColumnParcelas}
              sortDirection={sortDirectionParcelas}
              onRefresh={refetchParcelas}
              onSelectionChange={setSelectedItems}
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
