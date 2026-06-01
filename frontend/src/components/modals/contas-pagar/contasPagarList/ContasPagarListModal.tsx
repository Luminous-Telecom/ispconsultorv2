import React, { useState, useCallback, useMemo } from 'react';
import { ContaPagar } from 'types';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useI18n } from 'contexts/I18nContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import ListModal from 'components/common/ListModal';
import { ContasPagarListModalProps } from './contasPagarListTypes';
import { createGetStatusBadge, createGetTipoPagamentoBadge } from './contasPagarListUtils';
import { useContasPagarListColumns } from './contasPagarListColumns';
import { useContasPagarListData } from './useContasPagarListData';
import { useContasPagarTableFilters } from './useContasPagarTableFilters';
import { useContasPagarBulkActions } from './useContasPagarBulkActions';
import { ContasPagarListFilters } from './ContasPagarListFilters';
import { ContasPagarListResumo } from './ContasPagarListResumo';
import { ContasPagarListSubModals } from './ContasPagarListSubModals';

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

  const {
    dataVencimentoInicio,
    dataVencimentoFim,
    handleDataVencimentoInicioChange,
    handleDataVencimentoFimChange,
    fornecedoresOptions,
    modalData,
    resumoFinanceiro,
    isLoading,
    refetch,
    handleDelete,
    handleDuplicar,
    handleFiltersChange,
    pagination,
    hasResumo,
  } = useContasPagarListData({ show, initialFilters, list });

  const bulkActions = useContasPagarBulkActions({
    list,
    onSelectContaPagar,
    onClose,
    handleDelete,
    handleDuplicar,
    setShowCreateModal,
    setShowEditModal,
    setShowPagamentoModal,
    setSelectedContaPagarId,
  });

  const getStatusBadge = useMemo(() => createGetStatusBadge(t), [t]);
  const getTipoPagamentoBadge = useMemo(() => createGetTipoPagamentoBadge(t), [t]);
  const columns = useContasPagarListColumns({ t, getStatusBadge, getTipoPagamentoBadge });
  const tableFiltersConfig = useContasPagarTableFilters(t, fornecedoresOptions);

  const handleAudit = useCallback(
    (contaPagar: ContaPagar) => {
      list.auditoria.handleAudit('ContaPagar', contaPagar.id);
    },
    [list.auditoria]
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

  const handleRowSelect = useCallback(
    (item: ContaPagar) => {
      onSelectContaPagar?.(item);
      onClose();
    },
    [onSelectContaPagar, onClose]
  );

  const customControlsAfterActions = useMemo(
    () => (
      <ContasPagarListFilters
        dataVencimentoInicio={dataVencimentoInicio}
        dataVencimentoFim={dataVencimentoFim}
        onDataVencimentoInicioChange={handleDataVencimentoInicioChange}
        onDataVencimentoFimChange={handleDataVencimentoFimChange}
      />
    ),
    [
      dataVencimentoInicio,
      dataVencimentoFim,
      handleDataVencimentoInicioChange,
      handleDataVencimentoFimChange,
    ]
  );

  const handleCloseCreateModal = useCallback(() => setShowCreateModal(false), []);
  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setSelectedContaPagarId(null);
  }, []);
  const handleClosePagamentoModal = useCallback(() => {
    setShowPagamentoModal(false);
    setSelectedContaPagarId(null);
  }, []);

  return (
    <>
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

      {hasResumo && (
        <ContasPagarListResumo
          resumoFinanceiro={resumoFinanceiro}
          isMobile={isMobile}
          t={t}
        />
      )}

      <ContasPagarListSubModals
        showCreateModal={showCreateModal}
        onCloseCreateModal={handleCloseCreateModal}
        showEditModal={showEditModal}
        selectedContaPagarId={selectedContaPagarId}
        onCloseEditModal={handleCloseEditModal}
        showPagamentoModal={showPagamentoModal}
        onClosePagamentoModal={handleClosePagamentoModal}
        onSuccess={() => refetch()}
        auditoria={list.auditoria}
        t={t}
      />
    </>
  );
};

export default ContasPagarListModal;
