import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTitulosFinanceiro } from '@/hooks/useTitulosFinanceiro';
import { Titulo, TituloFilters } from '@/types';
import { TituloItem } from '@/types/cliente';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useTableFilters } from '@/hooks/useTableFilters';
import { TituloService } from '@/services/tituloService';
import { formatDate, formatDateTime } from '@/utils/formatters';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { TableConfig, BulkAction } from '@/components/tables/types';
import { TituloModal } from '@/components/modals/titulos';
import ReceberModal from '@/components/modals/pagamentos/ReceberModal';
import { useI18n } from '@/contexts/I18nContext';
import ImprimirModal from '@/components/common/ImprimirModal';
import GerarNFeModal from '@/components/modals/notas-fiscais/GerarNFeModal';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useAuditoria } from '@/hooks/useAuditoria';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

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
  const { t } = useI18n();
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
  const { setPage, clearSearch } = tableFilters;
  
  const [selectedItems, setSelectedItems] = useState<Titulo[]>([]);
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
  const [showGerarNFeModal, setShowGerarNFeModal] = useState(false);
  const [selectedTituloForNFe, setSelectedTituloForNFe] = useState<Titulo | null>(null);

  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  const auditoria = useAuditoria();
  const { confirm, modalProps } = useConfirmModal();

  const handleAudit = (titulo: Titulo) => {
    auditoria.handleAudit('Titulo', titulo.id);
  };
  
  // Resetar página quando filtros específicos mudarem
  useEffect(() => {
    setPage(1);
  }, [showCancelados, dataVencimentoInicio, dataVencimentoFim, setPage]);

  // Limpar seleção de itens cancelados quando o filtro de ocultar cancelados for ativado
  useEffect(() => {
    if (!showCancelados && selectedItems.length > 0) {
      const canceladosSelecionados = selectedItems.filter(item => item.status?.toLowerCase() === 'cancelado');
      
      if (canceladosSelecionados.length > 0) {
        // Remover apenas os cancelados, mantendo os outros selecionados
        const itensNaoCancelados = selectedItems.filter(item => item.status?.toLowerCase() !== 'cancelado');
        setSelectedItems(itensNaoCancelados);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCancelados]);
  
  const filters: TituloFilters = {
    page: tableFilters.page,
    limit: tableFilters.limit,
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    // Aplicar filtro de status no backend quando não mostrar cancelados
    ...(showCancelados ? {} : { status: '!cancelado' }),
    // Aplicar filtros de data de vencimento se preenchidos
    ...(dataVencimentoInicio ? { data_vencimento_inicio: dataVencimentoInicio } : {}),
    ...(dataVencimentoFim ? { data_vencimento_fim: dataVencimentoFim } : {}),
    // Aplicar ordenação no backend - usar apiParams que já inclui sortColumn e sortDirection
    sortColumn: tableFilters.apiParams.sortColumn,
    sortDirection: tableFilters.apiParams.sortDirection
  };


  const { data: titulosData, isLoading, refetch } = useTitulosFinanceiro(filters);

  // Helper para invalidar queries e refetch
  const handleRefreshData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['titulos-financeiro'] });
    await refetch();
  }, [queryClient, refetch]);

  // Helper para limpar PDF URL
  const clearPdfUrl = useCallback(() => {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [pdfUrl]);

  // Helper para abrir modal de impressão
  const openPrintModal = useCallback(() => {
    clearPdfUrl();
    setShowImprimirModal(true);
    setIsGeneratingPdf(true);
  }, [clearPdfUrl]);

  // Helper para filtrar itens com NFS-e emitida
  const getItensComNFSe = useCallback((items: Titulo[]) => {
    return items.filter(item => item.nfse_status === 'emitida' && item.nfse_numero);
  }, []);

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


  // Limpar filtros quando o modal fechar
  useEffect(() => {
    if (!show) {
      setDataVencimentoInicio('');
      setDataVencimentoFim('');
      clearSearch();
      setPage(1);
      setSelectedItems([]);
    }
  }, [show, clearSearch, setPage]);

  // Limpar seleção quando os dados mudarem e houver itens inválidos
  useEffect(() => {
    if (titulosData?.data && selectedItems.length > 0) {
      // Verificar se algum item selecionado não existe mais nos dados
      const selectedIds = selectedItems.map(item => item.id);
      const currentIds = titulosData.data.map((titulo: Titulo) => titulo.id);
      const hasInvalidSelection = selectedIds.some(id => !currentIds.includes(id));
      
      if (hasInvalidSelection) {
        // Limpar seleção apenas se houver itens inválidos
        setSelectedItems([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulosData?.data]);

  // Dados filtrados para usar no resumo financeiro (já filtrados pelo backend)
  const filteredData = titulos;

  const formatCurrency = (value: number | string | null | undefined): string => {
    if (!value) return 'R$ 0,00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `R$ ${numValue.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };



  const getStatusBadge = useCallback((status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      'pendente': { label: t('status.pending'), className: 'bg-warning' },
      'pago': { label: t('status.paid'), className: 'bg-success' },
      'vencido': { label: t('status.overdue'), className: 'bg-danger' },
      'cancelado': { label: t('status.cancelled'), className: 'bg-secondary' },
      'parcial': { label: t('status.partial'), className: 'bg-info' },
      'pago_atraso': { label: t('status.paidLate'), className: 'bg-primary' }
    };

    const config = statusConfig[status] || { label: status, className: 'bg-secondary' };
    return (
      <span className={`badge ${config.className}`}>
        {config.label}
      </span>
    );
  }, [t]);

  // Funções para impressão
  const handleImprimirSelecionados = useCallback(async () => {
    if (selectedItems.length === 0) {
      error(t('messages.noTitleSelected'));
      return;
    }
    openPrintModal();
    
    try {
      const ids = selectedItems.map(item => item.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      
      success(t('messages.successPrintSelected'));
    } catch (err) {
      error(t('messages.errorPrintSelected'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [selectedItems, error, success, openPrintModal, t]);

  const handleImprimirRecibos = useCallback(async () => {
    if (selectedItems.length === 0) {
      error(t('messages.noTitleSelected'));
      return;
    }

    // Filtrar apenas itens pagos
    const itensPagos = selectedItems.filter(item => item.status === 'pago' || item.status === 'pago_atraso');
    
    if (itensPagos.length === 0) {
      error(t('messages.noPaidTitleSelected'));
      return;
    }

    openPrintModal();
    
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
      success(t('messages.receiptsGenerated', { count: itensPagos.length }));
    } catch (err) {
      error(t('messages.errorGeneratingReceipts'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [selectedItems, error, success, openPrintModal, t]);

  const handleImprimirTodosEmAberto = useCallback(async () => {
    if (!titulos || titulos.length === 0) {
      error(t('messages.noTitlesFound'));
      return;
    }
    const titulosEmAberto = titulos.filter((titulo: Titulo) => 
      titulo.status === 'pendente' || titulo.status === 'vencido'
    );
    if (titulosEmAberto.length === 0) {
      error(t('messages.noOpenTitlesFound'));
      return;
    }
    openPrintModal();
    
    try {
      const ids = titulosEmAberto.map((titulo: Titulo) => titulo.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
      
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      
      success(t('messages.successPrintOpen'));
    } catch (err) {
      error(t('messages.errorPrintOpen'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [titulos, error, success, openPrintModal, t]);

  const columns: TableConfig<Titulo>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      searchable: true,
      width: 42,
      resizable: true,
      render: (item: Titulo) => <span>{item.id}</span>
    },
    {
      key: 'cliente',
      label: t('table.client'),
      sortable: true,
      searchable: true,
      width: 220,
      resizable: true,
      render: (item: Titulo) => {
        if (item.cliente) {
          return item.cliente.razao_social || item.cliente.nome_fantasia || '-';
        }
        return '-';
      }
    },
    {
      key: 'contrato_id',
      label: t('table.contract'),
      sortable: true,
      searchable: true,
      width: 75,
      resizable: true,
      render: (item: Titulo) => item.contrato_id || '-'
    },
    {
      key: 'status',
      label: t('table.status'),
      sortable: true,
      searchable: true,
      width: 80,
      resizable: true,
      render: (item: Titulo) => getStatusBadge(item.status)
    },
    {
      key: 'plano_nome',
      label: t('table.plan'),
      sortable: true,
      searchable: true,
      width: 150,
      resizable: true,
      render: (item: Titulo) => item.plano?.nome_plano || '-'
    },
    {
      key: 'numero_titulo',
      label: t('table.titleNumber'),
      sortable: true,
      searchable: true,
      width: 120,
      resizable: true,
      render: (item: Titulo) => item.numero_titulo || '-'
    },
    {
      key: 'data_vencimento',
      label: t('table.dueDate'),
      sortable: true,
      searchable: false,
      width: 90,
      resizable: true,
      render: (item: Titulo) => formatDate(item.data_vencimento)
    },
    {
      key: 'valor',
      label: t('table.value'),
      sortable: true,
      searchable: true,
      width: 75,
      resizable: true,
      render: (item: Titulo) => formatCurrency(item.valor_final || item.valor)
    },
    {
      key: 'valor_pago',
      label: t('table.paidValue'),
      sortable: true,
      searchable: true,
      width: 100,
      resizable: true,
      render: (item: Titulo) => {
        return item.status === 'pago' ? formatCurrency(item.valor_pago || item.valor || 0) : formatCurrency(0);
      }
    },
    {
      key: 'valor_aberto',
      label: t('table.openValue'),
      sortable: true,
      searchable: true,
      width: 93,
      render: (item: Titulo) => {
        return (item.status === 'pago' || item.status === 'cancelado') ? formatCurrency(0) : formatCurrency(item.valor_final || item.valor || 0);
      }
    },
    {
      key: 'data_pagamento',
      label: t('table.paymentDate'),
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
      label: t('table.chargeId'),
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.charge_id || '-'
    },
    {
      key: 'nosso_numero',
      label: t('table.ourNumber'),
      sortable: true,
      searchable: true,
      width: 108,
      render: (item: Titulo) => item.nosso_numero || '-'
    },
    {
      key: 'nfse_numero',
      label: t('table.invoice'),
      sortable: true,
      searchable: true,
      width: 60,
      render: (item: Titulo) => item.nfse_numero || '-'
    },
    {
      key: 'nfse_status',
      label: t('table.invoiceStatus'),
      sortable: true,
      searchable: true,
      width: 85,
      render: (item: Titulo) => {
        if (!item.nfse_status) return '-';
        const statusMap: Record<string, { label: string; color: string }> = {
          'agendado': { label: t('status.scheduled'), color: 'info' },
          'emitida': { label: t('status.issued'), color: 'success' },
          'cancelada': { label: t('status.cancelled'), color: 'danger' },
          'rejeitada': { label: t('status.rejected'), color: 'warning' },
          'erro': { label: t('status.error'), color: 'danger' }
        };
        const status = statusMap[item.nfse_status] || { label: item.nfse_status, color: 'secondary' };
        return <span className={`badge bg-${status.color}`}>{status.label}</span>;
      }
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
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
  ], [t, getStatusBadge]);

  // Verificar se há títulos com NFS-e emitida
  const hasNFSeEmitida = useMemo(() => {
    return titulos.some(item => item.nfse_status === 'emitida' && item.nfse_numero);
  }, [titulos]);

  // Função para gerar PDF de NFS-e
  const handleImprimirNFSe = useCallback(async (selectedItems: Titulo[]) => {
    if (!selectedItems || selectedItems.length === 0) {
      error(t('messages.noNFSeTitlesSelected'));
      return;
    }
    const itensComNFSe = getItensComNFSe(selectedItems);
    if (itensComNFSe.length === 0) {
      error(t('messages.noNFSeTitlesSelected'));
      return;
    }
    
    openPrintModal();
    
    try {
      const ids = itensComNFSe.map(item => item.id).join(',');
      const { defaultApiClient } = await import('@/services/core/ApiClient');
      
      const response = await defaultApiClient.get(`/notas-fiscais/nfse/multiplos?ids=${ids}&print=true`, {
        responseType: 'blob'
      });
      
      if (response.data instanceof Blob) {
        const url = window.URL.createObjectURL(response.data);
        setPdfUrl(url);
        setIsGeneratingPdf(false);
        success(t('messages.nfseGenerated'));
      } else {
        throw new Error(t('messages.error'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('messages.errorGeneratingNFSe');
      error(errorMessage);
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [error, success, getItensComNFSe, openPrintModal, t]);

  // Memoizar bulkActions
  const memoizedBulkActions = useMemo(() => {
    return [
      {
        key: 'editar',
        label: t('buttons.edit'),
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
        label: t('buttons.receive'),
        variant: 'primary' as const,
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
        label: t('buttons.cancel'),
        variant: 'primary' as const,
        onClick: async (selectedItems: Titulo[]) => {
          if (selectedItems.length === 0) return;
          
          const confirmMessage = selectedItems.length === 1 
            ? t('messages.confirmCancelTitle')
            : t('messages.confirmCancelTitles', { count: selectedItems.length });
            
          const confirmed = await confirm({
            message: confirmMessage,
            variant: 'warning',
            title: t('financial.cancelTitles'),
            confirmText: t('actions.delete'),
            cancelText: t('ui.back'),
          });
          
          if (confirmed) {
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
                
                // Aguardar invalidação e refetch completarem antes de mostrar mensagem
                await handleRefreshData();
                
                // Limpar seleção após cancelamento
                setSelectedItems([]);
                
                if (successCount > 0) {
                  const message = successCount === 1 
                    ? t('financial.titleCanceled')
                    : `${successCount} ${t('financial.titlesCanceled')}`;
                  success(message);
                }
                
                if (errorCount > 0) {
                  const message = errorCount === 1 
                    ? t('financial.titleNotCanceled')
                    : `${errorCount} ${t('financial.titlesNotCanceled')}`;
                  error(message);
                }
              } catch (err) {
                error(t('financial.errorCanceling'));
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
        label: t('buttons.reverse'),
        variant: 'primary' as const,
        onClick: async (selectedItems: Titulo[]) => {
          if (selectedItems.length === 0) return;
          
          const item = selectedItems[0];
          if (item.status !== 'pago') {
            error(t('financial.canOnlyReversePaid'));
            return;
          }
          
          const confirmed = await confirm({
            message: `${t('messages.confirmDelete')}\n\n` +
              `${t('document.title')} ${item.numero_titulo || item.id}\n` +
              `${t('summary.value')} ${formatCurrency(item.valor_pago || item.valor || 0)}\n\n` +
              t('financial.titleWillReturnPending'),
            variant: 'warning',
            title: t('financial.reverseTitle'),
            confirmText: t('financial.reverse'),
            cancelText: t('actions.cancel'),
          });
          
          if (confirmed) {
                try {
                  await TituloService.estornar(item.id);
                  success(t('financial.titleReversed'));
                  handleRefreshData();
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : t('financial.errorReversing');
                  error(errorMessage);
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
        label: t('buttons.print'),
        variant: 'primary' as const,
        dropdown: [
          {
            label: t('other.selected'),
            action: handleImprimirSelecionados
          },
          {
            label: t('other.open'),
            action: handleImprimirTodosEmAberto
          },
          {
            label: t('other.receipt'),
            action: handleImprimirRecibos,
            disabled: (selectedItems: Titulo[]) => {
              if (selectedItems.length === 0) return true;
              const itensPagos = selectedItems.filter(item => item.status === 'pago' || item.status === 'pago_atraso');
              return itensPagos.length === 0;
            }
          },
          // Mostrar "Imprimir NF" apenas se houver NFS-e emitida
          ...(hasNFSeEmitida ? [{
            label: t('other.printNF'),
            action: (selectedItems?: Titulo[]) => handleImprimirNFSe(selectedItems || []),
            disabled: (items: Titulo[]) => {
              if (items.length === 0) return true;
              return getItensComNFSe(items).length === 0;
            }
          }] : [])
        ]
      },
      {
        key: 'nfse',
        label: t('actions.nfse'),
        variant: 'primary' as const,
        disabled: (selectedItems: Titulo[]): boolean => selectedItems.length === 0,
        dropdown: [
          {
            label: t('other.generateNFSeStandalone'),
            action: (selectedItems?: Titulo[]) => {
              if (!selectedItems || selectedItems.length === 0) {
                error(t('messages.noTitleSelected'));
                return;
              }
              const titulo = selectedItems[0];
              setSelectedTituloForNFe(titulo);
              setShowGerarNFeModal(true);
            },
            disabled: (selectedItems: Titulo[]) => {
              return !selectedItems || selectedItems.length === 0;
            }
          },
        ]
      }
    ];
  }, [success, error, handleRefreshData, handleImprimirSelecionados, handleImprimirTodosEmAberto, handleImprimirRecibos, hasNFSeEmitida, handleImprimirNFSe, getItensComNFSe, confirm, t]);

  const handleSearch = useCallback((term: string, field?: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearch(term);
      if (field) {
        tableFilters.setSearchField(field);
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearch, tableFilters.setSearchField]);

  const handleSearchFieldChange = useCallback((field: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearchField(field);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearchField]);

  const handleShowCanceladosChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShowCancelados(e.target.checked);
  }, []);

  const handleDataVencimentoInicioChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDataVencimentoInicio(e.target.value);
  }, []);

  const handleDataVencimentoFimChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDataVencimentoFim(e.target.value);
  }, []);

  const customControls = useMemo(() => (
    <div className="form-check">
      <input
        className="form-check-input"
        type="checkbox"
        id="showCanceladosFinanceiro"
        checked={showCancelados}
        onChange={handleShowCanceladosChange}
      />
      <label className="form-check-label" htmlFor="showCanceladosFinanceiro">
        {t('filter.showCanceled')}
      </label>
    </div>
  ), [showCancelados, handleShowCanceladosChange, t]);

  const customControlsAfterActions = useMemo(() => (
    <div className="d-flex align-items-center gap-2">
      <label htmlFor="dataVencimentoInicio" className="form-label mb-0 small">{t('filter.startDate')}</label>
      <input
        type="date"
        id="dataVencimentoInicio"
        className="form-control form-control-sm table-pagination-filter"
        value={dataVencimentoInicio}
        onChange={handleDataVencimentoInicioChange}
      />
      <label htmlFor="dataVencimentoFim" className="form-label mb-0 small">{t('filter.endDate')}</label>
      <input
        type="date"
        id="dataVencimentoFim"
        className="form-control form-control-sm table-pagination-filter"
        value={dataVencimentoFim}
        onChange={handleDataVencimentoFimChange}
      />
    </div>
  ), [dataVencimentoInicio, dataVencimentoFim, handleDataVencimentoInicioChange, handleDataVencimentoFimChange, t]);

  const tableConfig = useMemo(() => ({
    columns,
    data: titulos,
    loading: isLoading,
    searchable: true,
    searchPlaceholder: '',
    searchField: 'numero_titulo',
    searchFields: [
      { key: 'id', label: t('table.id') },
      { key: 'numero_titulo', label: t('table.titleNumber') },
      { key: 'cliente', label: t('table.client') },
      { key: 'plano_nome', label: t('table.plan') },
      { key: 'contrato_id', label: t('table.contract') },
      { key: 'status', label: t('table.status') },
      { key: 'valor', label: t('table.value') },
      { key: 'valor_pago', label: t('table.paidValue') },
      { key: 'charge_id', label: t('table.chargeId') },
      { key: 'nosso_numero', label: t('table.ourNumber') }
    ],
    sortable: false,
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
    emptyMessage: t('empty.noTitles'),
    pagination: pagination ? {
      current_page: pagination.current_page,
      last_page: pagination.last_page,
      per_page: pagination.per_page,
      total: pagination.total,
      from: pagination.from,
      to: pagination.to
    } : undefined,
    customControls,
    customControlsAfterActions
  }), [
    columns,
    titulos,
    isLoading,
    onSelectTitulo,
    memoizedBulkActions,
    pagination,
    customControls,
    customControlsAfterActions,
    t
  ]);

  const modalContent = (
    <div className="row financeiro-modal-content">
      <div className="col-12 financeiro-modal-col">
        <div className="financeiro-modal-table-container">
          <Table
              title={t('financial.title')}
              config={tableConfig}
              tableId="financeiro-modal"
              onSelectionChange={setSelectedItems}
              onSort={(column: string, direction: string) => {
              // Atualizar os filtros do tableFilters
              tableFilters.setSort(column, direction as 'asc' | 'desc');
            }}
              onSearch={handleSearch}
              onSearchFieldChange={handleSearchFieldChange}
              onPageChange={tableFilters.setPage}
              onPageSizeChange={tableFilters.setLimit}
              onRefresh={refetch}
              onAudit={handleAudit}
              auditEntity="Titulo"
            />
            </div>

        {/* Resumo Financeiro */}
        {filteredData.length > 0 && (
          <div className={`d-flex justify-content-end align-items-center p-3 bg-light financeiro-resumo ${isMobile ? 'financeiro-resumo-container-mobile' : 'financeiro-resumo-container'}`}>
            <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
              <div className="text-end">
                <div className="small text-muted">{t('summary.value')}</div>
                <strong>{formatCurrency(filteredData.reduce((sum: number, item: Titulo) => {
                  return sum + Number(item.valor_final || item.valor || 0);
                }, 0))}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">{t('summary.paidValue')}</div>
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
                <div className="small text-muted">{t('summary.openValue')}</div>
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
                  <div className="small text-muted">{t('summary.canceledValue')}</div>
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
            onSuccess={async () => {
              await handleRefreshData();
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
            onSuccess={async () => {
              await handleRefreshData();
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
            clearPdfUrl();
          }}
          pdfUrl={pdfUrl}
          isGenerating={isGeneratingPdf}
          title={t('financial.viewDocument')}
          modalId="financeiro-imprimir-modal"
        />

        {/* Modal de Visualização de PDF de Auditoria */}
        <ImprimirModal
          show={auditoria.showPreview}
          onClose={auditoria.handleClosePreview}
          pdfUrl={auditoria.pdfUrl}
          isGenerating={auditoria.isGeneratingPdf}
          title={t('financial.executionLogs')}
          modalId="auditoria-titulo-modal"
        />

        {/* Modal de Gerar NFS-e Avulsa */}
        <GerarNFeModal
          show={showGerarNFeModal}
          onClose={() => {
            setShowGerarNFeModal(false);
            setSelectedTituloForNFe(null);
          }}
          cliente={selectedTituloForNFe?.cliente || undefined}
          titulo={selectedTituloForNFe ? {
            id: selectedTituloForNFe.id,
            numero_titulo: selectedTituloForNFe.numero_titulo,
            status: selectedTituloForNFe.status,
            valor: selectedTituloForNFe.valor,
            valor_parcela: selectedTituloForNFe.valor_final || selectedTituloForNFe.valor,
            valor_pago: selectedTituloForNFe.valor_pago || null,
            data_vencimento: selectedTituloForNFe.data_vencimento,
            data_pagamento: selectedTituloForNFe.data_pagamento || null,
            charge_id: selectedTituloForNFe.charge_id || null,
            descricao: selectedTituloForNFe.descricao,
            observacoes: selectedTituloForNFe.observacoes
          } as TituloItem & { descricao?: string; observacoes?: string } : undefined}
          onSuccess={async () => {
            await handleRefreshData();
            setShowGerarNFeModal(false);
            setSelectedTituloForNFe(null);
          }}
        />


      </>
    );
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={t('financial.title')}
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
          onSuccess={async () => {
            await handleRefreshData();
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
          onSuccess={async () => {
            await handleRefreshData();
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
          clearPdfUrl();
        }}
        pdfUrl={pdfUrl}
        isGenerating={isGeneratingPdf}
        title={t('document.viewDocument')}
        modalId="financeiro-imprimir-modal"
      />

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-titulo-modal"
      />

      {/* Modal de Gerar NFS-e Avulsa */}
      <GerarNFeModal
        show={showGerarNFeModal}
        onClose={() => {
          setShowGerarNFeModal(false);
          setSelectedTituloForNFe(null);
        }}
        cliente={selectedTituloForNFe?.cliente || undefined}
        titulo={selectedTituloForNFe ? {
          id: selectedTituloForNFe.id,
          numero_titulo: selectedTituloForNFe.numero_titulo,
          status: selectedTituloForNFe.status,
          valor: selectedTituloForNFe.valor,
          valor_parcela: selectedTituloForNFe.valor_final || selectedTituloForNFe.valor,
          valor_pago: selectedTituloForNFe.valor_pago || null,
          data_vencimento: selectedTituloForNFe.data_vencimento,
          data_pagamento: selectedTituloForNFe.data_pagamento || null,
          charge_id: selectedTituloForNFe.charge_id || null,
          descricao: selectedTituloForNFe.descricao,
          observacoes: selectedTituloForNFe.observacoes
        } as TituloItem & { descricao?: string; observacoes?: string } : undefined}
        onSuccess={async () => {
          await handleRefreshData();
          setShowGerarNFeModal(false);
          setSelectedTituloForNFe(null);
        }}
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default FinanceiroModal;
