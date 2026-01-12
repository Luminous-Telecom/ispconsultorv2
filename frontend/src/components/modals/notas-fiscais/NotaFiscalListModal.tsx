/* eslint-disable no-console */
import React, { useState, useCallback, useMemo } from 'react';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useNotasFiscais } from '@/hooks/useNotasFiscais';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useAuditoria } from '@/hooks/useAuditoria';
import { NotaFiscalService } from '@/services/notaFiscalService';
import { NotaFiscal } from '@/types';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import ListModal from '@/components/common/ListModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import CancelarNotaFiscalModal from './CancelarNotaFiscalModal';

interface NotaFiscalListModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  skipWrapper?: boolean;
}

const NotaFiscalListModal: React.FC<NotaFiscalListModalProps> = ({ 
  show, 
  onClose, 
  title = "Notas Fiscais",
  skipWrapper = false
}) => {
  const { error, success } = useNotificationContext();
  const auditoria = useAuditoria();
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [notaFiscalParaCancelar, setNotaFiscalParaCancelar] = useState<NotaFiscal | null>(null);

  // Hook unificado para filtros, busca e paginação
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  // Configurar colunas memoizadas
  const columns = useMemo(() => [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '42px',
      render: (item: NotaFiscal) => <span>{item.id}</span>
    },
    {
      key: 'numero',
      label: 'Número',
      sortable: true,
      render: (item: NotaFiscal) => item.numero || '-'
    },
    {
      key: 'cliente',
      label: 'Cliente',
      sortable: true,
      render: (item: NotaFiscal) => (
        <span>{item.cliente?.razao_social || item.cliente?.nome_fantasia || '-'}</span>
      )
    },
    {
      key: 'data_emissao',
      label: 'Data Emissão',
      sortable: true,
      render: (item: NotaFiscal) => item.data_emissao ? formatDate(item.data_emissao) : '-'
    },
    {
      key: 'valor_total',
      label: 'Valor Total',
      sortable: true,
      render: (item: NotaFiscal) => (
        <span className="text-success">
          {formatCurrency(item.valor_total || 0)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item: NotaFiscal) => {
        const statusColors: Record<string, string> = {
          'PENDENTE': 'bg-secondary',
          'PROCESSANDO': 'bg-info',
          'AUTORIZADA': 'bg-success',
          'CANCELADA': 'bg-danger',
          'REJEITADA': 'bg-danger',
          'ERRO': 'bg-warning'
        };
        const statusLabels: Record<string, string> = {
          'PENDENTE': 'Pendente',
          'PROCESSANDO': 'Processando',
          'AUTORIZADA': 'Autorizada',
          'CANCELADA': 'Cancelada',
          'REJEITADA': 'Rejeitada',
          'ERRO': 'Erro'
        };
        return (
          <span className={`badge ${statusColors[item.status] || 'bg-secondary'}`}>
            {statusLabels[item.status] || item.status}
          </span>
        );
      }
    },
    {
      key: 'nfse_status',
      label: 'NFS-e Status',
      sortable: true,
      render: (item: NotaFiscal) => {
        if (!item.nfse_status) return '-';
        const statusColors: Record<string, string> = {
          'agendado': 'bg-info',
          'emitida': 'bg-success',
          'cancelada': 'bg-danger',
          'rejeitada': 'bg-danger',
          'erro': 'bg-warning'
        };
        const statusLabels: Record<string, string> = {
          'agendado': 'Agendado',
          'emitida': 'Emitida',
          'cancelada': 'Cancelada',
          'rejeitada': 'Rejeitada',
          'erro': 'Erro'
        };
        return (
          <span className={`badge ${statusColors[item.nfse_status] || 'bg-secondary'}`}>
            {statusLabels[item.nfse_status] || item.nfse_status}
          </span>
        );
      }
    },
    {
      key: 'titulo_id',
      label: 'Título ID',
      sortable: true,
      render: (item: NotaFiscal) => item.titulo_id || '-'
    },
    {
      key: 'chave_acesso',
      label: 'Chave de Acesso',
      sortable: true,
      render: (item: NotaFiscal) => (
        <span className="text-muted small">
          {item.chave_acesso || '-'}
        </span>
      )
    },
    {
      key: 'protocolo',
      label: 'Protocolo',
      sortable: true,
      render: (item: NotaFiscal) => item.protocolo || '-'
    },
    {
      key: 'data_autorizacao',
      label: 'Data Autorização',
      sortable: true,
      render: (item: NotaFiscal) => item.data_autorizacao ? formatDateTime(item.data_autorizacao) : '-'
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (item: NotaFiscal & { created_at_formatada?: string | null }) => {
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ], []);

  // Configurar modal centralizado
  const modal = useListModal({
    title,
    columns,
    searchPlaceholder: '',
    searchFields: [
      { key: 'id', label: 'ID' },
      { key: 'numero', label: 'Número' },
      { key: 'chave_acesso', label: 'Chave de Acesso' },
      { key: 'protocolo', label: 'Protocolo' },
      { key: 'valor', label: 'Valor' },
      { key: 'status', label: 'Status' },
      { key: 'nfse_status', label: 'NFS-e Status' },
      { key: 'titulo_id', label: 'Título ID' },
      { key: 'cliente', label: 'Cliente' }
    ],
    multiSelect: false
  });

  // Hook para buscar notas fiscais
  const { data: notasFiscaisData, isLoading, refetch } = useNotasFiscais({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleAudit = useCallback((notaFiscal: NotaFiscal) => {
    auditoria.handleAudit('NotaFiscal', notaFiscal.id);
  }, [auditoria]);

  const handleImprimir = useCallback(async (selectedItems?: NotaFiscal[]) => {
    if (!selectedItems || selectedItems.length === 0) {
      error('Selecione pelo menos uma nota fiscal');
      return;
    }

    const notaFiscal = selectedItems[0];
    setShowImprimirModal(true);
    setIsGeneratingPdf(true);

    try {
      const blob = await NotaFiscalService.imprimirPdf(notaFiscal.id);
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      success('PDF da nota fiscal gerado com sucesso!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar PDF da nota fiscal';
      error(errorMessage);
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [error, success]);

  const handleCancelar = useCallback((selectedItems?: NotaFiscal[]) => {
    if (!selectedItems || selectedItems.length === 0) {
      error('Selecione uma nota fiscal para cancelar');
      return;
    }

    if (selectedItems.length > 1) {
      error('Selecione apenas uma nota fiscal para cancelar');
      return;
    }

    const notaFiscal = selectedItems[0];

    // Verificar se a nota fiscal pode ser cancelada
    if (notaFiscal.status !== 'AUTORIZADA') {
      if (notaFiscal.status === 'CANCELADA') {
        error('Esta nota fiscal já foi cancelada');
      } else {
        error('Apenas notas fiscais autorizadas podem ser canceladas');
      }
      return;
    }

    setNotaFiscalParaCancelar(notaFiscal);
    setShowCancelarModal(true);
  }, [error]);

  const handleCancelarSuccess = useCallback(() => {
    refetch();
    setNotaFiscalParaCancelar(null);
    setShowCancelarModal(false);
  }, [refetch]);

  const bulkActions = useMemo(() => [
    {
      label: 'Imprimir',
      variant: 'primary' as const,
      disabled: (selectedItems: NotaFiscal[]) => selectedItems.length === 0,
      action: (selectedItems: NotaFiscal[]) => handleImprimir(selectedItems)
    },
    {
      label: 'Cancelar Nota Fiscal',
      disabled: (selectedItems: NotaFiscal[]) => {
        if (selectedItems.length !== 1) return true;
        const notaFiscal = selectedItems[0];
        return notaFiscal.status !== 'AUTORIZADA';
      },
      action: (selectedItems: NotaFiscal[]) => handleCancelar(selectedItems)
    }
  ], [handleImprimir, handleCancelar]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
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

  const handlePageChange = useCallback((page: number) => {
    tableFilters.setPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setPage]);

  const handleLimitChange = useCallback((limit: number) => {
    tableFilters.setLimit(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setLimit]);

  const modalData = useMemo(() => notasFiscaisData?.data || [], [notasFiscaisData?.data]);

  // Paginação do backend
  const pagination = useMemo(() => {
    if (notasFiscaisData?.pagination && typeof notasFiscaisData.pagination === 'object') {
      const pag = notasFiscaisData.pagination;
      const total = pag.total ?? 0;
      const perPage = pag.per_page ?? tableFilters.limit;
      const currentPage = pag.current_page ?? tableFilters.page;
      
      // Calcular last_page se não estiver definido
      let lastPage = pag.last_page;
      if (!lastPage && total > 0) {
        lastPage = Math.max(1, Math.ceil(total / perPage));
      } else if (!lastPage) {
        lastPage = 1;
      }
      
      return {
        current_page: currentPage,
        last_page: lastPage,
        per_page: perPage,
        total: total,
        from: pag.from ?? ((currentPage - 1) * perPage) + 1,
        to: pag.to ?? Math.min(currentPage * perPage, total)
      };
    }
    return {
      current_page: tableFilters.page,
      last_page: 1,
      per_page: tableFilters.limit,
      total: 0,
      from: 0,
      to: 0
    };
  }, [notasFiscaisData?.pagination, tableFilters.page, tableFilters.limit]);

  return (
    <>
      <ListModal
        show={show}
        onClose={onClose}
        config={modal.config}
        data={modalData}
        loading={isLoading}
        search={tableFilters.search}
        onSearchChange={handleSearchChange}
        onSearchFieldChange={handleSearchFieldChange}
        pagination={pagination}
        onPageChange={handlePageChange}
        limit={tableFilters.limit}
        onLimitChange={handleLimitChange}
        refreshQueryFn={handleRefresh}
        bulkActions={bulkActions}
        onAudit={handleAudit}
        auditEntity="NotaFiscal"
        skipWrapper={skipWrapper}
      />

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId="auditoria-nota-fiscal-modal"
      />

      {/* Modal de Visualização de PDF da Nota Fiscal */}
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
        title="Visualizar Nota Fiscal"
        modalId="nota-fiscal-imprimir-modal"
      />

      {/* Modal de Cancelamento de Nota Fiscal */}
      <CancelarNotaFiscalModal
        show={showCancelarModal}
        onClose={() => {
          setShowCancelarModal(false);
          setNotaFiscalParaCancelar(null);
        }}
        onSuccess={handleCancelarSuccess}
        notaFiscal={notaFiscalParaCancelar}
      />
    </>
  );
};

export default NotaFiscalListModal;
