import React, { useCallback, useMemo } from 'react';
import {
  useDeleteIntegracaoIxcProvedor,
  useIntegracaoIxcProvedorList,
  useSyncIntegracaoIxcProvedorOsCadastros,
  useTestIntegracaoIxcProvedor,
} from 'hooks/useIntegracaoIxcProvedor';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { IntegracaoIxcProvedor } from 'services/integracaoIxcProvedorService';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import { useBulkBtn } from 'components/ui';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import IntegracaoIxcProvedorModal from './IntegracaoIxcProvedorModal';
import ImprimirModal from 'components/common/ImprimirModal';

interface IntegracaoIxcProvedorListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectIntegracao?: (integracao: IntegracaoIxcProvedor) => void;
  allowManage?: boolean;
  title?: string;
  skipWrapper?: boolean;
}

const IntegracaoIxcProvedorListModal: React.FC<IntegracaoIxcProvedorListModalProps> = ({
  show,
  onClose,
  onSelectIntegracao,
  allowManage = false,
  title,
  skipWrapper = false,
}) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const defaultTitle =
    title || (onSelectIntegracao ? t('ui.selectIxcProvedor') : t('tabs.ixcProvedor'));

  const list = useEntityListModal<IntegracaoIxcProvedor>({
    onClose,
    onSelect: onSelectIntegracao,
    initialSearchField: 'nome',
  });

  const { data: integracoesData, isLoading, refetch } = useIntegracaoIxcProvedorList({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
  });

  const deleteMutation = useDeleteIntegracaoIxcProvedor();
  const testMutation = useTestIntegracaoIxcProvedor();
  const syncOsMutation = useSyncIntegracaoIxcProvedorOsCadastros();

  const testBulkAction = useMemo(
    () => ({
      label: 'Testar integração',
      variant: bulkBtn.editar.variant,
      action: async (selectedItems: IntegracaoIxcProvedor[]) => {
        if (selectedItems.length !== 1) return;
        try {
          await testMutation.mutateAsync({ id: selectedItems[0].id });
        } catch {
          // Erro tratado pelo hook
        }
      },
      disabled: (selectedItems: IntegracaoIxcProvedor[]) => selectedItems.length !== 1,
    }),
    [bulkBtn.editar.variant, testMutation]
  );

  const syncOsBulkAction = useMemo(
    () => ({
      label: 'Sincronizar dados OS',
      variant: bulkBtn.editar.variant,
      action: async (selectedItems: IntegracaoIxcProvedor[]) => {
        if (selectedItems.length !== 1) return;
        try {
          await syncOsMutation.mutateAsync(selectedItems[0].id);
        } catch {
          // Erro tratado pelo hook
        }
      },
      disabled: (selectedItems: IntegracaoIxcProvedor[]) =>
        selectedItems.length !== 1 || syncOsMutation.isPending,
    }),
    [bulkBtn.editar.variant, syncOsMutation]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!window.confirm('Excluir integração IXC Provedor?')) return;
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
    (item: IntegracaoIxcProvedor) => {
      list.auditoria.handleAudit('IntegracaoIxcProvedor', item.id);
    },
    [list.auditoria]
  );

  const columns = useMemo(
    (): ListModalConfig<IntegracaoIxcProvedor>['columns'] => [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '42px',
        render: (item) => <span>{item.id}</span>,
      },
      { key: 'nome', label: t('form.name'), sortable: true, render: (item) => item.nome },
      {
        key: 'api_url',
        label: 'URL da API',
        sortable: true,
        render: (item) => item.api_url || '-',
      },
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
        key: 'created_at',
        label: t('table.createdAt'),
        sortable: true,
        render: (item) => (item.created_at ? formatDateTime(item.created_at) : '-'),
      },
    ],
    [t]
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: t('table.id') },
      { key: 'nome', label: t('form.name') },
      { key: 'api_url', label: 'URL da API' },
    ],
    [t]
  );

  const bulkActions = useMemo(() => {
    if (onSelectIntegracao) {
      const selectActions = list.buildSelectBulkActions();
      if (allowManage) {
        return [
          {
            label: bulkBtn.novo.label,
            variant: bulkBtn.novo.variant,
            action: () => list.openCreateForm(),
          },
          ...selectActions,
          testBulkAction,
          syncOsBulkAction,
        ];
      }
      return selectActions;
    }
    return [
      ...list.buildCrudBulkActions({
        onNew: list.openCreateForm,
        onEdit: list.openEditForm,
        onDelete: handleDelete,
      }),
      testBulkAction,
      syncOsBulkAction,
    ];
  }, [
    onSelectIntegracao,
    allowManage,
    list,
    handleDelete,
    bulkBtn.novo.label,
    bulkBtn.novo.variant,
    testBulkAction,
    syncOsBulkAction,
  ]);

  const pagination = useMemo(
    () => list.buildPagination(integracoesData?.pagination),
    [list, integracoesData?.pagination]
  );

  const modalData = useMemo(() => {
    const d = integracoesData?.data;
    return Array.isArray(d) ? d : [];
  }, [integracoesData?.data]);

  const handleRowSelect = useCallback(
    (item: IntegracaoIxcProvedor) => {
      onSelectIntegracao?.(item);
      onClose();
    },
    [onSelectIntegracao, onClose]
  );

  const listModal = (
    <ListModal<IntegracaoIxcProvedor>
      show={show}
      onClose={onSelectIntegracao ? onClose : list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchField: 'nome',
        searchFields,
        emptyMessage: 'Nenhuma integração IXC Provedor encontrada',
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
      onRowDoubleClick={onSelectIntegracao ? handleRowSelect : undefined}
      onAudit={handleAudit}
      auditEntity="IntegracaoIxcProvedor"
      tableId="integracao-ixc-provedor-list-modal"
      modalId="integracao-ixc-provedor-list-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <IntegracaoIxcProvedorModal
        show={list.showFormModal}
        onClose={list.closeFormModal}
        integracaoId={list.selectedEntityId}
        onSuccess={(integracaoId) => {
          refetch();
          list.closeFormModal();
          if (allowManage && onSelectIntegracao && integracaoId) {
            onSelectIntegracao({ id: integracaoId, nome: '' } as IntegracaoIxcProvedor);
          }
        }}
      />
      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-integracao-ixc-provedor-modal"
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

export default IntegracaoIxcProvedorListModal;
