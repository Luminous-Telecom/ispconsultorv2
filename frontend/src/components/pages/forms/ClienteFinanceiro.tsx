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
  const [sortColumnParcelas, setSortColumnParcelas] = useState<string>('id');
  const [sortDirectionParcelas, setSortDirectionParcelas] = useState<'asc' | 'desc'>('desc');
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
      let aValue: string | number | null | undefined = a[sortColumnParcelas as keyof CarneParcela] as string | number | null | undefined;
      let bValue: string | number | null | undefined = b[sortColumnParcelas as keyof CarneParcela] as string | number | null | undefined;

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

  const parcelasColumns: TableConfig<CarneParcela>['columns'] = [
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

            
            <Table
              config={{
                columns: parcelasColumns,
                data: getSortedParcelas(),
                loading: parcelasLoading,
                searchable: true,
                searchPlaceholder: 'Número da parcela',
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
              onSort={handleSortParcelas}
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
