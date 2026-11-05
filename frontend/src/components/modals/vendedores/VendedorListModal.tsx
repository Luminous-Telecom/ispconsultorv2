import React, { useCallback, useMemo } from 'react';
import ListModal from 'components/common/ListModal';
import ImprimirModal from 'components/common/ImprimirModal';
import { renderStatusBadge } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { useDeleteVendedor, useVendedores } from 'hooks/useVendedores';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { filtroSomenteAtivos, useMostrarInativos } from 'hooks/useMostrarInativos';
import { Vendedor } from 'services/vendedorService';
import { ListModalConfig } from 'types/modal';
import { formatCurrency, formatDateTime } from 'utils/formatters';
import VendedorModal from './VendedorModal';

interface VendedorListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectVendedor?: (vendedor: Vendedor) => void;
  title?: string;
  skipWrapper?: boolean;
}

const VendedorListModal: React.FC<VendedorListModalProps> = ({
  show,
  onClose,
  onSelectVendedor,
  title,
  skipWrapper = false,
}) => {
  const { t } = useI18n();
  const list = useEntityListModal<Vendedor>({
    onClose,
    onSelect: onSelectVendedor,
    initialSearchField: 'nome',
  });
  const inativos = useMostrarInativos(list.tableFilters.setPage);

  const { data, isLoading, refetch } = useVendedores({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
    ativo: filtroSomenteAtivos(inativos.showInactive, 'true'),
  });

  const deleteMutation = useDeleteVendedor();

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      refetch();
    } catch {
      // erro tratado pelo hook
    }
  }, [deleteMutation, refetch]);

  const columns = useMemo((): ListModalConfig<Vendedor>['columns'] => [
    {
      key: 'ativo',
      label: t('table.status'),
      sortable: true,
      render: (item) => renderStatusBadge(item.ativo
        ? { label: t('status.active'), variant: 'success' }
        : { label: t('status.inactive'), variant: 'secondary' }),
    },
    { key: 'id', label: t('table.id'), sortable: true, render: (item) => item.id },
    { key: 'nome', label: t('form.name'), sortable: true, render: (item) => item.nome },
    {
      key: 'comissao_percentual',
      label: t('form.commissionPercent'),
      sortable: true,
      render: (item) => (item.comissao_percentual != null && item.comissao_percentual !== '' ? `${item.comissao_percentual}%` : '—'),
    },
    {
      key: 'comissao_valor',
      label: t('form.commissionAmount'),
      sortable: true,
      render: (item) => (item.comissao_valor != null && item.comissao_valor !== '' ? formatCurrency(item.comissao_valor) : '—'),
    },
    { key: 'cidade', label: t('form.city'), sortable: true, render: (item) => item.cidade || '—' },
    { key: 'telefone', label: t('form.phone'), sortable: true, render: (item) => item.telefone || '—' },
    { key: 'email', label: t('form.email'), sortable: true, render: (item) => item.email || '—' },
    {
      key: 'updated_at',
      label: t('table.updatedAt'),
      sortable: true,
      render: (item) => (item.updated_at ? formatDateTime(item.updated_at) : '—'),
    },
  ], [t]);

  const searchFields = useMemo(() => [
    { key: 'id', label: t('table.id') },
    { key: 'nome', label: t('form.name') },
    { key: 'cpf_cnpj', label: t('form.cpfCnpj') },
    { key: 'email', label: t('form.email') },
    { key: 'cidade', label: t('form.city') },
  ], [t]);

  const bulkActions = useMemo(() => {
    const crud = list.buildCrudBulkActions({
      onNew: list.openCreateForm,
      onEdit: list.openEditForm,
      onDelete: handleDelete,
    });
    if (onSelectVendedor) return list.appendSelectInsert(crud);
    return crud;
  }, [handleDelete, list, onSelectVendedor]);

  const modalData = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data?.data]);

  const handleRowSelect = useCallback((item: Vendedor) => {
    onSelectVendedor?.(item);
    onClose();
  }, [onClose, onSelectVendedor]);

  return (
    <>
      <ListModal<Vendedor>
        show={show}
        onClose={onSelectVendedor ? onClose : list.handleModalClose}
        skipWrapper={skipWrapper}
        customControls={inativos.control}
        config={{
          title: title || t('modal.sellers'),
          columns,
          searchPlaceholder: t('layout.searchPlaceholder'),
          searchField: 'nome',
          searchFields,
          emptyMessage: t('vendedor.emptyList'),
        }}
        data={modalData}
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
        onRowDoubleClick={onSelectVendedor ? handleRowSelect : undefined}
        onAudit={(item) => list.auditoria.handleAudit('Vendedor', item.id)}
        auditEntity="Vendedor"
        tableId="vendedores-modal"
        modalId="vendedores-list-modal"
      />
      <VendedorModal
        show={list.showFormModal}
        onClose={list.closeFormModal}
        vendedorId={list.selectedEntityId}
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
        modalId="auditoria-vendedor-modal"
      />
    </>
  );
};

export default VendedorListModal;
