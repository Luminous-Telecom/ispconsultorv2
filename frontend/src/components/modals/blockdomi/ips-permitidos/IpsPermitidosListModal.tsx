import React, { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useIpsPermitidos, useDeleteIpPermitido } from 'hooks/useIpsPermitidos';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import IpsPermitidoModal from './IpsPermitidoModal';
import ImprimirModal from 'components/common/ImprimirModal';
import type { IpPermitido } from 'services/ipsPermitidosService';

interface IpsPermitidosListModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  skipWrapper?: boolean;
}

const IpsPermitidosListModal: React.FC<IpsPermitidosListModalProps> = ({
  show,
  onClose,
  title,
  skipWrapper = false,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const defaultTitle = title || t('blockdomi.ipsPermitidos');

  const list = useEntityListModal<IpPermitido>({ onClose });

  const { data: ipsData, isLoading, refetch } = useIpsPermitidos({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
  });

  const deleteMutation = useDeleteIpPermitido();

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteMutation.mutateAsync(id);
        refetch();
      } catch {
        // Erro tratado pelo hook
      }
    },
    [deleteMutation, refetch]
  );

  const handleAudit = useCallback(
    (item: IpPermitido) => {
      list.auditoria.handleAudit('IpPermitido', item.id);
    },
    [list.auditoria]
  );

  const columns = useMemo(
    (): ListModalConfig<IpPermitido>['columns'] => [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        render: (item) => item.id,
      },
      {
        key: 'cliente_nome',
        label: t('blockdomi.cliente'),
        sortable: true,
        width: '220px',
        render: (item) => item.cliente_nome || '-',
      },
      {
        key: 'faixa_ips',
        label: t('blockdomi.faixaIps'),
        sortable: true,
        width: '300px',
        render: (item) => item.faixa_ips || '-',
      },
      {
        key: 'created_at',
        label: t('table.createdAt'),
        sortable: true,
        width: '140px',
        render: (item) => (item.created_at ? formatDateTime(item.created_at) : '-'),
      },
    ],
    [t]
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: t('table.id') },
      { key: 'cliente_nome', label: t('blockdomi.cliente') },
      { key: 'faixa_ips', label: t('blockdomi.faixaIps') },
    ],
    [t]
  );

  const bulkActions = useMemo(
    () =>
      list.buildCrudBulkActions({
        onNew: list.openCreateForm,
        onEdit: list.openEditForm,
        onDelete: handleDelete,
      }),
    [list, handleDelete]
  );

  const pagination = useMemo(
    () => list.buildPagination(ipsData?.pagination),
    [list, ipsData?.pagination]
  );

  const modalData = useMemo(() => ipsData?.data || [], [ipsData?.data]);

  const handleRowDoubleClick = useCallback(
    (item: IpPermitido) => {
      list.openEditForm(item);
    },
    [list]
  );

  const handleFormSuccess = useCallback(
    (createdOrUpdated?: IpPermitido) => {
      if (createdOrUpdated?.id != null && list.selectedEntityId === null) {
        list.setSelectedEntityId(createdOrUpdated.id);
      }
      refetch();
      queryClient.invalidateQueries({ queryKey: ['ips-permitidos'] });
    },
    [refetch, queryClient, list]
  );

  const listModal = (
    <ListModal<IpPermitido>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchFields,
        emptyMessage: t('blockdomi.noIpsPermitidos'),
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
      onRowDoubleClick={handleRowDoubleClick}
      onAudit={handleAudit}
      auditEntity="IpPermitido"
      tableId="ips-permitidos-list"
      modalId="ips-permitidos-list-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <IpsPermitidoModal
        show={list.showFormModal}
        onClose={list.closeFormModal}
        ipPermitidoId={list.selectedEntityId}
        onSuccess={handleFormSuccess}
      />
      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-ips-permitidos-modal"
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

export default IpsPermitidosListModal;
