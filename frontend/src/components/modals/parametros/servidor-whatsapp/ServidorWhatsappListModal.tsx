import React, { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useI18n } from 'contexts/I18nContext';
import ListModal from 'components/common/ListModal';
import { StatusBadge } from 'components/ui';
import { ListModalConfig } from 'types/modal';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { ServidorWhatsApp, ServidorWhatsAppService } from 'services/servidorWhatsAppService';
import ServidorWhatsappModal from './ServidorWhatsappModal';
import ImprimirModal from 'components/common/ImprimirModal';

interface ServidorWhatsappListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onSelect?: (item: ServidorWhatsApp) => void;
}

const ServidorWhatsappListModal: React.FC<ServidorWhatsappListModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  onSelect,
}) => {
  const { t } = useI18n();
  const { showApiError } = useApiError();
  const list = useEntityListModal<ServidorWhatsApp>({
    onClose,
    onSelect,
    initialSearchField: 'descricao',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['servidores-whatsapp', list.tableFilters.debouncedSearch, list.tableFilters.searchField, list.tableFilters.page, list.tableFilters.limit, list.tableFilters.sortColumn, list.tableFilters.sortDirection],
    queryFn: () => ServidorWhatsAppService.list({
      search: list.tableFilters.debouncedSearch || undefined,
      searchField: list.tableFilters.searchField || undefined,
      page: list.tableFilters.page,
      limit: list.tableFilters.limit,
      sortColumn: list.tableFilters.sortColumn,
      sortDirection: list.tableFilters.sortDirection,
    }),
    enabled: show,
  });

  const handleDelete = useCallback(async (id: number) => {
    try {
      await ServidorWhatsAppService.delete(id);
      refetch();
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.SERVER_WHATSAPP_DELETE_ERROR);
    }
  }, [refetch, showApiError]);

  const columns = useMemo((): ListModalConfig<ServidorWhatsApp>['columns'] => [
    {
      key: 'ativo',
      label: t('table.status'),
      sortable: true,
      render: (item) => (
        <StatusBadge
          variant={item.ativo ? 'success' : 'secondary'}
          label={item.ativo ? t('status.active') : t('status.inactive')}
        />
      ),
    },
    { key: 'id', label: t('table.id'), sortable: true, render: (item) => item.id },
    { key: 'descricao', label: t('form.description'), sortable: true, render: (item) => item.descricao || '—' },
    {
      key: 'tipo_api',
      label: t('table.apiType'),
      sortable: true,
      render: (item) => (item.tipo_api === 'whatsapp_cloud' ? t('whatsappServer.cloudApi') : t('whatsappServer.evolutionApi')),
    },
    { key: 'instance_name', label: t('table.instance'), sortable: true, render: (item) => item.instance_name || '—' },
    {
      key: 'padrao',
      label: t('form.defaultServer'),
      sortable: true,
      render: (item) => (
        <StatusBadge
          variant={item.padrao ? 'success' : 'secondary'}
          label={item.padrao ? t('ui.yes') : t('ui.no')}
        />
      ),
    },
  ], [t]);

  const searchFields = useMemo(() => [
    { key: 'id', label: t('table.id') },
    { key: 'descricao', label: t('form.description') },
    { key: 'instance_name', label: t('table.instance') },
  ], [t]);

  const bulkActions = useMemo(() => {
    if (onSelect) {
      return list.buildSelectBulkActions().map((action, index) => (
        index === 1
          ? { ...action, label: list.bulkBtn.inserir.label, variant: list.bulkBtn.inserir.variant }
          : action
      ));
    }
    return list.buildCrudBulkActions({
      onNew: list.openCreateForm,
      onEdit: list.openEditForm,
      onDelete: handleDelete,
    });
  }, [onSelect, list, handleDelete]);

  return (
    <>
      <ListModal<ServidorWhatsApp>
        show={show}
        onClose={list.handleModalClose}
        skipWrapper={skipWrapper}
        config={{
          title: t('modal.whatsappServer'),
          columns,
          searchPlaceholder: t('layout.searchPlaceholder'),
          searchField: 'descricao',
          searchFields,
          emptyMessage: t('whatsappServer.empty'),
        }}
        data={data?.data ?? []}
        loading={isLoading}
        search={list.tableFilters.search}
        onSearchChange={list.handleSearchChange}
        onSearchFieldChange={list.handleSearchFieldChange}
        sortColumn={list.tableFilters.sortColumn}
        sortDirection={list.tableFilters.sortDirection}
        onSortChange={list.tableFilters.setSort}
        pagination={list.buildPagination(data?.pagination)}
        onPageChange={list.tableFilters.setPage}
        onLimitChange={list.tableFilters.setLimit}
        onRefresh={refetch}
        bulkActions={bulkActions}
        onSelectionChange={list.handleSelectionChange}
        onRowDoubleClick={onSelect ? (item) => { onSelect(item); onClose(); } : undefined}
        onAudit={(item) => list.auditoria.handleAudit('ServidorWhatsApp', item.id)}
        auditEntity="ServidorWhatsApp"
        tableId="servidores-whatsapp-modal"
        modalId="servidores-whatsapp-list-modal"
      />
      <ServidorWhatsappModal
        show={list.showFormModal}
        onClose={list.closeFormModal}
        servidorId={list.selectedEntityId}
        onSaved={refetch}
      />
      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-servidor-whatsapp-modal"
      />
    </>
  );
};

export default ServidorWhatsappListModal;
