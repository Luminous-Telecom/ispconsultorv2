import React, { useState, useCallback, useMemo } from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useI18n } from 'contexts/I18nContext';
import { useBulkBtn } from 'components/ui';
import { useNotasFiscais } from 'hooks/useNotasFiscais';
import { useTableFilters } from 'hooks/useTableFilters';
import { useAuditoria } from 'hooks/useAuditoria';
import { NotaFiscalService } from 'services/notaFiscalService';
import { NotaFiscal } from 'types';
import { formatCurrency, formatDate, formatDateTime } from 'utils/formatters';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import ImprimirModal from 'components/common/ImprimirModal';
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
  title,
  skipWrapper = false
}) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const { error, success } = useNotificationContext();
  const defaultTitle = title || t('menu.invoices');
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

  // Configurar colunas memoizadas para Table
  const tableColumns: TableConfig<NotaFiscal & { created_at_formatada?: string | null }>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '42px',
      render: (item: NotaFiscal) => <span>{item.id}</span>
    },
    {
      key: 'numero',
      label: t('table.number'),
      sortable: true,
      render: (item: NotaFiscal) => item.numero || '-'
    },
    {
      key: 'cliente',
      label: t('table.client'),
      sortable: true,
      render: (item: NotaFiscal) => (
        <span>{item.cliente?.razao_social || item.cliente?.nome_fantasia || '-'}</span>
      )
    },
    {
      key: 'data_emissao',
      label: t('table.issueDate'),
      sortable: true,
      render: (item: NotaFiscal) => item.data_emissao ? formatDate(item.data_emissao) : '-'
    },
    {
      key: 'valor_total',
      label: t('table.totalValue'),
      sortable: true,
      render: (item: NotaFiscal) => (
        <span className="text-success">
          {formatCurrency(item.valor_total || 0)}
        </span>
      )
    },
    {
      key: 'status',
      label: t('table.status'),
      sortable: true,
      badgeLabels: [t('status.pending'), t('status.processing'), t('status.authorized'), t('status.cancelled'), t('status.rejected'), t('status.error')],
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
          'PENDENTE': t('status.pending'),
          'PROCESSANDO': t('status.processing'),
          'AUTORIZADA': t('status.authorized'),
          'CANCELADA': t('status.cancelled'),
          'REJEITADA': t('status.rejected'),
          'ERRO': t('status.error')
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
      label: t('params.nfse') + ' ' + t('table.status'),
      sortable: true,
      badgeLabels: [t('status.scheduled'), t('status.issued'), t('status.cancelled'), t('status.rejected'), t('status.error')],
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
          'agendado': t('status.scheduled'),
          'emitida': t('status.issued'),
          'cancelada': t('status.cancelled'),
          'rejeitada': t('status.rejected'),
          'erro': t('status.error')
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
      label: t('table.id') + ' ' + t('table.contract'),
      sortable: true,
      render: (item: NotaFiscal) => item.titulo_id || '-'
    },
    {
      key: 'chave_acesso',
      label: t('table.accessKey'),
      sortable: true,
      render: (item: NotaFiscal) => (
        <span className="text-muted small">
          {item.chave_acesso || '-'}
        </span>
      )
    },
    {
      key: 'protocolo',
      label: t('table.protocol'),
      sortable: true,
      render: (item: NotaFiscal) => item.protocolo || '-'
    },
    {
      key: 'data_autorizacao',
      label: t('table.authorizationDate'),
      sortable: true,
      render: (item: NotaFiscal) => item.data_autorizacao ? formatDateTime(item.data_autorizacao) : '-'
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      render: (item: NotaFiscal & { created_at_formatada?: string | null }) => {
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ], [t]);

  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'numero', label: t('table.number') },
    { key: 'chave_acesso', label: t('table.accessKey') },
    { key: 'protocolo', label: t('table.protocol') },
    { key: 'valor', label: t('table.value') },
    { key: 'status', label: t('table.status') },
    { key: 'nfse_status', label: t('params.nfse') + ' ' + t('table.status') },
    { key: 'titulo_id', label: t('table.id') + ' ' + t('table.contract') },
    { key: 'cliente', label: t('table.client') }
  ];

  // Hook para buscar notas fiscais
  const { data: notasFiscaisData, isLoading, refetch } = useNotasFiscais({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleAudit = useCallback((notaFiscal: NotaFiscal) => {
    auditoria.handleAudit('NotaFiscal', notaFiscal.id);
  }, [auditoria]);

  const handleImprimir = useCallback(async (selectedItems?: NotaFiscal[]) => {
    if (!selectedItems || selectedItems.length === 0) {
      error(t('messages.selectAtLeastOneInvoice'));
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
      success(t('messages.invoicePdfGenerated'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('messages.errorGeneratingInvoicePdf');
      error(errorMessage);
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [error, success, t]);

  const handleCancelar = useCallback((selectedItems?: NotaFiscal[]) => {
    if (!selectedItems || selectedItems.length === 0) {
      error(t('messages.selectInvoiceToCancel'));
      return;
    }

    if (selectedItems.length > 1) {
      error(t('messages.selectOnlyOneInvoiceToCancel'));
      return;
    }

    const notaFiscal = selectedItems[0];

    // Verificar se a nota fiscal pode ser cancelada
    if (notaFiscal.status !== 'AUTORIZADA') {
      if (notaFiscal.status === 'CANCELADA') {
        error(t('messages.invoiceAlreadyCanceled'));
      } else {
        error(t('messages.onlyAuthorizedCanBeCanceled'));
      }
      return;
    }

    setNotaFiscalParaCancelar(notaFiscal);
    setShowCancelarModal(true);
  }, [error, t]);

  const handleCancelarSuccess = useCallback(() => {
    refetch();
    setNotaFiscalParaCancelar(null);
    setShowCancelarModal(false);
  }, [refetch]);

  const bulkActions = useMemo(() => [
    {
      label: bulkBtn.imprimir.label,
      variant: bulkBtn.imprimir.variant,
      disabled: (selectedItems: NotaFiscal[]) => selectedItems.length === 0,
      action: (selectedItems: NotaFiscal[]) => handleImprimir(selectedItems),
    },
    {
      label: t('modal.cancelInvoice'),
      disabled: (selectedItems: NotaFiscal[]) => {
        if (selectedItems.length !== 1) return true;
        const notaFiscal = selectedItems[0];
        return notaFiscal.status !== 'AUTORIZADA';
      },
      action: (selectedItems: NotaFiscal[]) => handleCancelar(selectedItems),
    },
  ], [bulkBtn, handleImprimir, handleCancelar, t]);

  const modalData = useMemo(() => notasFiscaisData?.data || [], [notasFiscaisData?.data]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
  }, [tableFilters]);

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

  const modalContent = (
    <>
      <Table
            title={defaultTitle}
            config={{
              columns: tableColumns,
              data: modalData,
              loading: isLoading,
              searchable: true,
              searchPlaceholder: t('layout.searchPlaceholder'),
              searchFields,
              sortable: true,
              sortColumn: tableFilters.sortColumn,
              sortDirection: tableFilters.sortDirection,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              bulkActions: bulkActions.map(action => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                onClick: action.action,
                disabled: action.disabled,
                variant: action.variant
              })),
              emptyMessage: 'Nenhuma nota fiscal encontrada',
              pagination: pagination
            }}
            tableId="notas-fiscais-list-modal"
            syncWithHeader={false}
            onSelectionChange={() => {}}
            onRefresh={handleRefresh}
            onAudit={handleAudit}
            auditEntity="NotaFiscal"
            onPageChange={(page) => {
              setTimeout(() => {
                tableFilters.setPage(page);
              }, 0);
            }}
            onPageSizeChange={(limit) => {
              setTimeout(() => {
                tableFilters.setLimit(limit);
              }, 0);
            }}
            onSort={(column, direction) => {
              setTimeout(() => {
                tableFilters.setSort(column, direction);
              }, 0);
            }}
            onSearch={(search, field) => handleSearchChange(search, field)}
            search={tableFilters.search}
          />
    </>
  );

  if (skipWrapper) {
    return (
      <>
        {modalContent}
        {/* Modal de Visualização de PDF de Auditoria */}
        <ImprimirModal
          show={auditoria.showPreview}
          onClose={auditoria.handleClosePreview}
          pdfUrl={auditoria.pdfUrl}
          isGenerating={auditoria.isGeneratingPdf}
          title={t('financial.executionLogs')}
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
          title={t('modal.viewInvoice')}
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
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={defaultTitle}
        size="lg"
        modalId="notas-fiscais-list-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
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
        title={t('modal.viewInvoice')}
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
