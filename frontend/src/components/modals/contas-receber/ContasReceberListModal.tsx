import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTitulosFinanceiro } from 'hooks/useTitulosFinanceiro';
import { Titulo, TituloFilters } from 'types';
import { TituloItem } from 'types/cliente';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useTableFilters } from 'hooks/useTableFilters';
import { TituloService } from 'services/tituloService';
import { saasTituloService, type SaasTitulo } from 'services/saas/saasCrudService';
import { formatDate, formatDateTime } from 'utils/formatters';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import { TableConfig, BulkAction } from 'components/tables/types';
import { TituloModal } from 'components/modals/titulos';
import ReceberModal from 'components/modals/pagamentos/ReceberModal';
import { useI18n } from 'contexts/I18nContext';
import ImprimirModal from 'components/common/ImprimirModal';
import GerarNFeModal from 'components/modals/notas-fiscais/GerarNFeModal';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useAuditoria } from 'hooks/useAuditoria';
import { useConfirmModal } from 'hooks/useConfirmModal';
import ConfirmModal from 'components/modals/ConfirmModal';

type TituloItemUnion = Titulo | SaasTitulo;

interface ContasReceberListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectTitulo?: (titulo: Titulo) => void;
  skipWrapper?: boolean;
  initialFilters?: Partial<TituloFilters>;
  variant?: 'admin' | 'saas';
}

const canGerarBoletoSaas = (t: SaasTitulo) =>
  t.status === 'pendente' && t.banco && ['efi', 'asaas'].includes(t.banco.tipo_banco?.toLowerCase() || '');

