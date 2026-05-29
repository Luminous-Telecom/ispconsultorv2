import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import ListModal from 'components/common/ListModal';
import ImprimirModal from 'components/common/ImprimirModal';
import {
  SAAS_SERVIDOR_LIST_BY_CHANNEL,
  type SaasServidorChannel,
} from './saasServidorListVariants';
import type { SaasConfigListResponse } from 'services/saas/saasConfigService';
import type { ApiResponse } from 'types';
import type { ListModalColumn } from 'types/modal';

interface SaasServidorListModalCoreProps {
  channel: SaasServidorChannel;
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

type ServidorRow = { id: number; nome: string; status: string };

const SaasServidorListModalCore: React.FC<SaasServidorListModalCoreProps> = ({
  channel,
  show,
  onClose,
  skipWrapper = false,
}) => {
  const config = SAAS_SERVIDOR_LIST_BY_CHANNEL[channel];
  const queryClient = useQueryClient();
  const { showApiError } = useApiError();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const list = useEntityListModal<ServidorRow>({ onClose });
  const FormModal = config.FormModal;

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      config.queryKey,
      list.tableFilters.page,
      list.tableFilters.limit,
      list.tableFilters.debouncedSearch,
      list.tableFilters.searchField,
      list.tableFilters.sortColumn,
      list.tableFilters.sortDirection,
    ],
    queryFn: (): Promise<ApiResponse<SaasConfigListResponse<ServidorRow>>> =>
      config.list({
        page: list.tableFilters.page,
        limit: list.tableFilters.limit,
        search: list.tableFilters.debouncedSearch || undefined,
        searchField: list.tableFilters.searchField || undefined,
        sortColumn: list.tableFilters.sortColumn,
        sortDirection: list.tableFilters.sortDirection,
      }) as Promise<ApiResponse<SaasConfigListResponse<ServidorRow>>>,
    enabled: show,
    staleTime: 0,
  });

  const listData = data?.data;
  const items = useMemo(() => listData?.data || [], [listData?.data]);

  const handleDelete = useCallback(
    async (id: number) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      if (!window.confirm(`Remover o servidor "${item.nome}"?`)) return;
      try {
        await config.delete(id);
        queryClient.invalidateQueries({ queryKey: [config.queryKey] });
        list.clearSelection();
        refetch();
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.SAAS_SERVER_DELETE_ERROR);
      }
    },
    [items, config, queryClient, list, refetch, showApiError]
  );

  const columns = useMemo(
    () => config.getColumns() as ListModalColumn<ServidorRow>[],
    [config]
  );
  const searchFields = useMemo(() => [...config.searchFields], [config.searchFields]);

  const bulkActions = useMemo(
    () =>
      list.buildCrudBulkActions({
        onNew: () => setShowCreate(true),
        onEdit: (item) => {
          setSelectedId(item.id);
          setShowEdit(true);
        },
        onDelete: handleDelete,
      }),
    [list, handleDelete]
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [config.queryKey] });
    refetch();
  }, [queryClient, config.queryKey, refetch]);

  const listModal = (
    <ListModal<ServidorRow>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      wrapperTitle={config.wrapperTitle}
      config={{
        title: config.listTitle,
        columns,
        searchFields,
        emptyMessage: config.emptyMessage,
      }}
      data={items}
      loading={isLoading}
      search={list.tableFilters.search}
      onSearchChange={list.handleSearchChange}
      sortColumn={list.tableFilters.sortColumn}
      sortDirection={list.tableFilters.sortDirection}
      onSortChange={list.tableFilters.setSort}
      pagination={list.buildPagination(listData?.pagination)}
      onPageChange={list.tableFilters.setPage}
      onLimitChange={list.tableFilters.setLimit}
      onRefresh={refetch}
      bulkActions={bulkActions}
      onSelectionChange={list.handleSelectionChange}
      onRowDoubleClick={(item) => {
        setSelectedId(item.id);
        setShowEdit(true);
      }}
      onAudit={(i) => list.auditoria.handleAudit(config.auditEntity, i.id)}
      auditEntity={config.auditEntity}
      tableId={config.tableId}
      modalId={config.modalId}
      modalSize="xl"
    />
  );

  const auxiliaryModals = (
    <>
      <FormModal show={showCreate} onClose={() => setShowCreate(false)} onSuccess={invalidate} />
      <FormModal
        show={showEdit}
        onClose={() => {
          setShowEdit(false);
          setSelectedId(null);
        }}
        itemId={showEdit ? selectedId : null}
        onSuccess={invalidate}
      />
      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={`Auditoria — ${config.listTitle}`}
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

export default SaasServidorListModalCore;
