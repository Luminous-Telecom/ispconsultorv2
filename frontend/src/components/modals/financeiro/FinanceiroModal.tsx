import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTitulosFinanceiro } from '../../../hooks/useTitulosFinanceiro';
import { Titulo, TituloFilters } from '../../../types';
import { useNotificationContext } from '../../../components/notifications/NotificationProvider';
import { useQueryClient } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import Table from '../../tables/Table';
import { TableConfig } from '../../tables/types';
import { useSorting } from '../../../hooks/useSorting';
import { TituloService } from '../../../services/tituloService';
import { TituloModal } from '../titulos';
import ReceberModal from '../pagamentos/ReceberModal';
import ImprimirModal from '../../common/ImprimirModal';

interface FinanceiroModalProps {
  show: boolean;
  onClose: () => void;
  onSelectTitulo?: (titulo: Titulo) => void;
}

const FinanceiroModal: React.FC<FinanceiroModalProps> = ({
  show,
  onClose,
  onSelectTitulo
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedItems, setSelectedItems] = useState<Titulo[]>([]);
  const [showCancelados, setShowCancelados] = useState(false);
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [selectedParcela, setSelectedParcela] = useState<{
    id: number;
    numero_titulo: string;
    valor_parcela: number;
    data_vencimento: string;
    cliente?: {
      razao_social: string;
    };
  } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  
  const filters: TituloFilters = {
    page,
    limit,
    search: search || undefined,
    // Aplicar filtro de status no backend quando não mostrar cancelados
    ...(showCancelados ? {} : { status: '!cancelado' })
  };

  const { data: titulosData, isLoading, refetch } = useTitulosFinanceiro(filters);


  const titulos = useMemo(() => titulosData?.data || [], [titulosData?.data]);
  
  // Paginação do backend - usar valores do backend quando disponíveis
  const pagination = useMemo(() => {
    if (!titulosData || !titulosData.pagination) {
      return undefined;
    }
    
    const pag = titulosData.pagination;
    
    // Garantir que todos os valores são números válidos
    const currentPage = typeof pag.current_page === 'number' ? pag.current_page : page;
    // Usar o limite atual do estado, não o do backend (pode estar desatualizado)
    const perPage = limit;
    // Usar total do backend
    const total = typeof pag.total === 'number' ? pag.total : 0;
    
    // Recalcular last_page com o limite atual
    const lastPage = total > 0 ? Math.ceil(total / perPage) : 1;
    // Recalcular from e to com o limite atual
    const from = total > 0 ? ((currentPage - 1) * perPage) + 1 : 0;
    const to = total > 0 ? Math.min(currentPage * perPage, total) : 0;
    
    return {
      current_page: currentPage,
      last_page: lastPage,
      per_page: perPage,
      total: total,
      from: from,
      to: to
    };
  }, [titulosData, limit, page]);

  const sortedData = useSorting(titulos as unknown as Record<string, unknown>[], sortColumn, sortDirection) as unknown as Titulo[];

  // Resetar página quando o filtro mudar
  useEffect(() => {
    setPage(1);
  }, [showCancelados]);

  // Dados filtrados para usar no resumo financeiro (já filtrados pelo backend)
  const filteredData = sortedData;

  const formatCurrency = (value: number | string | null | undefined): string => {
    if (!value) return 'R$ 0,00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `R$ ${numValue.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      'pendente': { label: 'Pendente', className: 'bg-warning' },
      'pago': { label: 'Pago', className: 'bg-success' },
      'vencido': { label: 'Vencido', className: 'bg-danger' },
      'cancelado': { label: 'Cancelado', className: 'bg-secondary' },
      'parcial': { label: 'Parcial', className: 'bg-info' },
      'pago_atraso': { label: 'Pago em Atraso', className: 'bg-primary' }
    };

    const config = statusConfig[status] || { label: status, className: 'bg-secondary' };
    return (
      <span className={`badge ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Funções para impressão
  const handleImprimirSelecionados = useCallback(async () => {
    if (selectedItems.length === 0) {
      error('Nenhum título selecionado');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const ids = selectedItems.map(item => item.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setShowImprimirModal(true);
      
      success('Boletos selecionados gerados com sucesso!');
    } catch (err) {
      error('Erro ao gerar boletos selecionados');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [selectedItems, error, success]);

  const handleImprimirTodosEmAberto = useCallback(async () => {
    if (!titulos || titulos.length === 0) {
      error('Nenhum título encontrado');
      return;
    }
    const titulosEmAberto = titulos.filter((titulo: Titulo) => 
      titulo.status === 'pendente' || titulo.status === 'vencido'
    );
    if (titulosEmAberto.length === 0) {
      error('Nenhum título em aberto encontrado');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const ids = titulosEmAberto.map((titulo: Titulo) => titulo.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setShowImprimirModal(true);
      
      success('Boletos em aberto gerados com sucesso!');
    } catch (err) {
      error('Erro ao gerar boletos em aberto');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [titulos, error, success]);

  const columns: TableConfig<Titulo>['columns'] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => <span>{item.id}</span>
    },
    {
      key: 'numero_titulo',
      label: 'Número',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => <div className="fw-bold">{item.numero_titulo}</div>
    },
    {
      key: 'cliente_razao_social',
      label: 'Cliente',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => (
        <div>{item.cliente?.razao_social || item.cliente?.nome_fantasia || '-'}</div>
      )
    },
    {
      key: 'plano_nome',
      label: 'Plano',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.plano?.nome_plano || '-'
    },
    {
      key: 'valor',
      label: 'Valor',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => formatCurrency(item.valor_final || item.valor)
    },
    {
      key: 'valor_pago',
      label: 'Valor Pago',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => formatCurrency(item.valor_pago)
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => formatDate(item.data_vencimento)
    },
    {
      key: 'data_pagamento',
      label: 'Pagamento',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => formatDate(item.data_pagamento)
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => getStatusBadge(item.status)
    }
  ];

  // Memoizar bulkActions
  const memoizedBulkActions = useMemo(() => {
    return [
      {
        key: 'editar',
        label: 'Editar',
        variant: 'primary' as const,
        onClick: (selectedItems: Titulo[]) => {
          if (selectedItems.length > 0) {
            const item = selectedItems[0];
            setSelectedTituloId(item.id);
            setShowTituloEditModal(true);
          }
        },
        disabled: (selectedItems: Titulo[]): boolean => selectedItems.length !== 1
      },
      {
        key: 'receber',
        label: 'Receber',
        variant: 'success' as const,
        onClick: (selectedItems: Titulo[]) => {
          if (selectedItems.length > 0) {
            const item = selectedItems[0];
            setSelectedParcela({
              id: item.id,
              numero_titulo: item.numero_titulo,
              valor_parcela: Number(item.valor_final || item.valor),
              data_vencimento: item.data_vencimento,
              cliente: item.cliente ? {
                razao_social: item.cliente.razao_social || item.cliente.nome_fantasia || ''
              } : undefined
            });
            setShowReceberModal(true);
          }
        },
        disabled: (selectedItems: Titulo[]): boolean => {
          if (selectedItems.length === 0) return true;
          return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
        }
      },
      {
        key: 'cancelar',
        label: 'Cancelar',
        variant: 'danger' as const,
        onClick: async (selectedItems: Titulo[]) => {
          if (selectedItems.length > 0) {
            const confirmMessage = selectedItems.length === 1 
              ? 'Tem certeza que deseja cancelar este título?'
              : `Tem certeza que deseja cancelar ${selectedItems.length} títulos?`;
              
            if (window.confirm(confirmMessage)) {
              try {
                let successCount = 0;
                let errorCount = 0;
                
                for (const item of selectedItems) {
                  try {
                    await TituloService.update(item.id, { status: 'cancelado' });
                    successCount++;
                  } catch (err) {
                    errorCount++;
                  }
                }
                
                if (successCount > 0) {
                  const message = successCount === 1 
                    ? 'Título cancelado com sucesso!'
                    : `${successCount} títulos cancelados com sucesso!`;
                  success(message);
                }
                
                if (errorCount > 0) {
                  const message = errorCount === 1 
                    ? '1 título não pôde ser cancelado'
                    : `${errorCount} títulos não puderam ser cancelados`;
                  error(message);
                }
                
                queryClient.invalidateQueries({ queryKey: ['titulos-financeiro'] });
                refetch();
              } catch (err) {
                error('Erro ao cancelar títulos');
              }
            }
          }
        },
        disabled: (selectedItems: Titulo[]): boolean => {
          if (selectedItems.length === 0) return true;
          return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
        }
      },
      {
        key: 'estornar',
        label: 'Estornar',
        variant: 'warning' as const,
        onClick: async (selectedItems: Titulo[]) => {
          if (selectedItems.length > 0) {
            const item = selectedItems[0];
            if (item.status === 'pago') {
              const confirmar = window.confirm(
                `Tem certeza que deseja estornar o título ${item.numero_titulo || item.id}?\n\n` +
                `Valor: ${formatCurrency(item.valor_pago || item.valor || 0)}\n` +
                `O título voltará para status PENDENTE.`
              );
              
              if (confirmar) {
                try {
                  await TituloService.estornar(item.id);
                  success('Título estornado com sucesso!');
                  queryClient.invalidateQueries({ queryKey: ['titulos-financeiro'] });
                  refetch();
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : 'Erro ao estornar título.';
                  error(errorMessage);
                }
              }
            } else {
              error('Só é possível estornar títulos que estão pagos');
            }
          }
        },
        disabled: (selectedItems: Titulo[]): boolean => {
          if (selectedItems.length === 0) return true;
          return selectedItems.every(item => item.status !== 'pago');
        }
      },
      {
        key: 'imprimir',
        label: isGeneratingPdf ? 'Gerando...' : 'Imprimir',
        variant: 'primary' as const,
        disabled: () => isGeneratingPdf,
        dropdown: [
          {
            label: 'Selecionados',
            action: handleImprimirSelecionados
          },
          {
            label: 'Abertos',
            action: handleImprimirTodosEmAberto
          }
        ]
      }
    ];
  }, [isGeneratingPdf, success, error, queryClient, refetch, handleImprimirSelecionados, handleImprimirTodosEmAberto]);

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Financeiro - Títulos"
        size="xl"
        modalId="financeiro-modal"
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Table
              config={{
                columns,
                data: sortedData,
                loading: isLoading,
                searchable: true,
                searchPlaceholder: 'Buscar por número, cliente ou observações...',
                sortable: true,
                striped: true,
                hover: true,
                responsive: true,
                selectable: true,
                multiSelect: !onSelectTitulo,
                bulkActions: memoizedBulkActions.map(action => {
                  let disabledFunc: ((selectedItems: Titulo[]) => boolean) | undefined;
                  if (typeof action.disabled === 'function') {
                    disabledFunc = action.disabled;
                  } else if (typeof action.disabled === 'boolean') {
                    const disabledValue = action.disabled;
                    disabledFunc = () => disabledValue;
                  }
                  
                  return {
                    key: action.key,
                    label: action.label,
                    variant: action.variant,
                    onClick: action.onClick,
                    disabled: disabledFunc,
                    dropdown: action.dropdown
                  };
                }),
                emptyMessage: 'Nenhum título encontrado',
                pagination: pagination ? {
                  current_page: pagination.current_page,
                  last_page: pagination.last_page,
                  per_page: pagination.per_page,
                  total: pagination.total,
                  from: pagination.from,
                  to: pagination.to
                } : undefined,
                customControls: (
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="showCanceladosFinanceiro"
                      checked={showCancelados}
                      onChange={(e) => {
                        setShowCancelados(e.target.checked);
                      }}
                    />
                    <label className="form-check-label" htmlFor="showCanceladosFinanceiro">
                      Mostrar cancelados
                    </label>
                  </div>
                )
              }}
              tableId="financeiro-modal"
              onSelectionChange={(items) => {
                setSelectedItems(items);
                if (onSelectTitulo && items.length > 0) {
                  onSelectTitulo(items[items.length - 1]);
                  onClose();
                }
              }}
              onSort={(column, direction) => {
                setSortColumn(column);
                setSortDirection(direction);
              }}
              onSearch={setSearch}
              onPageChange={setPage}
              onPageSizeChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1); // Resetar página ao mudar limite
              }}
              onRefresh={refetch}
            />
          </div>

          {/* Resumo Financeiro */}
          {filteredData.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3 p-3 bg-light rounded">
              <div className="d-flex align-items-center">
                <i className="bi bi-info-circle text-muted me-2"></i>
                <span className="small text-muted">Legenda de cores</span>
              </div>
              <div className="d-flex gap-4">
                <div className="text-end">
                  <div className="small text-muted">Valor:</div>
                  <strong>{formatCurrency(filteredData.reduce((sum: number, item: Titulo) => {
                    return sum + Number(item.valor_final || item.valor || 0);
                  }, 0))}</strong>
                </div>
                <div className="text-end">
                  <div className="small text-muted">Valor baixado:</div>
                  <strong>{formatCurrency(filteredData.reduce((sum: number, item: Titulo) => {
                    if (item.pago && item.status === 'pago') {
                      return sum + Number(item.valor_pago || 0);
                    }
                    return sum;
                  }, 0))}</strong>
                </div>
                <div className="text-end">
                  <div className="small text-muted">Valor aberto:</div>
                  <strong>{formatCurrency(filteredData.reduce((sum: number, item: Titulo) => {
                    return sum + ((item.pago || item.status === 'cancelado') ? 0 : Number(item.valor_final || item.valor || 0));
                  }, 0))}</strong>
                </div>
                {showCancelados && (
                  <div className="text-end">
                    <div className="small text-muted">Valor cancelado:</div>
                    <strong>{formatCurrency(filteredData.reduce((sum: number, item: Titulo) => {
                      return sum + (item.status === 'cancelado' ? Number(item.valor_final || item.valor || 0) : 0);
                    }, 0))}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DraggableModal>

      {/* Modais auxiliares */}
      {showTituloEditModal && (
        <TituloModal
          show={showTituloEditModal}
          onClose={() => {
            setShowTituloEditModal(false);
            setSelectedTituloId(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['titulos-financeiro'] });
            refetch();
            setShowTituloEditModal(false);
            setSelectedTituloId(null);
          }}
          tituloId={selectedTituloId}
        />
      )}

      {showReceberModal && selectedParcela && (
        <ReceberModal
          isOpen={showReceberModal}
          onClose={() => {
            setShowReceberModal(false);
            setSelectedParcela(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['titulos-financeiro'] });
            refetch();
            setShowReceberModal(false);
            setSelectedParcela(null);
          }}
          parcela={selectedParcela}
        />
      )}

      {showImprimirModal && pdfUrl && (
        <ImprimirModal
          show={showImprimirModal}
          onClose={() => {
            setShowImprimirModal(false);
            if (pdfUrl) {
              window.URL.revokeObjectURL(pdfUrl);
              setPdfUrl(null);
            }
          }}
          pdfUrl={pdfUrl}
        />
      )}
    </>
  );
};

export default FinanceiroModal;
