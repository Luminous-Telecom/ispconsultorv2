import React, { useCallback, useMemo } from 'react';
import { useBancos, useDeleteBanco } from 'hooks/useBancos';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { Banco } from 'types';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import BancoModal from './BancoModal';
import ImprimirModal from 'components/common/ImprimirModal';

interface BancoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectBanco?: (banco: Banco) => void;
  title?: string;
  skipWrapper?: boolean;
}

const BancoListModal: React.FC<BancoListModalProps> = ({
  show,
  onClose,
  onSelectBanco,
  title,
  skipWrapper = false,
}) => {
  const { t } = useI18n();
  const defaultTitle = title || (onSelectBanco ? t('ui.selectBank') : t('menu.banks'));

  const list = useEntityListModal<Banco>({
    onClose,
    onSelect: onSelectBanco,
    initialSearchField: 'nome',
  });

  const { data: bancosData, isLoading, refetch } = useBancos({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    tipo_banco: undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
  });

  const deleteBancoMutation = useDeleteBanco();

  const handleDelete = useCallback(
    async (bancoId: number) => {
      try {
        await deleteBancoMutation.mutateAsync(bancoId);
        refetch();
      } catch {
        // Erro tratado pelo useNotificationContext
      }
    },
    [deleteBancoMutation, refetch]
  );

  const handleAudit = useCallback(
    (banco: Banco) => {
      list.auditoria.handleAudit('Banco', banco.id);
    },
    [list.auditoria]
  );

  const columns = useMemo(
    (): ListModalConfig<Banco>['columns'] => [
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
      {
        key: 'nome',
        label: t('form.name'),
        sortable: true,
        width: '180px',
        render: (item) => item.nome,
      },
      {
        key: 'descricao',
        label: t('form.description'),
        sortable: true,
        width: '200px',
        render: (item) => item.descricao || '-',
      },
      {
        key: 'tipo_banco',
        label: t('table.bankType'),
        sortable: true,
        render: (item) => {
          const tipos: Record<string, string> = {
            efi: 'EFI',
            asaas: 'Asaas',
            bancario: 'Bancário',
            outros: 'Outros',
          };
          return (
            <span className="badge bg-info">
              {tipos[item.tipo_banco] || 'N/A'}
            </span>
          );
        },
      },
      {
        key: 'sandbox',
        label: t('table.sandbox'),
        sortable: true,
        render: (item) => (
          <span className={`badge ${item.sandbox ? 'bg-warning' : 'bg-primary'}`}>
            {item.sandbox ? t('ui.yes') : t('ui.no')}
          </span>
        ),
      },
      {
        key: 'created_at',
        label: t('table.createdAt'),
        sortable: true,
        width: '130px',
        render: (item) => {
          const row = item as Banco & { created_at_formatada?: string | null; created_at?: string };
          if (row.created_at_formatada) return row.created_at_formatada;
          return row.created_at ? formatDateTime(row.created_at) : '-';
        },
      },
    ],
    [t]
  );

  const searchFields = useMemo(
    () => [
      { key: 'ativo', label: t('table.status') },
      { key: 'id', label: t('table.id') },
      { key: 'nome', label: t('form.name') },
      { key: 'descricao', label: t('form.description') },
      { key: 'tipo_banco', label: t('table.bankType') },
      { key: 'sandbox', label: t('table.sandbox') },
    ],
    [t]
  );

  const bulkActions = useMemo(() => {
    if (onSelectBanco) {
      return list.buildSelectBulkActions();
    }
    return list.buildCrudBulkActions({
      onNew: list.openCreateForm,
      onEdit: list.openEditForm,
      onDelete: handleDelete,
    });
  }, [onSelectBanco, list, handleDelete]);

  const pagination = useMemo(
    () => list.buildPagination(bancosData?.pagination),
    [list, bancosData?.pagination]
  );

  const modalData = useMemo(() => bancosData?.data || [], [bancosData?.data]);

  const handleRowSelect = useCallback(
    (item: Banco) => {
      onSelectBanco?.(item);
      onClose();
    },
    [onSelectBanco, onClose]
  );

  const listModal = (
    <ListModal<Banco>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchField: 'nome',
        searchFields,
        emptyMessage: 'Nenhum banco encontrado',
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
      onRowDoubleClick={onSelectBanco ? handleRowSelect : undefined}
      onAudit={handleAudit}
      auditEntity="Banco"
      tableId="bancos-list-modal"
      modalId="bancos-list-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <BancoModal
        show={list.showFormModal}
        onClose={list.closeFormModal}
        bancoId={list.selectedEntityId}
        onSuccess={(banco) => {
          refetch();
          list.setSelectedEntityId(banco.id);
        }}
      />

      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-banco-modal"
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

export default BancoListModal;
