import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useI18n } from 'contexts/I18nContext';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import ImprimirModal from 'components/common/ImprimirModal';
import { saasTipoCobrancaService, type SaasTipoCobranca, type SaasConfigListResponse } from 'services/saas/saasCrudService';
import SaasTipoCobrancaFormModal from './SaasTipoCobrancaFormModal';
import { formatTipoCobrancaPeriodicity } from 'constants/tipoCobrancaPeriodicity';

interface Props {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const SaasTipoCobrancaModal: React.FC<Props> = ({ show, onClose, skipWrapper = false }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { showApiError } = useApiError();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const list = useEntityListModal<SaasTipoCobranca>({ onClose });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saas-tipos-cobranca', list.tableFilters.page, list.tableFilters.limit, list.tableFilters.debouncedSearch, list.tableFilters.sortColumn, list.tableFilters.sortDirection],
    queryFn: () =>
      saasTipoCobrancaService.list({
        page: list.tableFilters.page,
        limit: list.tableFilters.limit,
        search: list.tableFilters.debouncedSearch || undefined,
        sortColumn: list.tableFilters.sortColumn,
        sortDirection: list.tableFilters.sortDirection,
      }),
    enabled: show,
    staleTime: 0,
  });

  const listData = data?.data as SaasConfigListResponse<SaasTipoCobranca> | undefined;
  const items = listData?.data || [];

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await saasTipoCobrancaService.delete(id);
        queryClient.invalidateQueries({ queryKey: ['saas-tipos-cobranca'] });
        refetch();
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.TIPO_COBRANCA_DELETE_ERROR);
      }
    },
    [queryClient, refetch, showApiError]
  );

  const columns = useMemo(
    (): ListModalConfig<SaasTipoCobranca>['columns'] => [
      { key: 'id', label: t('table.id'), sortable: true, width: '42px', render: (i) => <span>{i.id}</span> },
      { key: 'nome', label: t('form.name'), sortable: true, render: (i) => <span className="fw-semibold">{i.nome}</span> },
      { key: 'quantidade_titulos', label: 'Qtd. Títulos', sortable: true, width: '100px', render: (i) => <span>{i.quantidade_titulos}</span> },
      {
        key: 'periodicidade',
        label: t('table.periodicity'),
        sortable: true,
        width: '120px',
        render: (i) => (
          <span>{formatTipoCobrancaPeriodicity(i.periodicidade, t)}</span>
        ),
      },
      {
        key: 'ativo',
        label: t('table.status'),
        sortable: true,
        width: '80px',
        render: (i) => (
          <span className={`badge bg-${i.ativo ? 'success' : 'secondary'}`}>
            {i.ativo ? t('status.active') : t('status.inactive')}
          </span>
        ),
      },
    ],
    [t]
  );

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
    <ListModal<SaasTipoCobranca>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: t('modal.billingType'),
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
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
      onAudit={(i) => list.auditoria.handleAudit('SaasTipoCobranca', i.id)}
      auditEntity="SaasTipoCobranca"
      tableId="saas-tipos-cobranca-list"
      modalId="saas-tipos-cobranca-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <SaasTipoCobrancaFormModal
        show={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['saas-tipos-cobranca'] });
          refetch();
        }}
      />
      <SaasTipoCobrancaFormModal
        show={showEdit}
        onClose={() => {
          setShowEdit(false);
          setSelectedId(null);
        }}
        itemId={showEdit ? selectedId : null}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['saas-tipos-cobranca'] });
          refetch();
        }}
      />
      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('modal.auditLogs')}
        modalId="audit-saas-tipo-cobranca"
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

export default SaasTipoCobrancaModal;
