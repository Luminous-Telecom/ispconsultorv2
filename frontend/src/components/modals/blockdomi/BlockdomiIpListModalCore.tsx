import React, { useState, useCallback, useMemo } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeleteIPv4 } from 'hooks/useIPv4';
import { useDeleteIPv6 } from 'hooks/useIPv6';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useI18n } from 'contexts/I18nContext';
import ListModal from 'components/common/ListModal';
import ImprimirModal from 'components/common/ImprimirModal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import {
  BLOCKDOMI_IP_LIST_BY_VERSION,
  type BlockdomiIpRow,
  type BlockdomiIpVersion,
} from './blockdomiIpListVariants';
import { buildBlockdomiOficioBulkActions } from './buildBlockdomiOficioBulkActions';

const EMPTY_IP_LIST: BlockdomiIpRow[] = [];

export interface BlockdomiIpListModalCoreProps {
  version: BlockdomiIpVersion;
  show: boolean;
  onClose: () => void;
  onSelect?: (item: BlockdomiIpRow) => void;
  title?: string;
  skipWrapper?: boolean;
}

const BlockdomiIpListModalCore: React.FC<BlockdomiIpListModalCoreProps> = ({
  version,
  show,
  onClose,
  onSelect,
  title,
  skipWrapper = false,
}) => {
  const config = BLOCKDOMI_IP_LIST_BY_VERSION[version];
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const list = useEntityListModal<BlockdomiIpRow>({
    onClose,
    onSelect,
  });

  const {
    page,
    limit,
    debouncedSearch,
    searchField,
    sortColumn,
    sortDirection,
    search,
    setPage,
    setLimit,
    setSort,
  } = list.tableFilters;

  const {
    buildSelectBulkActions,
    bulkBtn,
    isNothingSelected,
    resolveItem,
    handleSelectionChange,
    handleModalClose,
    handleSearchChange,
    clearSelection,
    auditoria,
    buildPagination,
  } = list;

  const deleteV4 = useDeleteIPv4();
  const deleteV6 = useDeleteIPv6();
  const deleteMutation = version === 4 ? deleteV4 : deleteV6;

  const defaultTitle = useMemo(
    () => title || (onSelect ? t(config.selectTitleKey) : config.defaultTitle),
    [title, onSelect, config.selectTitleKey, config.defaultTitle, language] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const resolveItems = useCallback(
    (selectedItems: BlockdomiIpRow[]) => {
      if (selectedItems.length > 0) return selectedItems;
      return list.selectedItem ? [list.selectedItem] : [];
    },
    [list.selectedItem]
  );

  // language em vez de t: useI18n recria t a cada render e invalidaria colunas sem necessidade
  const columns = useMemo(() => config.getColumns(t), [config, version, language]); // eslint-disable-line react-hooks/exhaustive-deps
  const searchFields = useMemo(() => config.getSearchFields(t), [config, version, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: [
      config.queryKey,
      page,
      limit,
      debouncedSearch,
      searchField,
      sortColumn,
      sortDirection,
    ],
    queryFn: () =>
      config.list({
        search: debouncedSearch || undefined,
        searchField: searchField || undefined,
        page,
        limit,
        sortColumn,
        sortDirection,
      }),
    enabled: show,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const pagination = useMemo(() => {
    const normalized = buildPagination(listData?.pagination);
    // Alinha per_page ao limit do hook: evita ping-pong Table autoRows ↔ useTable ↔ setLimit
    return {
      ...normalized,
      current_page: page,
      per_page: limit,
    };
  }, [buildPagination, listData?.pagination, page, limit]);

  const handleLimitChange = useCallback(
    (size: number) => {
      if (size !== limit) {
        setLimit(size);
      }
    },
    [limit, setLimit]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteMutation.mutateAsync(id);
        clearSelection();
        refetch();
      } catch {
        // Erro tratado pelo useNotificationContext
      }
    },
    [deleteMutation, clearSelection, refetch]
  );

  const handleBulkDelete = useCallback(
    async (ids: number[]) => {
      try {
        const { deleted, versao } = await config.bulkDelete(ids);
        clearSelection();
        refetch();
        queryClient.invalidateQueries({ queryKey: [config.queryKey] });
        success(
          `Excluído(s) ${deleted} ${config.entityLabel}. Versão da operação: ${versao}.`
        );
      } catch (err: unknown) {
        showApiError(err, config.deleteErrorKey);
      }
    },
    [config, clearSelection, refetch, queryClient, success, showApiError]
  );

  const handleAudit = useCallback(
    (item: BlockdomiIpRow) => {
      auditoria.handleAudit(config.auditEntity, item.id);
    },
    [auditoria, config.auditEntity]
  );

  const bulkActions = useMemo(() => {
    if (onSelect) {
      return buildSelectBulkActions();
    }
    return [
      {
        label: bulkBtn.novo.label,
        variant: bulkBtn.novo.variant,
        action: () => setShowCreateModal(true),
      },
      {
        label: bulkBtn.editar.label,
        variant: bulkBtn.editar.variant,
        disabled: (selectedItems: BlockdomiIpRow[]) => isNothingSelected(selectedItems),
        action: (selectedItems: BlockdomiIpRow[]) => {
          const item = resolveItem(selectedItems);
          if (item) {
            setSelectedItemId(item.id);
            setShowEditModal(true);
          }
        },
      },
      {
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (selectedItems: BlockdomiIpRow[]) => isNothingSelected(selectedItems),
        action: async (selectedItems: BlockdomiIpRow[]) => {
          const items = resolveItems(selectedItems);
          if (items.length === 0) return;

          const msg =
            items.length === 1
              ? t('messages.confirmDelete')
              : `Tem certeza que deseja excluir ${items.length} ${config.entityLabel}?`;
          if (!window.confirm(msg)) return;

          if (items.length === 1) {
            await handleDelete(items[0].id);
          } else {
            await handleBulkDelete(items.map((i) => i.id));
          }
        },
      ...buildBlockdomiOficioBulkActions({ t, resolveItems }),
      },
    ];
  }, [
    onSelect,
    buildSelectBulkActions,
    bulkBtn,
    isNothingSelected,
    resolveItem,
    resolveItems,
    handleDelete,
    handleBulkDelete,
    t,
    config.entityLabel,
  ]);

  const modalData = listData?.data ?? EMPTY_IP_LIST;

  const handleSelectAllPages = useCallback(async (): Promise<BlockdomiIpRow[]> => {
    const res = await config.list({
      search: debouncedSearch || undefined,
      searchField: searchField || undefined,
      page: 1,
      limit: 99999,
      sortColumn,
      sortDirection,
    });
    return res?.data ?? [];
  }, [config, debouncedSearch, searchField, sortColumn, sortDirection]);

  const handleRowSelect = useCallback(
    (item: BlockdomiIpRow) => {
      onSelect?.(item);
      onClose();
    },
    [onSelect, onClose]
  );

  const FormModal = config.FormModal;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [config.queryKey] });
    refetch();
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedItemId(null);
  }, [queryClient, config.queryKey, refetch]);

  const listModalConfig = useMemo(
    () => ({
      title: defaultTitle,
      columns,
      searchPlaceholder: t('layout.searchPlaceholder'),
      searchFields,
      emptyMessage: config.emptyMessage,
      multiSelect: true as const,
    }),
    [defaultTitle, columns, searchFields, config.emptyMessage, language] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const listModal = (
    <ListModal<BlockdomiIpRow>
      show={show}
      onClose={handleModalClose}
      skipWrapper={skipWrapper}
      config={listModalConfig}
      data={modalData}
      loading={isLoading}
      search={search}
      onSearchChange={handleSearchChange}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSortChange={setSort}
      pagination={pagination}
      onPageChange={setPage}
      onLimitChange={handleLimitChange}
      onRefresh={refetch}
      bulkActions={bulkActions}
      onSelectionChange={handleSelectionChange}
      onRowDoubleClick={onSelect ? handleRowSelect : undefined}
      onAudit={handleAudit}
      auditEntity={config.auditEntity}
      onSelectAllPages={handleSelectAllPages}
      tableId={config.tableId}
      modalId={config.modalId}
    />
  );

  const auxiliaryModals = (
    <>
      <FormModal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedItemId(null);
        }}
        itemId={showEditModal ? selectedItemId : null}
        onSuccess={invalidate}
      />

      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId={config.auditModalId}
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

export default BlockdomiIpListModalCore;
