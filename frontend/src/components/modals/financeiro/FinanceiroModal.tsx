import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTitulosFinanceiro } from '@/hooks/useTitulosFinanceiro';
import { Titulo, TituloFilters } from '@/types';
import { TituloItem } from '@/types/cliente';
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
    ...(dataVencimentoFim ? { data_vencimento_fim: dataVencimentoFim } : {})
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

  const sortedData = useSorting(titulos as unknown as Record<string, unknown>[], tableFilters.sortColumn, tableFilters.sortDirection) as unknown as Titulo[];

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
    openPrintModal();
    
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
  }, [selectedItems, error, success, openPrintModal]);

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
      success(`${itensPagos.length} recibo(s) gerado(s) com sucesso!`);
    } catch (err) {
      error('Erro ao gerar recibos');
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [selectedItems, error, success, openPrintModal]);

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
    openPrintModal();
    
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
  }, [titulos, error, success, openPrintModal]);

  const columns: TableConfig<Titulo>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      searchable: true,
      width: 42,
      resizable: true,
      render: (item: Titulo) => <span>{item.id}</span>
    },
    {
      key: 'cliente',
      label: 'Cliente',
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
      label: 'Contrato',
      sortable: true,
      searchable: true,
      width: 90,
      resizable: true,
      render: (item: Titulo) => item.contrato_id || '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      searchable: true,
      width: 100,
      resizable: true,
      render: (item: Titulo) => getStatusBadge(item.status)
    },
    {
      key: 'plano_nome',
      label: 'Plano',
      sortable: true,
      searchable: true,
      width: 150,
      resizable: true,
      render: (item: Titulo) => item.plano?.nome_plano || '-'
    },
    {
      key: 'numero_titulo',
      label: 'Nº Título',
      sortable: true,
      searchable: true,
      width: 120,
      resizable: true,
      render: (item: Titulo) => <div className="fw-bold">{item.numero_titulo || '-'}</div>
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      sortable: true,
      searchable: false,
      width: 110,
      resizable: true,
      render: (item: Titulo) => formatDate(item.data_vencimento)
    },
    {
      key: 'valor',
      label: 'Valor',
      sortable: true,
      searchable: true,
      width: 100,
      resizable: true,
      render: (item: Titulo) => formatCurrency(item.valor_final || item.valor)
    },
    {
      key: 'valor_pago',
      label: 'Valor baixado',
      sortable: true,
      searchable: true,
      width: 120,
      resizable: true,
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
      key: 'nfse_numero',
      label: 'NF',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => item.nfse_numero || '-'
    },
    {
      key: 'nfse_status',
      label: 'Status NF',
      sortable: true,
      searchable: true,
      render: (item: Titulo) => {
        if (!item.nfse_status) return '-';
        const statusMap: Record<string, { label: string; color: string }> = {
          'agendado': { label: 'Agendado', color: 'info' },
          'emitida': { label: 'Emitida', color: 'success' },
          'cancelada': { label: 'Cancelada', color: 'danger' },
          'rejeitada': { label: 'Rejeitada', color: 'warning' },
          'erro': { label: 'Erro', color: 'danger' }
        };
        const status = statusMap[item.nfse_status] || { label: item.nfse_status, color: 'secondary' };
        return <span className={`badge bg-${status.color}`}>{status.label}</span>;
      }
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
  ], []);

  // Verificar se há títulos com NFS-e emitida
  const hasNFSeEmitida = useMemo(() => {
    return sortedData.some(item => item.nfse_status === 'emitida' && item.nfse_numero);
  }, [sortedData]);

  // Função para gerar PDF de NFS-e
  const handleImprimirNFSe = useCallback(async (selectedItems: Titulo[]) => {
    if (!selectedItems || selectedItems.length === 0) {
      error('Nenhum título selecionado possui NFS-e emitida');
      return;
    }
    const itensComNFSe = getItensComNFSe(selectedItems);
    if (itensComNFSe.length === 0) {
      error('Nenhum título selecionado possui NFS-e emitida');
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
        success('NFS-e gerada com sucesso!');
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar PDF da NFS-e';
      error(errorMessage);
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [error, success, getItensComNFSe, openPrintModal]);

  // Memoizar bulkActions
  const memoizedBulkActions = useMemo(() => {
    return [
      {
        key: 'editar',
        label: 'Editar',
        variant: 'secondary' as const,
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
        variant: 'secondary' as const,
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
        variant: 'secondary' as const,
        onClick: async (selectedItems: Titulo[]) => {
          if (selectedItems.length === 0) return;
          
          const confirmMessage = selectedItems.length === 1 
            ? 'Tem certeza que deseja cancelar este título?'
            : `Tem certeza que deseja cancelar ${selectedItems.length} títulos?`;
            
          const confirmed = await confirm({
            message: confirmMessage,
            variant: 'warning',
            title: 'Cancelar títulos',
            confirmText: 'Cancelar',
            cancelText: 'Voltar',
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
              } catch (err) {
                error('Erro ao cancelar títulos');
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
        variant: 'secondary' as const,
        onClick: async (selectedItems: Titulo[]) => {
          if (selectedItems.length === 0) return;
          
          const item = selectedItems[0];
          if (item.status !== 'pago') {
            error('Só é possível estornar títulos que estão pagos');
            return;
          }
          
          const confirmed = await confirm({
            message: `Tem certeza que deseja estornar o título ${item.numero_titulo || item.id}?\n\n` +
              `Valor: ${formatCurrency(item.valor_pago || item.valor || 0)}\n` +
              `O título voltará para status PENDENTE.`,
            variant: 'warning',
            title: 'Estornar título',
            confirmText: 'Estornar',
            cancelText: 'Cancelar',
          });
          
          if (confirmed) {
                try {
                  await TituloService.estornar(item.id);
                  success('Título estornado com sucesso!');
                  handleRefreshData();
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : 'Erro ao estornar título.';
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
        label: 'Imprimir',
        variant: 'secondary' as const,
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
              const itensPagos = selectedItems.filter(item => item.status === 'pago' || item.status === 'pago_atraso');
              return itensPagos.length === 0;
            }
          },
          // Mostrar "Imprimir NF" apenas se houver NFS-e emitida
          ...(hasNFSeEmitida ? [{
            label: 'Imprimir NF',
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
        label: 'NFS-e',
        variant: 'secondary' as const,
        disabled: (selectedItems: Titulo[]): boolean => selectedItems.length === 0,
        dropdown: [
          {
            label: 'Gerar NFS-e Avulsa',
            action: (selectedItems?: Titulo[]) => {
              if (!selectedItems || selectedItems.length === 0) {
                error('Selecione pelo menos um título');
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
  }, [success, error, handleRefreshData, handleImprimirSelecionados, handleImprimirTodosEmAberto, handleImprimirRecibos, hasNFSeEmitida, handleImprimirNFSe, getItensComNFSe, confirm]);

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
        Mostrar cancelados
      </label>
    </div>
  ), [showCancelados, handleShowCanceladosChange]);

  const customControlsAfterActions = useMemo(() => (
    <div className="d-flex align-items-center gap-2">
      <label htmlFor="dataVencimentoInicio" className="form-label mb-0 small">Data Inicial:</label>
      <input
        type="date"
        id="dataVencimentoInicio"
        className="form-control form-control-sm table-pagination-filter"
        value={dataVencimentoInicio}
        onChange={handleDataVencimentoInicioChange}
      />
      <label htmlFor="dataVencimentoFim" className="form-label mb-0 small">Data Final:</label>
      <input
        type="date"
        id="dataVencimentoFim"
        className="form-control form-control-sm table-pagination-filter"
        value={dataVencimentoFim}
        onChange={handleDataVencimentoFimChange}
      />
    </div>
  ), [dataVencimentoInicio, dataVencimentoFim, handleDataVencimentoInicioChange, handleDataVencimentoFimChange]);

  const tableConfig = useMemo(() => ({
    columns,
    data: sortedData,
    loading: isLoading,
    searchable: true,
    searchPlaceholder: '',
    searchField: 'numero_titulo',
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
    customControls,
    customControlsAfterActions
  }), [
    columns,
    sortedData,
    isLoading,
    onSelectTitulo,
    memoizedBulkActions,
    pagination,
    customControls,
    customControlsAfterActions
  ]);

  const modalContent = (
    <div className="row financeiro-modal-content">
      <div className="col-12 financeiro-modal-col">
        <div className="financeiro-modal-table-container">
          <Table
              title="Financeiro - Títulos"
              config={tableConfig}
              tableId="financeiro-modal"
              onSelectionChange={setSelectedItems}
              onSort={tableFilters.setSort}
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
        title="Visualizar Documento"
        modalId="financeiro-imprimir-modal"
      />

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        title="Relatórios de logs"
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
