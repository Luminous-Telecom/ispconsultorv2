import React, { useState } from 'react';
import { AxiosError } from 'axios';
import Table from '../../tables/Table';
import { TableConfig } from '../../tables/types';
import { useTitulos } from '../../../hooks/useTitulos';
import { useMarcarTituloPago } from '../../../hooks/useTitulos';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { TituloEditModal, TituloCreateModal } from '../../modals/titulos';
import { TituloService } from '../../../services/tituloService';
import { Cliente, CarneParcela } from '../../../types';
import { useImprimir } from '../../../hooks/useImprimir';

interface ClienteFinanceiroProps {
  cliente: Cliente;
}

const ClienteFinanceiro: React.FC<ClienteFinanceiroProps> = ({ 
  cliente
}) => {
  const [showParcelaEditModal, setShowParcelaEditModal] = useState(false);
  const [selectedParcelaId, setSelectedParcelaId] = useState<number | null>(null);
  const [showParcelaCreateModal, setShowParcelaCreateModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<CarneParcela[]>([]);
  const { addNotification } = useNotificationContext();

  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    addNotification(type, message);
  };

  // Hook para impressão
  const { handleImprimirSelecionados, handleImprimirTodos } = useImprimir({
    itemType: 'titulo',
    filterCondition: (p) => {
      const parcela = p as CarneParcela;
      return parcela.status === 'pendente' || parcela.status === 'vencido';
    },
    filterLabel: 'Todos em Aberto'
  });

  // Buscar parcelas do cliente
  const { data: parcelasData, isLoading: parcelasLoading, refetch: refetchParcelas } = useTitulos({ 
    cliente_id: cliente?.id 
  });

  
  const marcarPagoMutation = useMarcarTituloPago();

  const parcelas = parcelasData?.data || [];

  // Adicionar campos virtuais para busca funcionar
  const parcelasWithVirtualFields = React.useMemo(() => {
    return parcelas.map((p: CarneParcela) => ({
      ...p,
      // Adicionar campos virtuais para busca funcionar
      numero_titulo_str: (p.numero_titulo || p.numero_parcela || p.id).toString(),
      valor_str: (p.valor || p.valor_parcela || 0).toString(),
      valor_pago_str: (p.valor_pago || 0).toString()
    }));
  }, [parcelas]);

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

  const parcelasColumns: TableConfig<CarneParcela & { numero_titulo_str?: string; valor_str?: string; valor_pago_str?: string }>['columns'] = [
    { key: 'id', label: 'ID', sortable: true, searchable: true },
    { 
      key: 'numero_titulo_str', 
      label: 'Título', 
      sortable: true,
      searchable: true,
      render: (item: CarneParcela & { numero_titulo_str?: string }) => item.numero_titulo || item.numero_parcela || item.numero_titulo_str || '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => (
        <span className={`badge bg-${getStatusColor(item.status)}`}>
          {item.status}
        </span>
      )
    },
    { 
      key: 'valor_str', 
      label: 'Valor',
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => {
        const valor = parseFloat(String(item.valor || item.valor_parcela || 0)) || 0;
        return `R$ ${valor.toFixed(2)}`;
      }
    },
    { 
      key: 'data_vencimento', 
      label: 'Vencimento', 
      sortable: true,
      searchable: false,
      render: (item: CarneParcela) => item.data_vencimento ? new Date(item.data_vencimento).toLocaleDateString('pt-BR') : '-'
    },
    { 
      key: 'data_pagamento', 
      label: 'Pagamento', 
      sortable: true,
      searchable: false,
      render: (item: CarneParcela) => item.data_pagamento ? new Date(item.data_pagamento).toLocaleDateString('pt-BR') : '-'
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

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Títulos Individuais ({parcelas.length})</h6>
        </div>

            
            <Table
              config={{
                columns: parcelasColumns,
                data: parcelasWithVirtualFields,
                loading: parcelasLoading,
                searchable: true,
                searchPlaceholder: 'Buscar por ID, título, valor, status...',
                sortable: true,
                striped: true,
                hover: true,
                responsive: true,
                bulkActions: [
                  {
                    key: 'novo-titulo',
                    label: 'Novo Título',
                    onClick: () => {
                      setShowParcelaCreateModal(true);
                    }
                  },
                  {
                    key: 'editar',
                    label: 'Editar',
                    onClick: handleEditarParcela
                  },
                  {
                    key: 'marcar-pago',
                    label: 'Marcar como Pago',
                    onClick: handleMarcarPago,
                    disabled: (selectedItems) => selectedItems.every(item => item.status === 'pago')
                  },
                  {
                    key: 'consultar-recebimento',
                    label: 'Consultar Recebimento',
                    onClick: async (selectedItems: CarneParcela[]) => {
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
                        } catch (err) {
                          const axiosError = err as AxiosError<{ message?: string }>;
                          showNotification(axiosError?.response?.data?.message || 'Erro ao consultar recebimento.', 'error');
                        }
                      }
                    },
                    disabled: (selectedItems) => selectedItems.length !== 1 || !selectedItems[0].charge_id
                  },
                  {
                    key: 'estornar',
                    label: 'Estornar',
                    onClick: async (selectedItems: CarneParcela[]) => {
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
                            } catch (err) {
                              const axiosError = err as AxiosError<{ message?: string }>;
                              showNotification(axiosError?.response?.data?.message || 'Erro ao estornar título.', 'error');
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
                    key: 'imprimir',
                    label: 'Imprimir',
                    variant: 'primary',
                    dropdown: [
                      {
                        label: `Imprimir Selecionados (${selectedItems.length})`,
                        action: () => handleImprimirSelecionados(selectedItems.map(item => item.id).join(','))
                      },
                      {
                        label: `Imprimir Todos em Aberto`,
                        action: () => {
                          const titulosAbertos = parcelas.filter((p: CarneParcela) => p.status === 'pendente' || p.status === 'vencido');
                          handleImprimirTodos(titulosAbertos.map(item => item.id).join(','));
                        }
                      }
                    ],
                    disabled: () => false
                  }
                ],
                emptyMessage: 'Nenhuma parcela encontrada'
              }}
              tableId="cliente-financeiro"
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
