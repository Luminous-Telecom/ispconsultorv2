import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useContasPagar, useDeleteContaPagar, useDuplicarContaPagar } from 'hooks/useContasPagar';
import { useFornecedores } from 'hooks/useFornecedores';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime, formatDate, formatCurrency } from 'utils/formatters';
import { ContaPagar, ContaPagarFilters } from 'types';
import { FilterValue } from 'types/common';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import ImprimirModal from 'components/common/ImprimirModal';
import ContaPagarModal from './ContaPagarModal';

interface ContasPagarListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectContaPagar?: (contaPagar: ContaPagar) => void;
  title?: string;
  skipWrapper?: boolean;
  initialFilters?: Partial<ContaPagarFilters>;
}

const ContasPagarListModal: React.FC<ContasPagarListModalProps> = ({
  show,
  onClose,
  onSelectContaPagar,
  title,
  skipWrapper = false,
  initialFilters,
}) => {
  const { t } = useI18n();
  const defaultTitle = title || t('financial.accountsPayable');
  const isMobile = useIsMobile();

  const list = useEntityListModal<ContaPagar>({
    onClose,
    onSelect: onSelectContaPagar,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [selectedContaPagarId, setSelectedContaPagarId] = useState<number | null>(null);

  const [dataVencimentoInicio, setDataVencimentoInicio] = useState<string>('');
  const [dataVencimentoFim, setDataVencimentoFim] = useState<string>('');

  useEffect(() => {
    if (show && initialFilters?.data_inicio && initialFilters?.data_fim) {
      setDataVencimentoInicio(initialFilters.data_inicio);
      setDataVencimentoFim(initialFilters.data_fim);
    }
  }, [show, initialFilters?.data_inicio, initialFilters?.data_fim]);

  const { data: fornecedoresData } = useFornecedores({ limit: 1000 });
  const fornecedoresOptions = useMemo(() => {
    if (!fornecedoresData?.data) return [];
    return fornecedoresData.data.map((fornecedor) => ({
      value: fornecedor.id?.toString() || '',
      label:
        fornecedor.nome_razao_social ||
        fornecedor.nome_fantasia ||
        `Fornecedor ${fornecedor.id}`,
    }));
  }, [fornecedoresData]);

  const getStatusBadge = useCallback(
    (status: ContaPagar['status']) => {
      const statusMap = {
        A_PAGAR: { label: t('financial.toPay'), className: 'bg-warning' },
        PAGO: { label: t('financial.paid'), className: 'bg-success' },
        PARCIAL: { label: t('status.pending'), className: 'bg-info' },
        CANCELADO: { label: t('status.rejected'), className: 'bg-secondary' },
      };
      const statusInfo = statusMap[status] || { label: status, className: 'bg-secondary' };
      return <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>;
    },
    [t]
  );

  const getTipoPagamentoBadge = useCallback(
    (tipo: ContaPagar['tipo_pagamento']) => {
      const tipoMap: Record<string, string> = {
        DINHEIRO: t('form.paymentTypeCash'),
        BOLETO: t('form.paymentTypeBoleto'),
        CARTAO: t('form.paymentTypeCard'),
        DEPOSITO: t('form.paymentTypeDeposit'),
        DEBITO_CONTA: t('form.paymentTypeDebit'),
        TRANSFERENCIA: t('form.paymentTypeTransfer'),
        PIX: t('form.paymentTypePix'),
      };
      return tipoMap[tipo] || tipo;
    },
    [t]
  );

  const columns = useMemo(
    (): ListModalConfig<ContaPagar>['columns'] => [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '42px',
        render: (item) => <span className="text-nowrap">{item.id ?? '-'}</span>,
      },
      {
        key: 'fornecedor',
        label: t('table.supplier'),
        sortable: true,
        render: (item) => item.fornecedor?.nome_razao_social || '-',
      },
      {
        key: 'data_vencimento',
        label: t('table.dueDate'),
        sortable: true,
        width: '130px',
        render: (item) => (
          <span className="text-nowrap">
            {item.data_vencimento ? formatDate(item.data_vencimento) : '-'}
          </span>
        ),
      },
      {
        key: 'valor',
        label: t('table.value'),
        sortable: true,
        width: '130px',
        render: (item) => (
          <span className="text-nowrap">{formatCurrency(item.valor || 0)}</span>
        ),
      },
      {
        key: 'valor_pago',
        label: t('table.paidValue'),
        sortable: true,
        width: '130px',
        render: (item) => (
          <span className="text-nowrap">{formatCurrency(item.valor_pago || 0)}</span>
        ),
      },
      {
        key: 'saldo_devedor',
        label: t('table.balanceDue'),
        sortable: true,
        width: '130px',
        render: (item) => {
          const valor =
            typeof item.valor === 'number' ? item.valor : parseFloat(String(item.valor || 0));
          const valorPago =
            typeof item.valor_pago === 'number'
              ? item.valor_pago
              : parseFloat(String(item.valor_pago || 0));
          const saldo = valor - valorPago;
          return (
            <span className={`text-nowrap ${saldo > 0 ? 'text-danger' : 'text-success'}`}>
              {formatCurrency(saldo)}
            </span>
          );
        },
      },
      {
        key: 'status',
        label: t('table.status'),
        sortable: true,
        badgeLabels: [
          t('financial.toPay'),
          t('financial.paid'),
          t('status.pending'),
          t('status.rejected'),
        ],
        render: (item) => getStatusBadge(item.status),
      },
      {
        key: 'tipo_pagamento',
        label: t('table.paymentType'),
        sortable: true,
        width: '150px',
        render: (item) => (
          <span className="text-nowrap">{getTipoPagamentoBadge(item.tipo_pagamento)}</span>
        ),
      },
      {
        key: 'numero_documento',
        label: t('table.documentNumber'),
        sortable: true,
        width: '150px',
        render: (item) => (
          <span className="text-nowrap">{item.numero_documento || '-'}</span>
        ),
      },
      {
        key: 'descricao',
        label: t('table.description'),
        sortable: true,
        width: '200px',
        render: (item) => (
          <span className="text-nowrap" title={item.descricao || ''}>
            {item.descricao
              ? item.descricao.length > 50
                ? `${item.descricao.substring(0, 50)}...`
                : item.descricao
              : '-'}
          </span>
        ),
      },
      {
        key: 'data_pagamento',
        label: t('table.paymentDate'),
        sortable: true,
        width: '130px',
        render: (item) => (
          <span className="text-nowrap">
            {item.data_pagamento ? formatDate(item.data_pagamento) : '-'}
          </span>
        ),
      },
      {
        key: 'created_at',
        label: t('table.createdAt'),
        sortable: true,
        width: '150px',
        render: (item) => {
          const row = item as ContaPagar & {
            created_at?: string;
            created_at_formatada?: string | null;
          };
          if (row.created_at_formatada) return row.created_at_formatada;
          return row.created_at ? formatDateTime(row.created_at) : '-';
        },
      },
    ],
    [t, getStatusBadge, getTipoPagamentoBadge]
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: t('table.id') },
      { key: 'numero_documento', label: t('table.documentNumber') },
      { key: 'nota_fiscal', label: t('form.invoiceNumber') },
      { key: 'fornecedor', label: t('table.supplier') },
      { key: 'vencimento', label: t('table.dueDate') },
      { key: 'valor', label: t('table.value') },
      { key: 'status', label: t('table.status') },
      { key: 'tipo', label: t('form.paymentType') },
    ],
    [t]
  );

  const tableFiltersConfig = useMemo(
    () => [
      {
        key: 'fornecedor_id',
        label: t('table.supplier'),
        type: 'select' as const,
        options: fornecedoresOptions,
        placeholder: t('placeholder.selectProvider'),
      },
      {
        key: 'data_inicio',
        label: t('form.dueDateStart'),
        type: 'date' as const,
        placeholder: t('placeholder.startDate'),
      },
      {
        key: 'data_fim',
        label: t('form.dueDateEnd'),
        type: 'date' as const,
        placeholder: t('placeholder.endDate'),
      },
      {
        key: 'status',
        label: t('table.status'),
        type: 'select' as const,
        options: [
          { value: 'A_PAGAR', label: t('financial.toPay') },
          { value: 'PAGO', label: t('financial.paid') },
          { value: 'PARCIAL', label: t('status.pending') },
          { value: 'CANCELADO', label: t('status.rejected') },
        ],
        placeholder: t('ui.selectOption'),
      },
      {
        key: 'tipo_pagamento',
        label: t('form.paymentType'),
        type: 'select' as const,
        options: [
          { value: 'DINHEIRO', label: t('form.paymentTypeCash') },
          { value: 'BOLETO', label: t('form.paymentTypeBoleto') },
          { value: 'CARTAO', label: t('form.paymentTypeCard') },
          { value: 'DEPOSITO', label: t('form.paymentTypeDeposit') },
          { value: 'DEBITO_CONTA', label: t('form.paymentTypeDebit') },
          { value: 'TRANSFERENCIA', label: t('form.paymentTypeTransfer') },
          { value: 'PIX', label: t('form.paymentTypePix') },
        ],
        placeholder: t('placeholder.selectType'),
      },
    ],
    [t, fornecedoresOptions]
  );

  useEffect(() => {
    list.tableFilters.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVencimentoInicio, dataVencimentoFim]);

  const apiFilters = useMemo(() => {
    const filters: ContaPagarFilters = {
      ...(list.tableFilters.filters.status && {
        status: list.tableFilters.filters.status as ContaPagarFilters['status'],
      }),
      ...(list.tableFilters.filters.tipo_pagamento && {
        tipo_pagamento: list.tableFilters.filters
          .tipo_pagamento as ContaPagarFilters['tipo_pagamento'],
      }),
      ...(list.tableFilters.filters.fornecedor_id && {
        fornecedor_id: String(list.tableFilters.filters.fornecedor_id),
      }),
      ...(dataVencimentoInicio && { data_inicio: dataVencimentoInicio }),
      ...(dataVencimentoFim && { data_fim: dataVencimentoFim }),
    };
    return filters;
  }, [list.tableFilters.filters, dataVencimentoInicio, dataVencimentoFim]);

  const { data: contasPagarData, isLoading, refetch } = useContasPagar({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn || undefined,
    sortDirection: list.tableFilters.sortDirection || undefined,
    ...apiFilters,
  });

  const resumoFinanceiro = useMemo(() => {
    const contas = (contasPagarData?.data || []).filter((item) => item.id != null);

    const valorTotal = contas.reduce((sum, item) => sum + Number(item.valor || 0), 0);

    const valorBaixado = contas.reduce((sum, item) => {
      const valorPago = Number(item.valor_pago || 0);
      if (valorPago > 0) return sum + valorPago;
      return sum;
    }, 0);

    const valorAberto = contas.reduce((sum, item) => {
      if (item.status === 'PAGO' || item.status === 'CANCELADO') return sum;
      const valor = Number(item.valor || 0);
      const valorPago = Number(item.valor_pago || 0);
      const valorAbertoItem = valor - valorPago;
      return sum + (valorAbertoItem > 0 ? valorAbertoItem : 0);
    }, 0);

    const valorTotalPago = contas.reduce((sum, item) => {
      if (item.status === 'PAGO') return sum + Number(item.valor || 0);
      return sum;
    }, 0);

    const valorCancelado = contas.reduce((sum, item) => {
      if (item.status === 'CANCELADO') return sum + Number(item.valor || 0);
      return sum;
    }, 0);

    return { valorTotal, valorBaixado, valorAberto, valorTotalPago, valorCancelado };
  }, [contasPagarData?.data]);

  const deleteContaPagarMutation = useDeleteContaPagar();
  const duplicarContaPagarMutation = useDuplicarContaPagar();

  const handleDelete = useCallback(
    async (contaPagarId: number) => {
      try {
        await deleteContaPagarMutation.mutateAsync(contaPagarId);
        refetch();
      } catch {
        // Erro já tratado pelo hook
      }
    },
    [deleteContaPagarMutation, refetch]
  );

  const handleDuplicar = useCallback(
    async (contaPagarId: number) => {
      try {
        await duplicarContaPagarMutation.mutateAsync(contaPagarId);
        refetch();
      } catch {
        // Erro já tratado pelo hook
      }
    },
    [duplicarContaPagarMutation, refetch]
  );

  const handleAudit = useCallback(
    (contaPagar: ContaPagar) => {
      list.auditoria.handleAudit('ContaPagar', contaPagar.id);
    },
    [list.auditoria]
  );

  const handleFiltersChange = useCallback(
    (filterValues: Record<string, FilterValue>) => {
      const convertedFilters: Partial<ContaPagarFilters> = {};
      Object.entries(filterValues).forEach(([key, value]) => {
        convertedFilters[key as keyof ContaPagarFilters] = Array.isArray(value)
          ? value[0] || null
          : (value as string | number | boolean | null | undefined);
      });
      list.tableFilters.setFilters(convertedFilters);
    },
    [list.tableFilters]
  );

  const bulkActions = useMemo(() => {
    if (onSelectContaPagar) {
      return [
        {
          label: list.bulkBtn.cancelar.label,
          variant: list.bulkBtn.cancelar.variant,
          action: () => {
            list.clearSelection();
            onClose();
          },
        },
        {
          label: list.bulkBtn.inserir.label,
          variant: list.bulkBtn.inserir.variant,
          disabled: (selectedItems: ContaPagar[]) => list.isNothingSelected(selectedItems),
          action: (selectedItems: ContaPagar[]) => {
            const item = list.resolveItem(selectedItems);
            if (item) {
              list.clearSelection();
              onSelectContaPagar(item);
              onClose();
            }
          },
        },
      ];
    }

    return [
      {
        label: list.bulkBtn.novo.label,
        variant: list.bulkBtn.novo.variant,
        action: () => setShowCreateModal(true),
      },
      {
        label: list.bulkBtn.editar.label,
        variant: list.bulkBtn.editar.variant,
        disabled: (selectedItems: ContaPagar[]) => list.isNothingSelected(selectedItems),
        action: (selectedItems: ContaPagar[]) => {
          const item = list.resolveItem(selectedItems);
          if (item) {
            setSelectedContaPagarId(item.id);
            setShowEditModal(true);
          }
        },
      },
      {
        label: list.bulkBtn.deletar.label,
        variant: list.bulkBtn.deletar.variant,
        disabled: (selectedItems: ContaPagar[]) => list.isNothingSelected(selectedItems),
        action: async (selectedItems: ContaPagar[]) => {
          const item = list.resolveItem(selectedItems);
          if (!item) return;
          if (!window.confirm(t('messages.confirmDeleteAccountPayable'))) return;
          await handleDelete(item.id);
        },
      },
      {
        label: list.bulkBtn.pagar.label,
        variant: list.bulkBtn.pagar.variant,
        disabled: (selectedItems: ContaPagar[]) => {
          const item = list.resolveItem(selectedItems);
          return !item || item.status === 'PAGO' || item.status === 'CANCELADO';
        },
        action: (selectedItems: ContaPagar[]) => {
          const item = list.resolveItem(selectedItems);
          if (item) {
            setSelectedContaPagarId(item.id);
            setShowPagamentoModal(true);
          }
        },
      },
      {
        label: list.bulkBtn.duplicar.label,
        variant: list.bulkBtn.duplicar.variant,
        disabled: (selectedItems: ContaPagar[]) => list.isNothingSelected(selectedItems),
        action: (selectedItems: ContaPagar[]) => {
          const item = list.resolveItem(selectedItems);
          if (item) handleDuplicar(item.id);
        },
      },
    ];
  }, [onSelectContaPagar, list, onClose, t, handleDelete, handleDuplicar]);

  const pagination = useMemo(
    () => list.buildPagination(contasPagarData?.pagination),
    [list, contasPagarData?.pagination]
  );

  const modalData = useMemo(
    () => (contasPagarData?.data || []).filter((item) => item.id != null),
    [contasPagarData?.data]
  );

  const hasResumo = show && modalData.length > 0;

  const handleRowSelect = useCallback(
    (item: ContaPagar) => {
      onSelectContaPagar?.(item);
      onClose();
    },
    [onSelectContaPagar, onClose]
  );

  const customControlsAfterActions = useMemo(
    () => (
      <div className="d-flex align-items-center gap-2">
        <label htmlFor="dataVencimentoInicio" className="form-label mb-0 small">
          {t('filter.startDate')}
        </label>
        <input
          type="date"
          id="dataVencimentoInicio"
          className="form-control form-control-sm table-pagination-filter"
          value={dataVencimentoInicio}
          onChange={(e) => setDataVencimentoInicio(e.target.value)}
        />
        <label htmlFor="dataVencimentoFim" className="form-label mb-0 small">
          {t('filter.endDate')}
        </label>
        <input
          type="date"
          id="dataVencimentoFim"
          className="form-control form-control-sm table-pagination-filter"
          value={dataVencimentoFim}
          onChange={(e) => setDataVencimentoFim(e.target.value)}
        />
      </div>
    ),
    [t, dataVencimentoInicio, dataVencimentoFim]
  );

  const listModal = (
    <ListModal<ContaPagar>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchFields,
        emptyMessage: 'Nenhuma conta a pagar encontrada',
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
      onRowClick={onSelectContaPagar ? handleRowSelect : undefined}
      onRowDoubleClick={onSelectContaPagar ? handleRowSelect : undefined}
      onAudit={handleAudit}
      auditEntity="ContaPagar"
      filters={tableFiltersConfig}
      onFiltersChange={handleFiltersChange}
      customControlsAfterActions={customControlsAfterActions}
      tableId="contas-pagar-list-modal"
      modalId="contas-pagar-list-modal"
    />
  );

  const resumo = hasResumo ? (
    <div
      className="d-flex justify-content-end align-items-center p-3 bg-light financeiro-resumo"
      style={{
        flexShrink: 0,
        marginTop: isMobile ? '0.25rem' : '0.5rem',
        marginBottom: 0,
        marginLeft: isMobile ? '0.5rem' : '1rem',
        marginRight: isMobile ? '0.5rem' : '1rem',
      }}
    >
      <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
        <div className="text-end">
          <div className="small text-muted">{t('summary.value')}</div>
          <strong>{formatCurrency(resumoFinanceiro.valorTotal)}</strong>
        </div>
        <div className="text-end">
          <div className="small text-muted">{t('summary.paidValue')}</div>
          <strong>{formatCurrency(resumoFinanceiro.valorBaixado)}</strong>
        </div>
        <div className="text-end">
          <div className="small text-muted">{t('summary.openValue')}</div>
          <strong>{formatCurrency(resumoFinanceiro.valorAberto)}</strong>
        </div>
        <div className="text-end">
          <div className="small text-muted">{t('summary.totalPaidValue')}</div>
          <strong>{formatCurrency(resumoFinanceiro.valorTotalPago)}</strong>
        </div>
        <div className="text-end">
          <div className="small text-muted">{t('summary.canceledValue')}</div>
          <strong>{formatCurrency(resumoFinanceiro.valorCancelado)}</strong>
        </div>
      </div>
    </div>
  ) : null;

  const auxiliaryModals = (
    <>
      {showCreateModal && (
        <ContaPagarModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => refetch()}
        />
      )}

      {showEditModal && selectedContaPagarId && (
        <ContaPagarModal
          show={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedContaPagarId(null);
          }}
          contaPagarId={selectedContaPagarId}
          onSuccess={() => refetch()}
        />
      )}

      <ContaPagarModal
        key={`pagamento-manual-${selectedContaPagarId || 'none'}`}
        show={showPagamentoModal}
        onClose={() => {
          setShowPagamentoModal(false);
          setSelectedContaPagarId(null);
        }}
        contaPagarId={selectedContaPagarId}
        onSuccess={() => refetch()}
        showPagamentoOnOpen={true}
      />

      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-conta-pagar-modal"
      />
    </>
  );

  return (
    <>
      {listModal}
      {resumo}
      {auxiliaryModals}
    </>
  );
};

export default ContasPagarListModal;
