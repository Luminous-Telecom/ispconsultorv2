import React, { useState, useCallback, useMemo } from 'react';
import { Titulo } from 'types';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useI18n } from 'contexts/I18nContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import ListModal from 'components/common/ListModal';
import { TableFilterCheckbox } from 'components/ui';
import { ContasReceberListModalProps, SelectedParcela, TituloItemUnion } from './contasReceberListTypes';
import { createGetStatusBadge } from './contasReceberListUtils';
import { useContasReceberListColumns } from './contasReceberListColumns';
import { useContasReceberListData } from './useContasReceberListData';
import { useContasReceberPrintActions } from './useContasReceberPrintActions';
import { useContasReceberBulkActions } from './useContasReceberBulkActions';
import { ContasReceberListFilters } from './ContasReceberListFilters';
import { ContasReceberListResumo } from './ContasReceberListResumo';
import { ContasReceberListSubModals } from './ContasReceberListSubModals';

const ContasReceberListModal: React.FC<ContasReceberListModalProps> = ({
  show,
  onClose,
  onSelectTitulo,
  skipWrapper = false,
  initialFilters,
  variant = 'admin',
}) => {
  const isSaas = variant === 'saas';
  const { t } = useI18n();
  const isMobile = useIsMobile();

  const list = useEntityListModal<TituloItemUnion>({
    onClose,
    onSelect: onSelectTitulo ? (item) => onSelectTitulo(item as Titulo) : undefined,
  });

  const {
    selectedItems,
    setSelectedItems,
    showCancelados,
    dataVencimentoInicio,
    dataVencimentoFim,
    handleShowCanceladosChange,
    handleDataVencimentoInicioChange,
    handleDataVencimentoFimChange,
    titulos,
    filteredData,
    pagination,
    isLoadingData,
    refetchData,
    handleRefreshData,
  } = useContasReceberListData({ show, isSaas, initialFilters, list });

  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [selectedParcela, setSelectedParcela] = useState<SelectedParcela | null>(null);
  const [showGerarNFeModal, setShowGerarNFeModal] = useState(false);
  const [selectedTituloForNFe, setSelectedTituloForNFe] = useState<Titulo | null>(null);

  const {
    pdfUrl,
    isGeneratingPdf,
    showImprimirModal,
    setShowImprimirModal,
    clearPdfUrl,
    getItensComNFSe,
    handleImprimirSelecionados,
    handleImprimirRecibos,
    handleImprimirTodosEmAberto,
    handleImprimirSelecionadosSaas,
    handleImprimirTodosEmAbertoSaas,
    handleImprimirNFSe,
  } = useContasReceberPrintActions({ selectedItems, titulos });

  const { bulkActions } = useContasReceberBulkActions({
    isSaas,
    selectedItems,
    setSelectedItems,
    titulos,
    handleRefreshData,
    setSelectedTituloId,
    setShowTituloEditModal,
    setSelectedParcela,
    setShowReceberModal,
    setSelectedTituloForNFe,
    setShowGerarNFeModal,
    handleImprimirSelecionados,
    handleImprimirRecibos,
    handleImprimirTodosEmAberto,
    handleImprimirSelecionadosSaas,
    handleImprimirTodosEmAbertoSaas,
    handleImprimirNFSe,
    getItensComNFSe,
  });

  const getStatusBadge = useMemo(() => createGetStatusBadge(t), [t]);
  const columns = useContasReceberListColumns(t, getStatusBadge);

  const handleAudit = useCallback(
    (item: TituloItemUnion) => {
      list.auditoria.handleAudit(isSaas ? 'SaasTitulo' : 'Titulo', item.id);
    },
    [list.auditoria, isSaas]
  );

  const searchFields = useMemo(
    () =>
      isSaas
        ? [
            { key: 'numero_titulo', label: t('table.titleNumber') },
            { key: 'id', label: t('table.id') },
          ]
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
    [isSaas, t]
  );

  const handleLimitChange = useCallback(
    (size: number) => {
      if (size !== list.tableFilters.limit) {
        list.tableFilters.setLimit(size, { resetPage: false });
      }
    },
    [list.tableFilters]
  );

  const handleModalClose = useCallback(() => {
    list.clearSelection();
    setSelectedItems([]);
    onClose();
  }, [list, onClose, setSelectedItems]);

  const handleRowSelect = useCallback(
    (item: TituloItemUnion) => {
      onSelectTitulo?.(item as Titulo);
      onClose();
    },
    [onSelectTitulo, onClose]
  );

  const customControls = useMemo(
    () => (
      <TableFilterCheckbox
        id="contas-receber-show-canceled"
        name="contas-receber-show-canceled"
        label={t('filter.showCanceled')}
        checked={showCancelados}
        onChange={(checked) =>
          handleShowCanceladosChange({ target: { checked } } as React.ChangeEvent<HTMLInputElement>)
        }
      />
    ),
    [showCancelados, handleShowCanceladosChange, t]
  );

  const customControlsAfterActions = useMemo(
    () => (
      <ContasReceberListFilters
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

  const handleCloseTituloEditModal = useCallback(() => {
    setShowTituloEditModal(false);
    setSelectedTituloId(null);
  }, []);

  const handleCloseReceberModal = useCallback(() => {
    setShowReceberModal(false);
    setSelectedParcela(null);
  }, []);

  const handleCloseImprimirModal = useCallback(() => {
    setShowImprimirModal(false);
    clearPdfUrl();
  }, [setShowImprimirModal, clearPdfUrl]);

  const handleCloseGerarNFeModal = useCallback(() => {
    setShowGerarNFeModal(false);
    setSelectedTituloForNFe(null);
  }, []);

  return (
    <>
      <ListModal<TituloItemUnion>
        show={show}
        onClose={handleModalClose}
        skipWrapper={skipWrapper}
        modalSize="xl"
        config={{
          title: t('menu.accountsReceivable'),
          columns,
          searchPlaceholder: '',
          searchFields,
          emptyMessage: t('empty.noTitles'),
          multiSelect: !onSelectTitulo,
        }}
        data={titulos}
        loading={isLoadingData}
        search={list.tableFilters.search}
        onSearchChange={list.handleSearchChange}
        onSearchFieldChange={list.tableFilters.setSearchField}
        sortColumn={list.tableFilters.sortColumn}
        sortDirection={list.tableFilters.sortDirection}
        onSortChange={list.tableFilters.setSort}
        pagination={list.buildPagination(pagination ?? undefined)}
        onPageChange={list.tableFilters.setPage}
        onLimitChange={handleLimitChange}
        onRefresh={refetchData}
        bulkActions={bulkActions}
        onSelectionChange={onSelectTitulo ? list.handleSelectionChange : setSelectedItems}
        onRowDoubleClick={onSelectTitulo ? handleRowSelect : undefined}
        onAudit={handleAudit}
        auditEntity={isSaas ? 'SaasTitulo' : 'Titulo'}
        customControls={customControls}
        customControlsAfterActions={customControlsAfterActions}
        tableId="financeiro-modal"
        modalId="financeiro-modal"
      />

      <ContasReceberListResumo
        filteredData={filteredData}
        showCancelados={showCancelados}
        isMobile={isMobile}
        t={t}
      />

      <ContasReceberListSubModals
        isSaas={isSaas}
        showTituloEditModal={showTituloEditModal}
        selectedTituloId={selectedTituloId}
        onCloseTituloEditModal={handleCloseTituloEditModal}
        showReceberModal={showReceberModal}
        selectedParcela={selectedParcela}
        onCloseReceberModal={handleCloseReceberModal}
        showImprimirModal={showImprimirModal}
        onCloseImprimirModal={handleCloseImprimirModal}
        pdfUrl={pdfUrl}
        isGeneratingPdf={isGeneratingPdf}
        showGerarNFeModal={showGerarNFeModal}
        selectedTituloForNFe={selectedTituloForNFe}
        onCloseGerarNFeModal={handleCloseGerarNFeModal}
        onRefreshData={handleRefreshData}
        auditoria={list.auditoria}
        t={t}
      />
    </>
  );
};

export default ContasReceberListModal;
