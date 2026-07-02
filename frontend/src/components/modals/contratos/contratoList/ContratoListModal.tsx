import React, { useState, useCallback, useMemo } from 'react';
import { Contrato } from 'hooks/useContratos';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useI18n } from 'contexts/I18nContext';
import ListModal from 'components/common/ListModal';
import { ContratoListModalProps, ContratoRow } from './contratoListTypes';
import { buildDisplayTitle } from './contratoListUtils';
import { useContratoListColumns, CONTRATO_LIST_SEARCH_FIELDS, CONTRATO_LIST_DEFAULT_SEARCH_FIELD } from './contratoListColumns';
import { useContratoListData } from './useContratoListData';
import { useContratoPrintActions } from './useContratoPrintActions';
import { useContratoListBulkActions } from './useContratoListBulkActions';
import { ContratoListResumo } from './ContratoListResumo';
import { ContratoListSubModals } from './ContratoListSubModals';

const ContratoListModal: React.FC<ContratoListModalProps> = ({
  show,
  onClose,
  onSelectContrato,
  title = 'Contratos',
  skipWrapper = false,
  initialFilters,
}) => {
  const { t } = useI18n();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);

  const list = useEntityListModal<Contrato>({
    onClose,
    onSelect: onSelectContrato,
    initialSearchField: CONTRATO_LIST_DEFAULT_SEARCH_FIELD,
  });

  const {
    dataWithVirtualFields,
    valorTotalMensal,
    valorTotalDescontos,
    pagination,
    isLoading,
    refetch,
    handleDelete,
  } = useContratoListData({ show, initialFilters, list });

  const {
    impressaoHook,
    showImprimirModal,
    pdfUrlLocal,
    isGeneratingPdfLocal,
    handleImprimirContrato,
    handleImprimirTermoAdesao,
    handleImprimirContratoPermanencia,
    handleCloseImprimirModal,
  } = useContratoPrintActions();

  const handleCreate = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleEdit = useCallback((contratoId: number) => {
    setSelectedContratoId(contratoId);
    setShowEditModal(true);
  }, []);

  const { bulkActions } = useContratoListBulkActions({
    onSelectContrato,
    onCreate: handleCreate,
    onEdit: handleEdit,
    onDelete: handleDelete,
    handleImprimirContrato,
    handleImprimirTermoAdesao,
    handleImprimirContratoPermanencia,
  });

  const displayTitle = useMemo(
    () => buildDisplayTitle(title, initialFilters, t),
    [title, initialFilters, t]
  );

  const columns = useContratoListColumns();

  const handleAudit = useCallback(
    (contrato: Contrato) => {
      list.auditoria.handleAudit('Contrato', contrato.id);
    },
    [list.auditoria]
  );

  const handleRowSelect = useCallback(
    (item: Contrato) => {
      onSelectContrato?.(item);
      onClose();
    },
    [onSelectContrato, onClose]
  );

  const handleCloseContratoModal = useCallback(() => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedContratoId(null);
  }, []);

  return (
    <>
      <ListModal<ContratoRow>
        show={show}
        onClose={list.handleModalClose}
        skipWrapper={skipWrapper}
        config={{
          title: displayTitle,
          columns,
          searchPlaceholder: '',
          searchField: CONTRATO_LIST_DEFAULT_SEARCH_FIELD,
          searchFields: CONTRATO_LIST_SEARCH_FIELDS,
          emptyMessage: 'Nenhum contrato encontrado',
        }}
        data={dataWithVirtualFields}
        loading={isLoading}
        search={list.tableFilters.search}
        onSearchChange={list.handleSearchChange}
        onSearchFieldChange={list.handleSearchFieldChange}
        sortColumn={list.tableFilters.sortColumn}
        sortDirection={list.tableFilters.sortDirection}
        onSortChange={list.tableFilters.setSort}
        pagination={pagination}
        onPageChange={list.tableFilters.setPage}
        onLimitChange={list.tableFilters.setLimit}
        onRefresh={refetch}
        bulkActions={bulkActions}
        onSelectionChange={list.handleSelectionChange}
        onRowDoubleClick={onSelectContrato ? handleRowSelect : undefined}
        onAudit={handleAudit}
        auditEntity="Contrato"
        tableId="contrato-list-modal"
        modalId="contrato-list-modal"
      />

      <ContratoListResumo
        show={show}
        hasData={dataWithVirtualFields.length > 0}
        valorTotalMensal={valorTotalMensal}
        valorTotalDescontos={valorTotalDescontos}
        t={t}
      />

      <ContratoListSubModals
        showCreateModal={showCreateModal}
        showEditModal={showEditModal}
        selectedContratoId={selectedContratoId}
        onCloseContratoModal={handleCloseContratoModal}
        onContratoSuccess={refetch}
        impressaoHook={impressaoHook}
        showImprimirModal={showImprimirModal}
        onCloseImprimirModal={handleCloseImprimirModal}
        pdfUrlLocal={pdfUrlLocal}
        isGeneratingPdfLocal={isGeneratingPdfLocal}
        auditoria={list.auditoria}
      />
    </>
  );
};

export default ContratoListModal;
