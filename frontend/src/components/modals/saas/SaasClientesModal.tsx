import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useI18n } from 'contexts/I18nContext';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { formatDateTime } from 'utils/formatters';
import ListModal from 'components/common/ListModal';
import ImprimirModal from 'components/common/ImprimirModal';
import { saasEmpresasService, type SaasEmpresa, type SaasConfigListResponse } from 'services/saas/saasEmpresasService';
import SaasEmpresaFormModal from './SaasEmpresaFormModal';
import {
  getSaasTenantListColumns,
  getSaasTenantListSearchFields,
  type SaasEmpresaRow,
} from './saasTenantListTableConfig';

interface Props {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  empresaId?: number;
  initialFilters?: { created_at_inicio?: string; created_at_fim?: string; plano_id?: number };
}

const SaasClientesModal: React.FC<Props> = ({ show, onClose, skipWrapper = false, empresaId, initialFilters }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { showApiError } = useApiError();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const list = useEntityListModal<SaasEmpresa>({ onClose });

  useEffect(() => {
    if (show && empresaId) {
      setSelectedId(empresaId);
      setShowEdit(true);
    }
  }, [show, empresaId]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      'saas-empresas',
      list.tableFilters.page,
      list.tableFilters.limit,
      list.tableFilters.debouncedSearch,
      list.tableFilters.searchField,
      list.tableFilters.sortColumn,
      list.tableFilters.sortDirection,
      initialFilters?.created_at_inicio,
      initialFilters?.created_at_fim,
      initialFilters?.plano_id,
    ],
    queryFn: () =>
      saasEmpresasService.list({
        page: list.tableFilters.page,
        limit: list.tableFilters.limit,
        search: list.tableFilters.debouncedSearch || undefined,
        searchField: list.tableFilters.searchField || undefined,
        sortColumn: list.tableFilters.sortColumn,
        sortDirection: list.tableFilters.sortDirection,
        ...(initialFilters?.created_at_inicio && { created_at_inicio: initialFilters.created_at_inicio }),
        ...(initialFilters?.created_at_fim && { created_at_fim: initialFilters.created_at_fim }),
        ...(initialFilters?.plano_id != null && { plano_id: initialFilters.plano_id }),
      }),
    enabled: show,
    staleTime: 0,
  });

  const listData = data?.data as SaasConfigListResponse<SaasEmpresa> | undefined;
  const items: SaasEmpresaRow[] = listData?.data || [];

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await saasEmpresasService.delete(id);
        queryClient.invalidateQueries({ queryKey: ['saas-empresas'] });
        refetch();
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.SAAS_EMPRESA_DELETE_ERROR);
      }
    },
    [queryClient, refetch, showApiError]
  );

  const columns = useMemo(() => getSaasTenantListColumns(t, formatDateTime), [t]);
  const searchFields = useMemo(() => getSaasTenantListSearchFields(t), [t]);

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

  const listModal = (
    <ListModal<SaasEmpresa>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: t('modal.clientsTenants'),
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchFields,
        emptyMessage: t('messages.noData'),
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
      onAudit={(i) => list.auditoria.handleAudit('DadosEmpresa', i.id)}
      auditEntity="DadosEmpresa"
      tableId="saas-empresas-list"
      modalId="saas-clientes-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <SaasEmpresaFormModal
        show={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['saas-empresas'] });
          refetch();
        }}
      />
      <SaasEmpresaFormModal
        show={showEdit}
        onClose={() => {
          setShowEdit(false);
          setSelectedId(null);
        }}
        itemId={showEdit ? selectedId : null}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['saas-empresas'] });
          refetch();
        }}
      />
      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('modal.auditLogs')}
        modalId="audit-saas-empresa"
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

export default SaasClientesModal;