const ContasReceberListModal: React.FC<ContasReceberListModalProps> = ({
  show,
  onClose,
  onSelectTitulo,
  skipWrapper = false,
  initialFilters,
  variant = 'admin'
}) => {
  const isSaas = variant === 'saas';
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
  
  const [selectedItems, setSelectedItems] = useState<TituloItemUnion[]>([]);
  const [showCancelados, setShowCancelados] = useState(false);
  
  // Sem filtro de data por padrão - exibe todos os registros (ao abrir do dashboard aplica initialFilters)
  const [dataVencimentoInicio, setDataVencimentoInicio] = useState<string>('');
  const [dataVencimentoFim, setDataVencimentoFim] = useState<string>('');

  // Quando abre do dashboard: aplicar initialFilters (data vencimento, data pagamento ou status)
  const prevShowRef = React.useRef(false);
  useEffect(() => {
    if (show && !prevShowRef.current) {
      if (initialFilters?.data_pagamento_inicio || initialFilters?.data_pagamento_fim) {
        setDataVencimentoInicio(initialFilters.data_pagamento_inicio ?? '');
        setDataVencimentoFim(initialFilters.data_pagamento_fim ?? '');
      } else if (initialFilters?.data_vencimento_inicio || initialFilters?.data_vencimento_fim) {
        setDataVencimentoInicio(initialFilters.data_vencimento_inicio ?? '');
        setDataVencimentoFim(initialFilters.data_vencimento_fim ?? '');
      } else if (initialFilters?.status) {
        setDataVencimentoInicio('');
        setDataVencimentoFim('');
      }
    }
    prevShowRef.current = show;
  }, [show, initialFilters?.status, initialFilters?.data_vencimento_inicio, initialFilters?.data_vencimento_fim, initialFilters?.data_pagamento_inicio, initialFilters?.data_pagamento_fim]);
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
  const [gerandoBoletoId, setGerandoBoletoId] = useState<number | null>(null);

  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  const auditoria = useAuditoria();
  const { confirm: _confirm, modalProps } = useConfirmModal();

  const handleAudit = (item: TituloItemUnion) => {
    auditoria.handleAudit(isSaas ? 'SaasTitulo' : 'Titulo', item.id);
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
  
  const statusFilter = initialFilters?.status ?? (showCancelados ? undefined : '!cancelado');
  const filterByPaymentDate = initialFilters?.data_pagamento_inicio != null || initialFilters?.data_pagamento_fim != null;
  const pagamentoInicio = dataVencimentoInicio || initialFilters?.data_pagamento_inicio || '';
  const pagamentoFim = dataVencimentoFim || initialFilters?.data_pagamento_fim || '';
  const vencimentoInicio = dataVencimentoInicio || initialFilters?.data_vencimento_inicio || '';
  const vencimentoFim = dataVencimentoFim || initialFilters?.data_vencimento_fim || '';

  const filters: TituloFilters = {
    page: tableFilters.page,
    limit: tableFilters.limit,
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    ...(statusFilter && { status: statusFilter }),
    ...(filterByPaymentDate
      ? {
          ...(pagamentoInicio ? { data_pagamento_inicio: pagamentoInicio } : {}),
          ...(pagamentoFim ? { data_pagamento_fim: pagamentoFim } : {})
        }
      : {
          ...(vencimentoInicio ? { data_vencimento_inicio: vencimentoInicio } : {}),
          ...(vencimentoFim ? { data_vencimento_fim: vencimentoFim } : {})
        }),
    sortColumn: tableFilters.apiParams.sortColumn,
    sortDirection: tableFilters.apiParams.sortDirection
  };

  const { data: titulosData, isLoading, refetch } = useTitulosFinanceiro(filters, !isSaas);
  const { data: saasData, isLoading: saasLoading, refetch: saasRefetch } = useQuery({
    queryKey: ['saas-titulos', tableFilters.page, tableFilters.limit, tableFilters.debouncedSearch, tableFilters.sortColumn, tableFilters.sortDirection, showCancelados, pagamentoInicio, pagamentoFim, vencimentoInicio, vencimentoFim, statusFilter, filterByPaymentDate],
    queryFn: () => saasTituloService.list({
      page: tableFilters.page,
      limit: tableFilters.limit,
      search: tableFilters.debouncedSearch || undefined,
      sortColumn: tableFilters.sortColumn,
      sortDirection: tableFilters.sortDirection,
      ...(statusFilter && { status: statusFilter }),
      ...(filterByPaymentDate
        ? {
            ...(pagamentoInicio && { data_pagamento_inicio: pagamentoInicio }),
            ...(pagamentoFim && { data_pagamento_fim: pagamentoFim }),
          }
        : {
            ...(vencimentoInicio && { data_vencimento_inicio: vencimentoInicio }),
            ...(vencimentoFim && { data_vencimento_fim: vencimentoFim }),
          }),
    }),
    enabled: isSaas && show,
    staleTime: 0,
  });

  const _dataSource = isSaas ? saasData : titulosData;
  const isLoadingData = isSaas ? saasLoading : isLoading;
  const refetchData = isSaas ? saasRefetch : refetch;

  // Helper para invalidar queries e refetch
  const handleRefreshData = useCallback(async () => {
    if (isSaas) {
      await queryClient.invalidateQueries({ queryKey: ['saas-titulos'] });
      await saasRefetch();
    } else {
      await queryClient.invalidateQueries({ queryKey: ['titulos-financeiro'] });
      await refetch();
    }
  }, [isSaas, queryClient, refetch, saasRefetch]);

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

  const titulos = useMemo(() => {
    if (isSaas) {
      const listRes = saasData?.data as { data?: SaasTitulo[] } | undefined;
      return listRes?.data || [];
    }
    return titulosData?.data || [];
  }, [isSaas, saasData?.data, titulosData?.data]);
  
  // Paginação do backend - usar valores do backend quando disponíveis
  const pagination = useMemo(() => {
    if (isSaas) {
      const listRes = saasData?.data as { pagination?: { total: number; page: number; limit: number; totalPages: number } } | undefined;
      const p = listRes?.pagination;
      if (!p) return undefined;
      const currentPage = p.page;
      const perPage = p.limit;
      const total = p.total;
      const lastPage = p.totalPages;
      const from = total > 0 ? (currentPage - 1) * perPage + 1 : 0;
      const to = total > 0 ? Math.min(currentPage * perPage, total) : 0;
      return { current_page: currentPage, last_page: lastPage, per_page: perPage, total, from, to };
    }
    if (!titulosData || !titulosData.pagination) return undefined;
    const pag = titulosData.pagination;
    const currentPage = typeof pag.current_page === 'number' ? pag.current_page : tableFilters.page;
    const perPage = tableFilters.limit;
    const total = typeof pag.total === 'number' ? pag.total : 0;
    const lastPage = total > 0 ? Math.ceil(total / perPage) : 1;
    const from = total > 0 ? ((currentPage - 1) * perPage) + 1 : 0;
    const to = total > 0 ? Math.min(currentPage * perPage, total) : 0;
    return { current_page: currentPage, last_page: lastPage, per_page: perPage, total, from, to };
  }, [isSaas, saasData?.data, titulosData, tableFilters.limit, tableFilters.page]);


  // Limpar filtros quando o modal fechar (inclui data inicial/final e busca)
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
      
      const response = await axios.get(`/api/recibo/web/multiplos?ids=${ids}`, {
        responseType: 'blob',
        timeout: 120000,
        withCredentials: true,
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
    const titulosEmAberto = (titulos as TituloItemUnion[]).filter((titulo) =>
      titulo.status === 'pendente' || titulo.status === 'vencido'
    );
    if (titulosEmAberto.length === 0) {
      error(t('messages.noOpenTitlesFound'));
      return;
    }
    openPrintModal();
    
    try {
      const ids = titulosEmAberto.map((titulo: TituloItemUnion) => titulo.id);
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

  const handleImprimirSelecionadosSaas = useCallback(async () => {
    if (selectedItems.length === 0) {
      error(t('messages.noTitleSelected'));
      return;
    }
    const emAberto = (selectedItems as SaasTitulo[]).filter(t => t.status === 'pendente' || t.status === 'vencido');
    if (emAberto.length === 0) {
      error(t('messages.noOpenTitlesFound'));
      return;
    }
    openPrintModal();
    try {
      const ids = emAberto.map(item => item.id);
      const pdfBlob = await saasTituloService.gerarPdfBoletosMultiplos(ids);
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      success(t('messages.successPrintSelected'));
    } catch {
      error(t('messages.errorPrintSelected'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [selectedItems, error, success, openPrintModal, t]);

  const handleImprimirTodosEmAbertoSaas = useCallback(async () => {
    const emAberto = (titulos as SaasTitulo[]).filter(t => t.status === 'pendente' || t.status === 'vencido');
    if (emAberto.length === 0) {
      error(t('messages.noOpenTitlesFound'));
      return;
    }
    openPrintModal();
    try {
      const ids = emAberto.map((item: SaasTitulo) => item.id);
      const pdfBlob = await saasTituloService.gerarPdfBoletosMultiplos(ids);
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      success(t('messages.successPrintOpen'));
    } catch {
      error(t('messages.errorPrintOpen'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [titulos, error, success, openPrintModal, t]);

  const columns: TableConfig<TituloItemUnion>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      searchable: true,
      width: 42,
      resizable: true,
      render: (item: TituloItemUnion) => <span>{item.id}</span>
    },
    {
      key: 'cliente',
      label: t('table.client'),
      sortable: true,
      searchable: true,
      width: 220,
      resizable: true,
      render: (item: TituloItemUnion) => {
        const c = (item as Titulo).cliente || (item as SaasTitulo).empresa;
        if (c) {
          const r = c as { razao_social?: string; nome_fantasia?: string; nome_empresa?: string };
          return r.razao_social || r.nome_fantasia || r.nome_empresa || '-';
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
      render: (item: TituloItemUnion) => item.contrato_id || '-'
    },
    {
      key: 'status',
      label: t('table.status'),
      sortable: true,
      searchable: true,
      badgeLabels: [t('status.pending'), t('status.paid'), t('status.overdue'), t('status.cancelled'), t('status.partial'), t('status.paidLate')],
      resizable: true,
      render: (item: TituloItemUnion) => getStatusBadge(item.status)
    },
    {
      key: 'plano_nome',
      label: t('table.plan'),
      sortable: true,
      searchable: true,
      width: 150,
      resizable: true,
      render: (item: TituloItemUnion) => (item as Titulo).plano?.nome_plano || (item as SaasTitulo).plano?.nome || '-'
    },
    {
      key: 'numero_titulo',
      label: t('table.titleNumber'),
      sortable: true,
      searchable: true,
      width: 120,
      resizable: true,
      render: (item: TituloItemUnion) => item.numero_titulo || '-'
    },
    {
      key: 'data_vencimento',
      label: t('table.dueDate'),
      sortable: true,
      searchable: false,
      width: 90,
      resizable: true,
      render: (item: TituloItemUnion) => formatDate(item.data_vencimento)
    },
    {
      key: 'valor',
      label: t('table.value'),
      sortable: true,
      searchable: true,
      width: 75,
      resizable: true,
      render: (item: TituloItemUnion) => formatCurrency((item as Titulo).valor_final ?? item.valor)
    },
    {
      key: 'valor_pago',
      label: t('table.paidValue'),
      sortable: true,
      searchable: true,
      width: 100,
      resizable: true,
      render: (item: TituloItemUnion) => {
        const t = item as Titulo;
        const vp = t.valor_pago ?? (item as SaasTitulo).valor;
        return item.status === 'pago' ? formatCurrency(Number(vp) || Number(item.valor) || 0) : formatCurrency(0);
      }
    },
    {
      key: 'valor_aberto',
      label: t('table.openValue'),
      sortable: true,
      searchable: true,
      width: 93,
      render: (item: TituloItemUnion) => {
        const t = item as Titulo;
        const v = Number((t.valor_final ?? t.valor ?? item.valor) || 0);
        return (item.status === 'pago' || item.status === 'cancelado') ? formatCurrency(0) : formatCurrency(v);
      }
    },
    {
      key: 'data_pagamento',
      label: t('table.paymentDate'),
      sortable: true,
      searchable: false,
      render: (item: TituloItemUnion) => {
        const t = item as Titulo;
        if (t.data_pagamento_formatada) return t.data_pagamento_formatada;
        const dp = t.data_pagamento ?? (item as SaasTitulo).data_pagamento;
        return dp ? formatDate(dp) : '-';
      }
    },
    {
      key: 'charge_id',
      label: t('table.chargeId'),
      sortable: true,
      searchable: true,
      render: (item: TituloItemUnion) => item.charge_id || '-'
    },
    {
      key: 'nosso_numero',
      label: t('table.ourNumber'),
      sortable: true,
      searchable: true,
      width: 108,
      render: (item: TituloItemUnion) => item.nosso_numero || '-'
    },
    {
      key: 'nfse_numero',
      label: t('table.invoice'),
      sortable: true,
      searchable: true,
      width: 60,
      render: (item: TituloItemUnion) => ((item as Titulo).nfse_numero) || '-'
    },
    {
      key: 'nfse_status',
      label: t('table.invoiceStatus'),
      sortable: true,
      searchable: true,
      badgeLabels: [t('status.scheduled'), t('status.issued'), t('status.cancelled'), t('status.rejected'), t('status.error')],
      render: (item: TituloItemUnion) => {
        const nfse = (item as Titulo).nfse_status;
        if (!nfse) return '-';
        const statusMap: Record<string, { label: string; color: string }> = {
          'agendado': { label: t('status.scheduled'), color: 'info' },
          'emitida': { label: t('status.issued'), color: 'success' },
          'cancelada': { label: t('status.cancelled'), color: 'danger' },
          'rejeitada': { label: t('status.rejected'), color: 'warning' },
          'erro': { label: t('status.error'), color: 'danger' }
        };
        const status = statusMap[nfse] || { label: nfse, color: 'secondary' };
        return <span className={`badge bg-${status.color}`}>{status.label}</span>;
      }
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      searchable: false,
      render: (item: TituloItemUnion) => {
        const t = item as Titulo;
        if (t.created_at_formatada) return t.created_at_formatada;
        const ca = t.created_at ?? (item as SaasTitulo & { created_at?: string }).created_at;
        return ca ? formatDateTime(ca) : '-';
      }
    }
  ], [t, getStatusBadge]);

  const columnsToUse = columns;

  // Verificar se há títulos com NFS-e emitida
  const hasNFSeEmitida = useMemo(() => {
    if (isSaas) return false;
    return titulos.some((item): item is Titulo => 'nfse_status' in item && item.nfse_status === 'emitida' && !!item.nfse_numero);
  }, [titulos, isSaas]);

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
      const { defaultApiClient } = await import('services/core/ApiClient');
      
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

  const handleGerarBoletoSaas = useCallback(async (sel: SaasTitulo[]) => {
    const item = sel?.length ? sel[0] : (selectedItems[0] as SaasTitulo | undefined);
    if (!item || !canGerarBoletoSaas(item)) return;
    setGerandoBoletoId(item.id);
    try {
      const res = await saasTituloService.gerarBoleto(item.id);
      await handleRefreshData();
      const updated = (res as { data?: SaasTitulo })?.data;
      if (updated?.url_boleto) {
        window.open(updated.url_boleto, '_blank');
        success('Boleto gerado com sucesso');
      } else {
        success('Boleto gerado');
      }
    } catch (e) {
      error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao gerar boleto');
    } finally {
      setGerandoBoletoId(null);
    }
  }, [selectedItems, handleRefreshData, success, error]);

  const handleDeleteSaas = useCallback(async (sel: SaasTitulo[]) => {
    const item = sel?.length ? sel[0] : (selectedItems[0] as SaasTitulo | undefined);
    if (!item) return;
    const ok = window.confirm(`Remover o título "${item.numero_titulo}"?`);
    if (!ok) return;
    try {
      await saasTituloService.delete(item.id);
      await handleRefreshData();
      setSelectedItems([]);
      success(t('financial.successDeleteTitle'));
    } catch {
      error(t('financial.errorDeleteTitle'));
    }
  }, [selectedItems, handleRefreshData, success, error, t]);

  const handleCancelarSaas = useCallback(async (sel: SaasTitulo[]) => {
    const items = sel?.length ? sel : (selectedItems as SaasTitulo[]);
    if (items.length === 0) return;
    const msg = items.length === 1 ? t('messages.confirmCancelTitle') : t('messages.confirmCancelTitles', { count: items.length });
    if (!window.confirm(msg)) return;
    try {
      let okCount = 0;
      for (const item of items) {
        try {
          await saasTituloService.update(item.id, { status: 'cancelado' } as Partial<SaasTitulo>);
          okCount++;
        } catch {
          // continua
        }
      }
      await handleRefreshData();
      setSelectedItems([]);
      if (okCount > 0) success(okCount === 1 ? t('financial.titleCanceled') : `${okCount} ${t('financial.titlesCanceled')}`);
    } catch {
      error(t('financial.errorCanceling'));
    }
  }, [selectedItems, handleRefreshData, success, error, t]);

  const handleEstornarSaas = useCallback(async (sel: SaasTitulo[]) => {
    const item = sel?.length ? sel[0] : (selectedItems[0] as SaasTitulo | undefined);
    if (!item) return;
    const statusPago = item.status === 'pago' || item.status === 'pago_atraso' || item.status === 'parcial';
    if (!statusPago) {
      error(t('financial.canOnlyReversePaid'));
      return;
    }
    const msg = `${t('financial.titleWillReturnPending')}\n\n${t('document.title')} ${item.numero_titulo || item.id}\n${t('summary.value')} ${formatCurrency(Number(item.valor))}`;
    if (!window.confirm(msg)) return;
    try {
      await saasTituloService.update(item.id, { status: 'pendente', pago: false, data_pagamento: null, valor_pago: null } as Partial<SaasTitulo>);
      await handleRefreshData();
      setSelectedItems([]);
      success(t('financial.titleReversed'));
    } catch (err) {
      error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('financial.errorReversing'));
    }
  }, [selectedItems, handleRefreshData, success, error, t]);

  // Memoizar bulkActions - mesma ordem para ADM e SaaS
  const memoizedBulkActions = useMemo(() => {
    const actions: BulkAction<TituloItemUnion>[] = [];

    if (!isSaas) {
      actions.push({
        key: 'editar',
        label: t('buttons.edit'),
        variant: 'primary' as const,
        onClick: (s: TituloItemUnion[]) => {
          if (s.length > 0) {
            setSelectedTituloId((s[0] as Titulo).id);
            setShowTituloEditModal(true);
          }
        },
        disabled: (s: TituloItemUnion[]): boolean => s.length !== 1
      });
    }

    actions.push({
      key: 'excluir',
      label: t('buttons.delete'),
      variant: 'primary' as const,
      onClick: (s: TituloItemUnion[]) => {
        if (isSaas) handleDeleteSaas(s as SaasTitulo[]);
        else (async () => {
          const isDeletavel = (t: Titulo) => t.status === 'cancelado' || (!t.pago && !(t.charge_id || t.nosso_numero || t.codigo_barras || t.linha_digitavel || t.url_boleto));
          const deletaveis = (s as Titulo[]).filter(isDeletavel);
          if (deletaveis.length === 0) return;
          const msg = deletaveis.length === 1 ? t('financial.confirmDeleteTitle') : t('financial.confirmDeleteTitles', { count: deletaveis.length });
          if (!window.confirm(msg)) return;
          let okCount = 0, errCount = 0;
          for (const item of deletaveis) {
            try { await TituloService.delete(item.id); okCount++; } catch { errCount++; }
          }
          await handleRefreshData();
          setSelectedItems([]);
          if (okCount > 0) success(okCount === 1 ? t('financial.successDeleteTitle') : t('financial.successDeleteTitles', { count: okCount }));
          if (errCount > 0) error(errCount === 1 ? t('financial.errorDeleteTitle') : t('financial.errorDeleteTitles', { count: errCount }));
        })();
      },
      disabled: (s: TituloItemUnion[]): boolean => {
        if (s.length === 0) return true;
        if (isSaas) return false;
        const isDeletavel = (t: Titulo) => t.status === 'cancelado' || (!t.pago && !(t.charge_id || t.nosso_numero || t.codigo_barras || t.linha_digitavel || t.url_boleto));
        return (s as Titulo[]).every(t => !isDeletavel(t));
      },
    } as BulkAction<TituloItemUnion>);

    if (!isSaas) {
      actions.push({
        key: 'receber',
        label: t('buttons.receive'),
        variant: 'primary' as const,
        onClick: (s: TituloItemUnion[]) => {
          if (s.length > 0) {
            const item = s[0] as Titulo;
            setSelectedParcela({
              id: item.id,
              numero_titulo: item.numero_titulo,
              valor_parcela: Number(item.valor_final || item.valor),
              data_vencimento: item.data_vencimento,
              cliente: item.cliente ? { razao_social: item.cliente.razao_social || item.cliente.nome_fantasia || '' } : undefined
            });
            setShowReceberModal(true);
          }
        },
        disabled: (s: TituloItemUnion[]): boolean => {
          if (s.length === 0) return true;
          return (s as Titulo[]).every(i => i.status === 'pago' || i.status === 'cancelado');
        }
      });
    } else {
      actions.push({
        key: 'gerar-boleto',
        label: t('buttons.receive'),
        variant: 'primary' as const,
        onClick: (s: TituloItemUnion[]) => handleGerarBoletoSaas(s as SaasTitulo[]),
        disabled: (s: TituloItemUnion[]): boolean => {
          const items = s.length > 0 ? s : selectedItems;
          const canGen = items.length === 1 && canGerarBoletoSaas(items[0] as SaasTitulo);
          return !canGen || gerandoBoletoId != null;
        },
      });
    }

    actions.push({
      key: 'cancelar',
      label: t('buttons.cancel'),
      variant: 'primary' as const,
      onClick: (s: TituloItemUnion[]) => {
        if (isSaas) handleCancelarSaas(s as SaasTitulo[]);
        else (async () => {
          if (s.length === 0) return;
          const msg = s.length === 1 ? t('messages.confirmCancelTitle') : t('messages.confirmCancelTitles', { count: s.length });
          if (!window.confirm(msg)) return;
          let okCount = 0, errCount = 0;
          for (const item of s as Titulo[]) {
            try { await TituloService.update(item.id, { status: 'cancelado' }); okCount++; } catch { errCount++; }
          }
          await handleRefreshData();
          setSelectedItems([]);
          if (okCount > 0) success(okCount === 1 ? t('financial.titleCanceled') : `${okCount} ${t('financial.titlesCanceled')}`);
          if (errCount > 0) error(errCount === 1 ? t('financial.titleNotCanceled') : `${errCount} ${t('financial.titlesNotCanceled')}`);
        })();
      },
      disabled: (s: TituloItemUnion[]): boolean => {
        if (s.length === 0) return true;
        return (s as (Titulo | SaasTitulo)[]).every(i => i.status === 'pago' || i.status === 'cancelado');
      },
    } as BulkAction<TituloItemUnion>);

    actions.push({
      key: 'estornar',
      label: t('buttons.reverse'),
      variant: 'primary' as const,
      onClick: (s: TituloItemUnion[]) => {
        if (isSaas) handleEstornarSaas(s as SaasTitulo[]);
        else (async () => {
          if (s.length === 0) return;
          const item = s[0] as Titulo;
          const statusPago = item.status === 'pago' || item.status === 'pago_atraso' || item.status === 'parcial';
          if (!statusPago) { error(t('financial.canOnlyReversePaid')); return; }
          const msg = `${t('financial.titleWillReturnPending')}\n\n${t('document.title')} ${item.numero_titulo || item.id}\n${t('summary.value')} ${formatCurrency(item.valor_pago || item.valor || 0)}`;
          if (!window.confirm(msg)) return;
          try {
            await TituloService.estornar(item.id);
            success(t('financial.titleReversed'));
            handleRefreshData();
          } catch (err) {
            error(err instanceof Error ? err.message : t('financial.errorReversing'));
          }
        })();
      },
      disabled: (s: TituloItemUnion[]): boolean => {
        if (s.length === 0) return true;
        const statusPago = (st: string) => st === 'pago' || st === 'pago_atraso' || st === 'parcial';
        return (s as (Titulo | SaasTitulo)[]).every(i => !statusPago(i.status || ''));
      },
    } as BulkAction<TituloItemUnion>);

    actions.push({
      key: 'imprimir',
      label: t('buttons.print'),
      variant: 'primary' as const,
      dropdown: isSaas
        ? [
            { label: t('other.selected'), action: () => handleImprimirSelecionadosSaas() },
            { label: t('other.open'), action: () => handleImprimirTodosEmAbertoSaas() },
          ]
        : [
            { label: t('other.selected'), action: () => handleImprimirSelecionados() },
            { label: t('other.open'), action: () => handleImprimirTodosEmAberto() },
            {
              label: t('other.receipt'),
              action: () => handleImprimirRecibos(),
              disabled: (sel: TituloItemUnion[]) => (sel as Titulo[]).filter(i => i.status === 'pago' || i.status === 'pago_atraso').length === 0
            },
            ...(hasNFSeEmitida ? [{
              label: t('other.printNF'),
              action: (items?: TituloItemUnion[]) => handleImprimirNFSe((items || selectedItems) as Titulo[]),
              disabled: (items: TituloItemUnion[]) => getItensComNFSe(items as Titulo[]).length === 0
            }] : [])
          ]
    });

    if (!isSaas) {
      actions.push({
        key: 'nfse',
        label: t('actions.nfse'),
        variant: 'primary' as const,
        disabled: () => selectedItems.length === 0,
        dropdown: [{
          label: t('other.generateNFSeStandalone'),
          action: () => {
            if (selectedItems.length === 0) { error(t('messages.noTitleSelected')); return; }
            setSelectedTituloForNFe(selectedItems[0] as Titulo);
            setShowGerarNFeModal(true);
          },
          disabled: () => selectedItems.length === 0
        }]
      });
    }

    return actions;
  }, [isSaas, selectedItems, gerandoBoletoId, handleGerarBoletoSaas, handleDeleteSaas, handleCancelarSaas, handleEstornarSaas, handleImprimirSelecionadosSaas, handleImprimirTodosEmAbertoSaas, success, error, handleRefreshData, handleImprimirSelecionados, handleImprimirTodosEmAberto, handleImprimirRecibos, hasNFSeEmitida, handleImprimirNFSe, getItensComNFSe, t]);

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
    <div className="form-check form-switch">
      <input
        className="form-check-input"
        type="checkbox"
        role="switch"
        id="showCanceladosFinanceiro"
        checked={showCancelados}
        onChange={handleShowCanceladosChange}
        style={{ cursor: 'pointer' }}
      />
      <label className="form-check-label" htmlFor="showCanceladosFinanceiro" style={{ cursor: 'pointer' }}>
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
    columns: columnsToUse,
    data: titulos,
    loading: isLoadingData,
    searchable: true,
    searchPlaceholder: '',
    searchField: 'id',
    searchFields: isSaas
      ? [{ key: 'numero_titulo', label: t('table.titleNumber') }, { key: 'id', label: t('table.id') }]
      : [
          { key: 'id', label: t('table.id') },
          { key: 'numero_titulo', label: t('table.titleNumber') },
          { key: 'cliente', label: t('table.client') },
          { key: 'plano_nome', label: t('table.plan') },
          { key: 'contrato_id', label: t('table.contract') },
          { key: 'status', label: t('table.status') },
          { key: 'valor', label: t('table.value') },
          { key: 'valor_pago', label: t('table.paidValue') },
          { key: 'charge_id', label: t('table.chargeId') },
          { key: 'nosso_numero', label: t('table.ourNumber') },
        ],
    sortable: true,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection,
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
    isSaas,
    columnsToUse,
    titulos,
    isLoadingData,
    onSelectTitulo,
    memoizedBulkActions,
    pagination,
    customControls,
    customControlsAfterActions,
    tableFilters.sortColumn,
    tableFilters.sortDirection,
    t
  ]);

  const modalContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table<TituloItemUnion>
            title={t('menu.accountsReceivable')}
            config={tableConfig as TableConfig<TituloItemUnion>}
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
            onRefresh={refetchData}
            onAudit={handleAudit}
            auditEntity={isSaas ? 'SaasTitulo' : 'Titulo'}
            syncWithHeader={false}
          />
      </div>

      {/* Resumo Financeiro - Fixo no final do modal */}
      {filteredData.length > 0 && (
        <div className={`d-flex justify-content-end align-items-center p-3 bg-light financeiro-resumo ${isMobile ? 'financeiro-resumo-container-mobile' : 'financeiro-resumo-container'}`} style={{ flexShrink: 0, marginTop: isMobile ? '0.25rem' : '0.5rem', marginBottom: 0, marginLeft: isMobile ? '0.5rem' : '1rem', marginRight: isMobile ? '0.5rem' : '1rem' }}>
          <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
            <div className="text-end">
              <div className="small text-muted">{t('summary.value')}</div>
              <strong>{formatCurrency((filteredData as TituloItemUnion[]).reduce((sum: number, item: TituloItemUnion) => {
                const v = 'valor' in item ? Number(item.valor) : Number((item as Titulo).valor_final || (item as Titulo).valor || 0);
                return sum + v;
              }, 0))}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.paidValue')}</div>
              <strong>{formatCurrency((filteredData as TituloItemUnion[]).reduce((sum: number, item: TituloItemUnion) => {
                if ('pago' in item && item.pago) return sum + Number(item.valor);
                const vp = (item as Titulo).valor_pago;
                if (vp != null && Number(vp) > 0) return sum + Number(vp);
                return sum;
              }, 0))}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.openValue')}</div>
              <strong>{formatCurrency((filteredData as TituloItemUnion[]).reduce((sum: number, item: TituloItemUnion) => {
                if (item.status === 'pago' || item.status === 'cancelado') return sum;
                if ('pago' in item && (item as SaasTitulo).pago) return sum;
                const v = Number((item as { valor?: number }).valor ?? (item as Titulo).valor_final ?? (item as Titulo).valor ?? 0);
                const vp = (item as Titulo).valor_pago;
                const valorAberto = vp != null ? v - Number(vp) : v;
                return sum + (valorAberto > 0 ? valorAberto : v);
              }, 0))}</strong>
            </div>
            {showCancelados && (
              <div className="text-end">
                <div className="small text-muted">{t('summary.canceledValue')}</div>
                <strong>{formatCurrency((filteredData as TituloItemUnion[]).reduce((sum: number, item: TituloItemUnion) => {
                  if (item.status !== 'cancelado') return sum;
                  const v = 'valor' in item ? Number(item.valor) : Number((item as Titulo).valor_final || (item as Titulo).valor || 0);
                  return sum + v;
                }, 0))}</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (skipWrapper) {
    return (
      <>
        {modalContent}
        {!isSaas && showTituloEditModal && (
          <TituloModal
            show={showTituloEditModal}
            onClose={() => {
              setShowTituloEditModal(false);
              setSelectedTituloId(null);
            }}
            onSuccess={async () => {
              await handleRefreshData();
            }}
            tituloId={selectedTituloId}
          />
        )}

        {!isSaas && showReceberModal && selectedParcela && (
          <ReceberModal
            isOpen={showReceberModal}
            onClose={() => {
              setShowReceberModal(false);
              setSelectedParcela(null);
            }}
            onSuccess={async () => {
              await handleRefreshData();
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

        {!isSaas && (
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
          }}
        />)}


      </>
    );
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={t('menu.accountsReceivable')}
        size="xl"
        modalId="financeiro-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>

      {!isSaas && showTituloEditModal && (
        <TituloModal
          show={showTituloEditModal}
          onClose={() => {
            setShowTituloEditModal(false);
            setSelectedTituloId(null);
          }}
          onSuccess={async () => {
            await handleRefreshData();
          }}
          tituloId={selectedTituloId}
        />
      )}

      {!isSaas && showReceberModal && selectedParcela && (
        <ReceberModal
          isOpen={showReceberModal}
          onClose={() => {
            setShowReceberModal(false);
            setSelectedParcela(null);
          }}
          onSuccess={async () => {
            await handleRefreshData();
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

      {!isSaas && (
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
        }}
      />)}

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default ContasReceberListModal;
