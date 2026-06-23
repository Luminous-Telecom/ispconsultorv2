import React, { useState, useCallback, useMemo } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeleteDominio } from 'hooks/useDominios';
import { DominioService } from 'services/dominioService';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { Dominio } from 'types';
import { useI18n } from 'contexts/I18nContext';
import ListModal from 'components/common/ListModal';
import DominioModal from './dominios/DominioModal';
import DominioBulkEditModal from './dominios/DominioBulkEditModal';
import ImprimirModal from 'components/common/ImprimirModal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import {
  getBlockdomiDominioColumns,
  getBlockdomiDominioSearchFields,
} from './blockdomiDominioListColumns';
import { buildBlockdomiOficioBulkActions } from './buildBlockdomiOficioBulkActions';

const EMPTY_DOMINIO_LIST: Dominio[] = [];

export interface BlockdomiDominioListModalCoreProps {
  show: boolean;
  onClose: () => void;
  onSelect?: (item: Dominio) => void;
  title?: string;
  skipWrapper?: boolean;
}

const BlockdomiDominioListModalCore: React.FC<BlockdomiDominioListModalCoreProps> = ({
  show,
  onClose,
  onSelect,
  title,
  skipWrapper = false,
}) => {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [dominiosToBulkEdit, setDominiosToBulkEdit] = useState<Dominio[]>([]);
  const [isSyncingSei, setIsSyncingSei] = useState(false);

  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const list = useEntityListModal<Dominio>({ onClose, onSelect });

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
    buildPagination,
    buildSelectBulkActions,
    bulkBtn,
    isNothingSelected,
    handleSelectionChange,
    handleModalClose,
    handleSearchChange,
    clearSelection,
    auditoria,
  } = list;

  const deleteMutation = useDeleteDominio();

  const defaultTitle = useMemo(
    () => title || (onSelect ? t('blockdomi.selectDomain') : t('blockdomi.domains')),
    [title, onSelect, language] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const resolveItems = useCallback(
    (selectedItems: Dominio[]) => {
      if (selectedItems.length > 0) return selectedItems;
      return list.selectedItem ? [list.selectedItem] : [];
    },
    [list.selectedItem]
  );

  const columns = useMemo(() => getBlockdomiDominioColumns(t), [language]); // eslint-disable-line react-hooks/exhaustive-deps
  const searchFields = useMemo(() => getBlockdomiDominioSearchFields(t), [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ['dominios', page, limit, debouncedSearch, searchField, sortColumn, sortDirection],
    queryFn: () =>
      DominioService.list({
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
    return { ...normalized, current_page: page, per_page: limit };
  }, [buildPagination, listData?.pagination, page, limit]);

  const handleLimitChange = useCallback(
    (size: number) => {
      if (size !== limit) setLimit(size);
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
        // Erro tratado pelo hook
      }
    },
    [deleteMutation, clearSelection, refetch]
  );

  const handleBulkDelete = useCallback(
    async (ids: number[]) => {
      try {
        const { deleted, versao } = await DominioService.bulkDelete(ids);
        clearSelection();
        refetch();
        queryClient.invalidateQueries({ queryKey: ['dominios'] });
        success(`Excluído(s) ${deleted} domínio(s). Versão da operação: ${versao}.`);
      } catch (err: unknown) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_DOMAIN_DELETE_ERROR);
      }
    },
    [clearSelection, refetch, queryClient, success, showApiError]
  );

  const handleSincronizarSeiAnatel = useCallback(async () => {
    if (!window.confirm(t('blockdomi.syncSeiAnatelConfirm'))) return;
    setIsSyncingSei(true);
    try {
      const data = await DominioService.sincronizarSeiAnatel();
      const comErro = data.resultados.filter((r) => r.erro).length;
      const base = t('blockdomi.syncSeiAnatelDone', {
        atualizados: String(data.dominiosAtualizados),
        pdfs: String(data.pdfsDistintos),
        candidatos: String(data.dominiosCandidatos),
      });
      success(
        comErro > 0
          ? `${base} ${t('blockdomi.syncSeiAnatelPartial', { n: String(comErro) })}`
          : base
      );
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dominios'] });
    } catch (e) {
      showApiError(e, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_SEI_SYNC_ERROR);
    } finally {
      setIsSyncingSei(false);
    }
  }, [t, success, showApiError, refetch, queryClient]);

  const handleAudit = useCallback(
    (item: Dominio) => {
      auditoria.handleAudit('Dominio', item.id);
    },
    [auditoria]
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
        disabled: (selectedItems: Dominio[]) => resolveItems(selectedItems).length === 0,
        action: (selectedItems: Dominio[]) => {
          const items = resolveItems(selectedItems);
          if (items.length === 0) return;
          if (items.length === 1) {
            setSelectedItemId(items[0].id);
            setShowEditModal(true);
          } else {
            setDominiosToBulkEdit(items);
            setShowBulkEditModal(true);
          }
        },
      },
      {
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (selectedItems: Dominio[]) => isNothingSelected(selectedItems),
        action: async (selectedItems: Dominio[]) => {
          const items = resolveItems(selectedItems);
          if (items.length === 0) return;
          const msg =
            items.length === 1
              ? t('messages.confirmDelete')
              : `Tem certeza que deseja excluir ${items.length} domínio(s)?`;
          if (!window.confirm(msg)) return;
          if (items.length === 1) {
            await handleDelete(items[0].id);
          } else {
            await handleBulkDelete(items.map((i) => i.id));
          }
        },
      },
      ...buildBlockdomiOficioBulkActions({ t, resolveItems }),
      {
        label: bulkBtn.sincronizar.label,
        variant: bulkBtn.sincronizar.variant,
        requiresSelection: false,
        disabled: () => isSyncingSei,
        action: () => {
          void handleSincronizarSeiAnatel();
        },
      },
    ];
  }, [
    onSelect,
    buildSelectBulkActions,
    bulkBtn,
    resolveItems,
    isNothingSelected,
    handleDelete,
    handleBulkDelete,
    handleSincronizarSeiAnatel,
    isSyncingSei,
    t,
  ]);

  const modalData = listData?.data ?? EMPTY_DOMINIO_LIST;

  const handleSelectAllPages = useCallback(async (): Promise<Dominio[]> => {
    const res = await DominioService.list({
      search: debouncedSearch || undefined,
      searchField: searchField || undefined,
      page: 1,
      limit: 99999,
      sortColumn,
      sortDirection,
    });
    return res?.data ?? [];
  }, [debouncedSearch, searchField, sortColumn, sortDirection]);

  const handleRowSelect = useCallback(
    (item: Dominio) => {
      onSelect?.(item);
      onClose();
    },
    [onSelect, onClose]
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dominios'] });
    refetch();
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowBulkEditModal(false);
    setSelectedItemId(null);
    setDominiosToBulkEdit([]);
  }, [queryClient, refetch]);

  const listModalConfig = useMemo(
    () => ({
      title: defaultTitle,
      columns,
      searchPlaceholder: t('layout.searchPlaceholder'),
      searchFields,
      emptyMessage: 'Nenhum domínio encontrado',
      multiSelect: true as const,
    }),
    [defaultTitle, columns, searchFields, language] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const listModal = (
    <ListModal<Dominio>
      show={show}
      onClose={handleModalClose}
      skipWrapper={skipWrapper}
      config={listModalConfig}
      data={modalData}
      loading={isLoading || isSyncingSei}
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
      auditEntity="Dominio"
      onSelectAllPages={handleSelectAllPages}
      tableId="dominios-list-modal"
      modalId="dominios-list-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <DominioModal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedItemId(null);
        }}
        dominioId={showEditModal ? selectedItemId : null}
        onSuccess={invalidate}
      />
      <DominioBulkEditModal
        show={showBulkEditModal}
        onClose={() => {
          setShowBulkEditModal(false);
          setDominiosToBulkEdit([]);
        }}
        dominios={dominiosToBulkEdit}
        onSuccess={invalidate}
      />
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-dominio-modal"
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

export default BlockdomiDominioListModalCore;
