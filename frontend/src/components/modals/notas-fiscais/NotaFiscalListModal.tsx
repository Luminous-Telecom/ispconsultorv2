import React, { useState, useCallback, useMemo } from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useI18n } from 'contexts/I18nContext';
import { useBulkBtn } from 'components/ui';
import { useNotasFiscais } from 'hooks/useNotasFiscais';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { NotaFiscalService } from 'services/notaFiscalService';
import { NotaFiscal } from 'types';
import { formatCurrency, formatDate, formatDateTime } from 'utils/formatters';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
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
  skipWrapper = false,
}) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const { error, success } = useNotificationContext();
  const defaultTitle = title || t('menu.invoices');

  const list = useEntityListModal<NotaFiscal>({ onClose });

  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [notaFiscalParaCancelar, setNotaFiscalParaCancelar] = useState<NotaFiscal | null>(null);

  const { data: notasFiscaisData, isLoading, refetch } = useNotasFiscais({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
  });

  const columns = useMemo(
    (): ListModalConfig<NotaFiscal>['columns'] => [
      {
        key: 'status',
        label: t('table.status'),
        sortable: true,
        badgeLabels: [
          t('status.pending'),
          t('status.processing'),
          t('status.authorized'),
          t('status.cancelled'),
          t('status.rejected'),
          t('status.error'),
        ],
        render: (item) => {
          const statusColors: Record<string, string> = {
            PENDENTE: 'bg-secondary',
            PROCESSANDO: 'bg-info',
            AUTORIZADA: 'bg-success',
            CANCELADA: 'bg-danger',
            REJEITADA: 'bg-danger',
            ERRO: 'bg-warning',
          };
          const statusLabels: Record<string, string> = {
            PENDENTE: t('status.pending'),
            PROCESSANDO: t('status.processing'),
            AUTORIZADA: t('status.authorized'),
            CANCELADA: t('status.cancelled'),
            REJEITADA: t('status.rejected'),
            ERRO: t('status.error'),
          };
          return (
            <span className={`badge ${statusColors[item.status] || 'bg-secondary'}`}>
              {statusLabels[item.status] || item.status}
            </span>
          );
        },
      },
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        render: (item) => <span>{item.id}</span>,
      },
      {
        key: 'numero',
        label: t('table.number'),
        sortable: true,
        render: (item) => item.numero || '-',
      },
      {
        key: 'cliente',
        label: t('table.client'),
        sortable: true,
        render: (item) => (
          <span>{item.cliente?.razao_social || item.cliente?.nome_fantasia || '-'}</span>
        ),
      },
      {
        key: 'data_emissao',
        label: t('table.issueDate'),
        sortable: true,
        render: (item) => (item.data_emissao ? formatDate(item.data_emissao) : '-'),
      },
      {
        key: 'valor_total',
        label: t('table.totalValue'),
        sortable: true,
        render: (item) => (
          <span className="text-success">{formatCurrency(item.valor_total || 0)}</span>
        ),
      },
      {
        key: 'nfse_status',
        label: t('params.nfse') + ' ' + t('table.status'),
        sortable: true,
        badgeLabels: [
          t('status.scheduled'),
          t('status.issued'),
          t('status.cancelled'),
          t('status.rejected'),
          t('status.error'),
        ],
        render: (item) => {
          if (!item.nfse_status) return '-';
          const statusColors: Record<string, string> = {
            agendado: 'bg-info',
            emitida: 'bg-success',
            cancelada: 'bg-danger',
            rejeitada: 'bg-danger',
            erro: 'bg-warning',
          };
          const statusLabels: Record<string, string> = {
            agendado: t('status.scheduled'),
            emitida: t('status.issued'),
            cancelada: t('status.cancelled'),
            rejeitada: t('status.rejected'),
            erro: t('status.error'),
          };
          return (
            <span className={`badge ${statusColors[item.nfse_status] || 'bg-secondary'}`}>
              {statusLabels[item.nfse_status] || item.nfse_status}
            </span>
          );
        },
      },
      {
        key: 'titulo_id',
        label: t('table.id') + ' ' + t('table.contract'),
        sortable: true,
        render: (item) => item.titulo_id || '-',
      },
      {
        key: 'chave_acesso',
        label: t('table.accessKey'),
        sortable: true,
        render: (item) => (
          <span className="text-muted small">{item.chave_acesso || '-'}</span>
        ),
      },
      {
        key: 'protocolo',
        label: t('table.protocol'),
        sortable: true,
        render: (item) => item.protocolo || '-',
      },
      {
        key: 'data_autorizacao',
        label: t('table.authorizationDate'),
        sortable: true,
        render: (item) =>
          item.data_autorizacao ? formatDateTime(item.data_autorizacao) : '-',
      },
      {
        key: 'created_at',
        label: t('table.createdAt'),
        sortable: true,
        render: (item) => {
          const row = item as NotaFiscal & { created_at_formatada?: string | null };
          if (row.created_at_formatada) return row.created_at_formatada;
          return row.created_at ? formatDateTime(row.created_at) : '-';
        },
      },
    ],
    [t]
  );

  const searchFields = useMemo(
    () => [
      { key: 'status', label: t('table.status') },
      { key: 'id', label: t('table.id') },
      { key: 'numero', label: t('table.number') },
      { key: 'chave_acesso', label: t('table.accessKey') },
      { key: 'protocolo', label: t('table.protocol') },
      { key: 'valor', label: t('table.value') },
      { key: 'nfse_status', label: t('params.nfse') + ' ' + t('table.status') },
      { key: 'titulo_id', label: t('table.id') + ' ' + t('table.contract') },
      { key: 'cliente', label: t('table.client') },
    ],
    [t]
  );

  const handleImprimir = useCallback(
    async (selectedItems?: NotaFiscal[]) => {
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
        const errorMessage =
          err instanceof Error ? err.message : t('messages.errorGeneratingInvoicePdf');
        error(errorMessage);
        setShowImprimirModal(false);
        setIsGeneratingPdf(false);
      }
    },
    [error, success, t]
  );

  const handleCancelar = useCallback(
    (selectedItems?: NotaFiscal[]) => {
      if (!selectedItems || selectedItems.length === 0) {
        error(t('messages.selectInvoiceToCancel'));
        return;
      }

      if (selectedItems.length > 1) {
        error(t('messages.selectOnlyOneInvoiceToCancel'));
        return;
      }

      const notaFiscal = selectedItems[0];

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
    },
    [error, t]
  );

  const handleCancelarSuccess = useCallback(() => {
    refetch();
    setNotaFiscalParaCancelar(null);
    setShowCancelarModal(false);
  }, [refetch]);

  const bulkActions = useMemo(
    () => [
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
          return selectedItems[0].status !== 'AUTORIZADA';
        },
        action: (selectedItems: NotaFiscal[]) => handleCancelar(selectedItems),
      },
    ],
    [bulkBtn, handleImprimir, handleCancelar, t]
  );

  const pagination = useMemo(
    () => list.buildPagination(notasFiscaisData?.pagination),
    [list, notasFiscaisData?.pagination]
  );

  const modalData = useMemo(() => notasFiscaisData?.data || [], [notasFiscaisData?.data]);

  const listModal = (
    <ListModal<NotaFiscal>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchFields,
        emptyMessage: 'Nenhuma nota fiscal encontrada',
      }}
      data={modalData}
      loading={isLoading}
      search={list.tableFilters.search}
      onSearchChange={list.handleSearchChange}
      onSearchFieldChange={list.tableFilters.setSearchField}
      sortColumn={list.tableFilters.sortColumn}
      sortDirection={list.tableFilters.sortDirection}
      onSortChange={list.tableFilters.setSort}
      pagination={pagination}
      onPageChange={list.tableFilters.setPage}
      onLimitChange={list.tableFilters.setLimit}
      onRefresh={refetch}
      bulkActions={bulkActions}
      onSelectionChange={list.handleSelectionChange}
      onAudit={(notaFiscal) => list.auditoria.handleAudit('NotaFiscal', notaFiscal.id)}
      auditEntity="NotaFiscal"
      tableId="notas-fiscais-list-modal"
      modalId="notas-fiscais-list-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-nota-fiscal-modal"
      />
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

  return (
    <>
      {listModal}
      {auxiliaryModals}
    </>
  );
};

export default NotaFiscalListModal;
