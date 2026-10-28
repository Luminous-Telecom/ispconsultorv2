import React, { useCallback, useMemo } from 'react';
import { useTipoCobrancaContratos, useDeleteTipoCobrancaContrato } from 'hooks/useTipoCobrancaContratos';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { TipoCobrancaContrato } from 'services/tipoCobrancaContratoService';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import { formatTipoCobrancaPeriodicity } from 'constants/tipoCobrancaPeriodicity';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import TipoCobrancaContratoModal from './TipoCobrancaContratoModal';
import ImprimirModal from 'components/common/ImprimirModal';

interface TipoCobrancaContratoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectTipo?: (tipo: TipoCobrancaContrato) => void;
  title?: string;
  skipWrapper?: boolean;
}

const TipoCobrancaContratoListModal: React.FC<TipoCobrancaContratoListModalProps> = ({
  show,
  onClose,
  onSelectTipo,
  title,
  skipWrapper = false,
}) => {
  const { t } = useI18n();
  const defaultTitle = title || t('modal.billingType');

  const list = useEntityListModal<TipoCobrancaContrato>({
    onClose,
    onSelect: onSelectTipo,
    initialSearchField: 'nome',
  });

  const { data: tiposData, isLoading, refetch } = useTipoCobrancaContratos({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
  });

  const deleteMutation = useDeleteTipoCobrancaContrato();

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteMutation.mutateAsync(id);
        refetch();
      } catch {
        // erro tratado pelo hook
      }
    },
    [deleteMutation, refetch]
  );

  const handleAudit = useCallback(
    (item: TipoCobrancaContrato) => {
      list.auditoria.handleAudit('TipoCobrancaContrato', item.id);
    },
    [list.auditoria]
  );

  const formatPeriodicity = useCallback(
    (periodicidade: string) => formatTipoCobrancaPeriodicity(periodicidade, t),
    [t]
  );

  const columns = useMemo(
    (): ListModalConfig<TipoCobrancaContrato>['columns'] => [
      {
        key: 'ativo',
        label: t('table.status'),
        sortable: true,
        render: (item) => (
          <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
            {item.ativo ? t('status.active') : t('status.inactive')}
          </span>
        ),
      },
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        render: (item) => <span>{item.id}</span>,
      },
      { key: 'nome', label: t('form.name'), sortable: true, render: (item) => item.nome },
      {
        key: 'quantidade_titulos',
        label: t('form.quantityTitles'),
        sortable: true,
        render: (item) => item.quantidade_titulos,
      },
      {
        key: 'periodicidade',
        label: t('table.periodicity'),
        sortable: true,
        render: (item) => <span>{formatPeriodicity(item.periodicidade)}</span>,
      },
      {
        key: 'created_at',
        label: t('table.createdAt'),
        sortable: true,
        render: (item) => (item.created_at ? formatDateTime(item.created_at) : '-'),
      },
    ],
    [t, formatPeriodicity]
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: t('table.id') },
      { key: 'nome', label: t('form.name') },
      { key: 'quantidade_titulos', label: t('form.quantityTitles') },
    ],
    [t]
  );

  const bulkActions = useMemo(() => {
    const crud = list.buildCrudBulkActions({
      onNew: list.openCreateForm,
      onEdit: list.openEditForm,
      onDelete: handleDelete,
    });
    if (onSelectTipo) return list.appendSelectInsert(crud);
    return crud;
  }, [onSelectTipo, list, handleDelete]);

  const pagination = useMemo(
    () => list.buildPagination(tiposData?.pagination),
    [list, tiposData?.pagination]
  );

  const modalData = useMemo(() => {
    const d = tiposData?.data;
    return Array.isArray(d) ? d : [];
  }, [tiposData?.data]);

  const handleRowSelect = useCallback(
    (item: TipoCobrancaContrato) => {
      onSelectTipo?.(item);
      onClose();
    },
    [onSelectTipo, onClose]
  );

  const listModal = (
    <ListModal<TipoCobrancaContrato>
      show={show}
      onClose={onSelectTipo ? onClose : list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchField: 'nome',
        searchFields,
        emptyMessage: 'Nenhum tipo de cobrança encontrado',
      }}
      data={modalData}
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
      onRowDoubleClick={onSelectTipo ? handleRowSelect : undefined}
      onAudit={handleAudit}
      auditEntity="TipoCobrancaContrato"
      tableId="tipos-cobranca-contrato-modal"
      modalId="tipos-cobranca-contrato-list-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <TipoCobrancaContratoModal
        show={list.showFormModal}
        onClose={list.closeFormModal}
        tipoId={list.selectedEntityId}
        onSuccess={() => {
          refetch();
          list.closeFormModal();
        }}
      />
      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-tipo-cobranca-modal"
      />
    </>
  );

  if (skipWrapper) {
    return (
      <>
        {listModal}
        {auxiliaryModals}
      </>
    );
  }

  return (
    <>
      {listModal}
      {auxiliaryModals}
    </>
  );
};

export default TipoCobrancaContratoListModal;
