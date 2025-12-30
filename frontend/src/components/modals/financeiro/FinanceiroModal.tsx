import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTitulosFinanceiro } from '@/hooks/useTitulosFinanceiro';
import { Titulo, TituloFilters } from '@/types';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useSorting } from '@/hooks/useSorting';
import { useTableFilters } from '@/hooks/useTableFilters';
import { TituloService } from '@/services/tituloService';
import { formatDate, formatDateTime } from '@/utils/formatters';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { TableConfig, BulkAction } from '@/components/tables/types';
import { TituloModal } from '@/components/modals/titulos';
import ReceberModal from '@/components/modals/pagamentos/ReceberModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useAuditoria } from '@/hooks/useAuditoria';

interface FinanceiroModalProps {
  show: boolean;
  onClose: () => void;
  onSelectTitulo?: (titulo: Titulo) => void;
  skipWrapper?: boolean;
}

const FinanceiroModal: React.FC<FinanceiroModalProps> = ({
  show,
  onClose,
  onSelectTitulo,
  skipWrapper = false
}) => {
  const isMobile = useIsMobile();
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });
  
  const [selectedItems, setSelectedItems] = useState<Titulo[]>([]);
  const [searchField, setSearchField] = useState<string>('numero_titulo');
  const [showCancelados, setShowCancelados] = useState(false);
  const [dataVencimentoInicio, setDataVencimentoInicio] = useState<string>('');
  const [dataVencimentoFim, setDataVencimentoFim] = useState<string>('');
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [showReceberModal, setShowReceberModal] = useState(false);
  
  interface SelectedParcela {
    id: number;
    numero_titulo: string;
    valor_parcela: number;
    data_vencimento: string;
    cliente?: { razao_social: string };
  }
  
  const [selectedParcela, setSelectedParcela] = useState<SelectedParcela | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  const auditoria = useAuditoria();

  const handleAudit = (titulo: Titulo) => {
    auditoria.handleAudit('Titulo', titulo.id);
  };
  
  // Resetar página quando filtros específicos mudarem
  useEffect(() => {
    tableFilters.setPage(1);
  }, [showCancelados, dataVencimentoInicio, dataVencimentoFim, tableFilters]);
  
  const filters: TituloFilters = {
    page: tableFilters.page,
    limit: tableFilters.limit,
    search: tableFilters.debouncedSearch || undefined,
    searchField: searchField || undefined,
    // Aplicar filtro de status no backend quando não mostrar cancelados
    ...(showCancelados ? {} : { status: '!cancelado' }),
    // Aplicar filtros de data de vencimento se preenchidos
    ...(dataVencimentoInicio ? { data_vencimento_inicio: dataVencimentoInicio } : {}),
    ...(dataVencimentoFim ? { data_vencimento_fim: dataVencimentoFim } : {})
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
    const currentPage = typeof pag.current_page === 'number' ? pag.current_page : tableFilters.page;
    // Usar o limite atual do estado, não o do backend (pode estar desatualizado)
    const perPage = tableFilters.limit;
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
  }, [titulosData, tableFilters.limit, tableFilters.page]);

  const sortedData = useSorting(titulos as unknown as Record<string, unknown>[], tableFilters.sortColumn, tableFilters.sortDirection) as unknown as Titulo[];

  // Limpar filtros quando o modal fechar
  useEffect(() => {
    if (!show) {
      setDataVencimentoInicio('');
      setDataVencimentoFim('');
      tableFilters.clearSearch();
      tableFilters.setPage(1);
      setSelectedItems([]);
    }
  }, [show, tableFilters]);

  // Dados filtrados para usar no resumo financeiro (já filtrados pelo backend)
  const filteredData = sortedData;

  const formatCurrency = (value: number | string | null | undefined): string => {
    if (!value) return 'R$ 0,00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `R$ ${numValue.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
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
    // Abrir modal imediatamente
    setShowImprimirModal(true);
    setIsGeneratingPdf(true);
    
    // Limpar URL anterior se existir
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    
    try {
      const ids = selectedItems.map(item => item.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      
      success('Boletos selecionados gerados com sucesso!');
    } catch (err) {
      error('Erro ao gerar boletos selecionados');
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [selectedItems, error, success, pdfUrl]);

  const handleImprimirRecibos = useCallback(async () => {
    if (selectedItems.length === 0) {
      error('Nenhum título selecionado');
      return;
    }

    // Filtrar apenas itens pagos
    const itensPagos = selectedItems.filter(item => item.status === 'pago' || item.status === 'pago_atraso');
    
    if (itensPagos.length === 0) {
      error('Nenhum título pago selecionado. Apenas títulos pagos podem ter recibo.');
      return;
    }

    // Abrir modal imediatamente
    setShowImprimirModal(true);
    setIsGeneratingPdf(true);
    
    // Limpar URL anterior se existir
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    
    try {
      const ids = itensPagos.map(item => item.id).join(',');
      const axios = (await import('axios')).default;
      const token = localStorage.getItem('auth_token');
      
      const response = await axios.get(`/api/recibo/web/multiplos?ids=${ids}`, {
        responseType: 'blob',
        timeout: 120000,
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      const url = window.URL.createObjectURL(response.data);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      success(`${itensPagos.length} recibo(s) gerado(s) com sucesso!`);
    } catch (err) {
      error('Erro ao gerar recibos');
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [selectedItems, error, success, pdfUrl]);

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
    // Abrir modal imediatamente
    setShowImprimirModal(true);
    setIsGeneratingPdf(true);
    
    // Limpar URL anterior se existir
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    
    try {
      const ids = titulosEmAberto.map((titulo: Titulo) => titulo.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      
      success('Boletos em aberto gerados com sucesso!');
    } catch (err) {
      error('Erro ao gerar boletos em aberto');
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [titulos, error, success, pdfUrl]);

  const columns: TableConfig<Titulo>['columns'] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => <span>{item.id}</span>
    },
    {
      key: 'cliente',
      label: 'Cliente',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => {
        if (item.cliente) {
          return item.cliente.razao_social || item.cliente.nome_fantasia || '-';
        }
        return '-';
      }
    },
    {
      key: 'contrato_id',
      label: 'Contrato',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.contrato_id || '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => getStatusBadge(item.status)
    },
    {
      key: 'plano_nome',
      label: 'Plano',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.plano?.nome_plano || '-'
    },
    {
      key: 'numero_titulo',
      label: 'Nº Título',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => <div className="fw-bold">{item.numero_titulo || '-'}</div>
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => formatDate(item.data_vencimento)
    },
    {
      key: 'valor',
      label: 'Valor',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => formatCurrency(item.valor_final || item.valor)
    },
    {
      key: 'valor_pago',
      label: 'Valor baixado',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => {
        return item.status === 'pago' ? formatCurrency(item.valor_pago || item.valor || 0) : formatCurrency(0);
      }
    },
    {
      key: 'valor_aberto',
      label: 'Valor aberto',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => {
        return (item.status === 'pago' || item.status === 'cancelado') ? formatCurrency(0) : formatCurrency(item.valor_final || item.valor || 0);
      }
    },
    {
      key: 'data_pagamento',
      label: 'Data Pagamento',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => {
        // Usar data_pagamento_formatada se disponível (vem do backend já formatada)
        if (item.data_pagamento_formatada) {
          return item.data_pagamento_formatada;
        }
        // Fallback para formatDate se não tiver formato do backend
        return item.data_pagamento ? formatDate(item.data_pagamento) : '-';
      }
    },
    {
      key: 'charge_id',
      label: 'Charge ID',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.charge_id || '-'
    },
    {
      key: 'nosso_numero',
      label: 'Nosso Número',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.nosso_numero || '-'
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      searchable: false,
      render: (item: Titulo) => {
        // Usar created_at_formatada se disponível (vem do backend já formatada)
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        // Fallback para formatDateTime se não tiver formato do backend
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
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
        label: 'Imprimir',
        variant: 'primary' as const,
        dropdown: [
          {
            label: 'Selecionados',
            action: handleImprimirSelecionados
          },
          {
            label: 'Abertos',
            action: handleImprimirTodosEmAberto
          },
          {
            label: 'Recibo',
            action: handleImprimirRecibos,
            disabled: (selectedItems: Titulo[]) => {
              if (selectedItems.length === 0) return true;
              // Apenas itens pagos podem ter recibo
              const itensPagos = selectedItems.filter(item => item.status === 'pago' || item.status === 'pago_atraso');
              return itensPagos.length === 0;
            }
          }
        ]
      }
    ];
  }, [success, error, queryClient, refetch, handleImprimirSelecionados, handleImprimirTodosEmAberto, handleImprimirRecibos]);

  const modalContent = (
    <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
              config={{
                columns,
                data: sortedData,
                loading: isLoading,
                searchable: true,
                searchPlaceholder: 'Buscar por número, cliente ou observações...',
                searchFields: [
                  { key: 'id', label: 'ID' },
                  { key: 'numero_titulo', label: 'Número Título' },
                  { key: 'cliente', label: 'Cliente' },
                  { key: 'plano_nome', label: 'Plano' },
                  { key: 'contrato_id', label: 'Contrato' },
                  { key: 'status', label: 'Status' },
                  { key: 'valor', label: 'Valor' },
                  { key: 'valor_pago', label: 'Valor Pago' },
                  { key: 'charge_id', label: 'Charge ID' },
                  { key: 'nosso_numero', label: 'Nosso Número' }
                ],
                sortable: true,
                striped: true,
                hover: true,
                responsive: true,
                selectable: true,
                multiSelect: !onSelectTitulo,
                bulkActions: memoizedBulkActions.map((action: BulkAction<Titulo>) => {
                  let disabledFunc: ((selectedItems: Titulo[]) => boolean) | undefined;
                  if (action.disabled !== undefined) {
                    if (typeof action.disabled === 'function') {
                      disabledFunc = action.disabled;
                    } else if (typeof action.disabled === 'boolean') {
                      const disabledValue = action.disabled;
                      disabledFunc = () => disabledValue;
                    }
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
                ),
                customControlsAfterActions: (
                  <div className="d-flex align-items-center gap-2">
                    <label htmlFor="dataVencimentoInicio" className="form-label mb-0 small">Data Inicial:</label>
                    <input
                      type="date"
                      id="dataVencimentoInicio"
                      className="form-control form-control-sm"
                      style={{ width: '150px' }}
                      value={dataVencimentoInicio}
                      onChange={(e) => setDataVencimentoInicio(e.target.value)}
                    />
                    <label htmlFor="dataVencimentoFim" className="form-label mb-0 small">Data Final:</label>
                    <input
                      type="date"
                      id="dataVencimentoFim"
                      className="form-control form-control-sm"
                      style={{ width: '150px' }}
                      value={dataVencimentoFim}
                      onChange={(e) => setDataVencimentoFim(e.target.value)}
                    />
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
              onSort={tableFilters.setSort}
              onSearch={(term, field) => {
                tableFilters.setSearch(term);
                if (field) {
                  setSearchField(field);
                }
              }}
              onSearchFieldChange={(field) => {
                setSearchField(field);
              }}
              onPageChange={tableFilters.setPage}
              onPageSizeChange={tableFilters.setLimit}
              onRefresh={refetch}
              onAudit={handleAudit}
              auditEntity="Titulo"
            />
            </div>

        {/* Resumo Financeiro */}
        {filteredData.length > 0 && (
          <div className="d-flex justify-content-end align-items-center p-3 bg-light rounded financeiro-resumo" style={{ marginTop: isMobile ? '0.25rem' : '1rem', marginBottom: isMobile ? '3rem' : '1rem', marginLeft: isMobile ? '0.5rem' : '1rem', marginRight: isMobile ? '0.5rem' : '1rem' }}>
            <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
              <div className="text-end">
                <div className="small text-muted">Valor:</div>
                <strong>{formatCurrency(filteredData.reduce((sum: number, item: Titulo) => {
                  return sum + Number(item.valor_final || item.valor || 0);
                }, 0))}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor baixado:</div>
                <strong>{formatCurrency(filteredData.reduce((sum: number, item: Titulo) => {
                  // Considerar apenas valor_pago se existir e for maior que 0
                  const valorPago = Number(item.valor_pago || 0);
                  if (valorPago > 0) {
                    return sum + valorPago;
                  }
                  return sum;
                }, 0))}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor aberto:</div>
                <strong>{formatCurrency(filteredData.reduce((sum: number, item: Titulo) => {
                  // Considerar apenas títulos pendentes ou vencidos (não pagos e não cancelados)
                  if (item.status === 'pago' || item.status === 'cancelado') {
                    return sum;
                  }
                  // Calcular valor aberto: valor final - valor pago
                  const valorFinal = Number(item.valor_final || item.valor || 0);
                  const valorPago = Number(item.valor_pago || 0);
                  const valorAberto = valorFinal - valorPago;
                  return sum + (valorAberto > 0 ? valorAberto : 0);
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
    </div>
  );

  if (skipWrapper) {
    return (
      <>
        {modalContent}
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
          isGenerating={isGeneratingPdf}
          title="Visualizar Documento"
          modalId="financeiro-imprimir-modal"
        />

        {/* Modal de Visualização de PDF de Auditoria */}
        <ImprimirModal
          show={auditoria.showPreview}
          onClose={auditoria.handleClosePreview}
          pdfUrl={auditoria.pdfUrl}
          isGenerating={auditoria.isGeneratingPdf}
          title="Relatórios de logs"
          modalId="auditoria-titulo-modal"
        />
      </>
    );
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Financeiro - Títulos"
        size="xl"
        modalId="financeiro-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>

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

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        title="Relatórios de logs"
        modalId="auditoria-titulo-modal"
      />
    </>
  );
};

export default FinanceiroModal;
