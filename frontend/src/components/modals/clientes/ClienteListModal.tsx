import React, { useCallback, useMemo, useState } from 'react';
import { useClientes, useDeleteCliente } from 'hooks/useClientes';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { formatDateTime } from 'utils/formatters';
import { useI18n } from 'contexts/I18nContext';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import ClienteModal from './cliente/ClienteModal';
import ImprimirModal from 'components/common/ImprimirModal';
import { Cliente, ClienteFilters } from 'types';

interface ClienteListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectClient?: (cliente: Cliente) => void;
  title?: string;
  skipWrapper?: boolean;
  initialFilters?: Partial<ClienteFilters>;
}

const ClienteListModal: React.FC<ClienteListModalProps> = ({
  show,
  onClose,
  onSelectClient,
  title,
  skipWrapper = false,
  initialFilters,
}) => {
  const { t } = useI18n();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);

  const list = useEntityListModal<Cliente>({
    onClose,
    onSelect: onSelectClient,
    initialSearchField: 'razao_social',
  });

  const filterTitleSuffix = initialFilters?.ativo === true
    ? ` - ${t('status.active')}`
    : initialFilters?.ativo === false
      ? ` - ${t('status.inactive')}`
      : '';
  const defaultTitle =
    (title || (onSelectClient ? t('ui.selectClient') : t('menu.clients'))) + filterTitleSuffix;

  const { data: clientesData, isLoading, refetch } = useClientes({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
    ...(initialFilters && Object.keys(initialFilters).length > 0 ? initialFilters : {}),
  });

  const deleteClienteMutation = useDeleteCliente();

  const handleDelete = useCallback(
    async (clienteId: number) => {
      try {
        await deleteClienteMutation.mutateAsync(clienteId);
        refetch();
      } catch {
        // Erro tratado pelos hooks
      }
    },
    [deleteClienteMutation, refetch]
  );

  const handleAudit = useCallback(
    (cliente: Cliente) => {
      list.auditoria.handleAudit('Cliente', cliente.id);
    },
    [list.auditoria]
  );

  const columns = useMemo(
    (): ListModalConfig<Cliente>['columns'] => [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '42px',
        render: (item) => <span>{item.id}</span>,
      },
      {
        key: 'cnpj',
        label: t('form.cnpj'),
        sortable: true,
        width: '130px',
        render: (item) => <span className="text-nowrap">{item.cnpj}</span>,
      },
      {
        key: 'razao_social',
        label: t('form.companyName'),
        sortable: true,
        width: '200px',
        render: (item) => item.razao_social,
      },
      {
        key: 'nome_fantasia',
        label: t('form.tradeName'),
        sortable: true,
        width: '180px',
        render: (item) => <span className="text-muted">{item.nome_fantasia || '-'}</span>,
      },
      {
        key: 'email',
        label: t('form.email'),
        sortable: true,
        width: '200px',
        render: (item) => <span className="text-nowrap">{item.email}</span>,
      },
      {
        key: 'whatsapp',
        label: t('form.phone'),
        sortable: true,
        width: '120px',
        render: (item) => <span className="text-nowrap">{item.whatsapp || '-'}</span>,
      },
      {
        key: 'endereco',
        width: '180px',
        label: t('form.address'),
        sortable: true,
        render: (item) => <span>{item.endereco || '-'}</span>,
      },
      {
        key: 'numero',
        label: t('form.number'),
        sortable: true,
        width: '70px',
        render: (item) => <span>{item.numero || '-'}</span>,
      },
      {
        key: 'complemento',
        label: t('form.complement'),
        sortable: true,
        width: '120px',
        render: (item) => <span>{item.complemento || '-'}</span>,
      },
      {
        key: 'bairro',
        label: t('form.neighborhood'),
        sortable: true,
        width: '120px',
        render: (item) => <span>{item.bairro || '-'}</span>,
      },
      {
        key: 'cidade',
        label: t('form.city'),
        sortable: true,
        width: '130px',
        render: (item) => <span>{item.cidade || '-'}</span>,
      },
      {
        key: 'estado',
        label: t('form.state'),
        sortable: true,
        width: '63px',
        render: (item) => <span>{item.estado || '-'}</span>,
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
        width: '145px',
        render: (item) => {
          const row = item as Cliente & { created_at_formatada?: string | null; created_at?: string };
          if (row.created_at_formatada) return row.created_at_formatada;
          return row.created_at ? formatDateTime(row.created_at) : '-';
        },
      },
    ],
    [t]
  );

  const searchFields = useMemo(
    () => [
      { key: 'todos', label: t('table.searchAllFields') },
      { key: 'id', label: t('table.id') },
      { key: 'cnpj', label: t('form.cnpj') },
      { key: 'razao_social', label: t('form.companyName') },
      { key: 'nome_fantasia', label: t('form.tradeName') },
      { key: 'email', label: t('form.email') },
      { key: 'whatsapp', label: t('form.phone') },
      { key: 'endereco', label: t('form.address') },
      { key: 'numero', label: t('form.number') },
      { key: 'complemento', label: t('form.complement') },
      { key: 'bairro', label: t('form.neighborhood') },
      { key: 'cidade', label: t('form.city') },
      { key: 'estado', label: t('form.state') },
    ],
    [t]
  );

  const bulkActions = useMemo(() => {
    if (onSelectClient) {
      return list.buildSelectBulkActions();
    }
    return list.buildCrudBulkActions({
      onNew: () => setShowCreateModal(true),
      onEdit: (item) => {
        setSelectedClienteId(item.id);
        setShowEditModal(true);
      },
      onDelete: handleDelete,
    });
  }, [onSelectClient, list, handleDelete]);

  const pagination = useMemo(
    () => list.buildPagination(clientesData?.pagination),
    [list, clientesData?.pagination]
  );

  const modalData = useMemo(() => clientesData?.data || [], [clientesData?.data]);

  const handleRowSelect = useCallback(
    (item: Cliente) => {
      onSelectClient?.(item);
      onClose();
    },
    [onSelectClient, onClose]
  );

  const listModal = (
    <ListModal<Cliente>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchField: 'razao_social',
        searchFields,
        emptyMessage: 'Nenhum cliente encontrado',
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
      onRowDoubleClick={onSelectClient ? handleRowSelect : undefined}
      onAudit={handleAudit}
      auditEntity="Cliente"
      tableId="clientes-list-modal"
      modalId="clientes-list-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <ClienteModal
        key="create-modal"
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch();
        }}
      />

      <ClienteModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedClienteId(null);
        }}
        clienteId={selectedClienteId}
        onSuccess={() => {
          refetch();
        }}
      />

      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-cliente-modal"
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

export default ClienteListModal;
