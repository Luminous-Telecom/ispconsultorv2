import React, { useState, useCallback, useMemo } from 'react';
import { useClientes, useDeleteCliente } from '@/hooks/useClientes';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useTableFilters } from '@/hooks/useTableFilters';
import { formatDateTime } from '@/utils/formatters';
import { useI18n } from '@/contexts/I18nContext';
import { useAuditoria } from '@/hooks/useAuditoria';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { TableConfig } from '@/components/tables/types';
import ClienteModal from './cliente/ClienteModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import { Cliente, ClienteFilters } from '@/types';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

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
  initialFilters
}) => {
  const { t } = useI18n();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  
  const auditoria = useAuditoria();
  const { confirm, modalProps } = useConfirmModal();

  const handleAudit = useCallback((cliente: Cliente) => {
    auditoria.handleAudit('Cliente', cliente.id);
  }, [auditoria]);
  
  // Hook unificado para filtros, busca e paginação
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });
  
  // Usar hook customizado para gerenciar seleção
  const {
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<Cliente>(
    onSelectClient ? (cliente) => {
      onSelectClient(cliente);
      onClose();
    } : undefined
  );

  // Configurar colunas memoizadas para Table
  const tableColumns: TableConfig<Cliente & { created_at?: string; created_at_formatada?: string | null }>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '42px',
      render: (item: Cliente) => <span>{item.id}</span>
    },
    {
      key: 'cnpj',
      label: t('form.cnpj'),
      sortable: true,
      width: '130px',
      render: (item: Cliente) => (
        <span className="text-nowrap">{item.cnpj}</span>
      )
    },
    {
      key: 'razao_social',
      label: t('form.companyName'),
      sortable: true,
      width: '200px',
      render: (item: Cliente) => (
        item.razao_social
      )
    },
    {
      key: 'nome_fantasia',
      label: t('form.tradeName'),
      sortable: true,
      width: '180px',
      render: (item: Cliente) => (
        <span className="text-muted">{item.nome_fantasia || '-'}</span>
      )
    },
    {
      key: 'email',
      label: t('form.email'),
      sortable: true,
      width: '200px',
      render: (item: Cliente) => (
        <span className="text-nowrap">{item.email}</span>
      )
    },
    {
      key: 'whatsapp',
      label: t('form.phone'),
      sortable: true,
      width: '120px',
      render: (item: Cliente) => (
        <span className="text-nowrap">{item.whatsapp || '-'}</span>
      )
    },
    {
      key: 'endereco',
      width: '180px',
      label: t('form.address'),
      sortable: true,
      render: (item: Cliente) => (
        <span>{item.endereco || '-'}</span>
      )
    },
    {
      key: 'numero',
      label: t('form.number'),
      sortable: true,
      width: '70px',
      render: (item: Cliente) => (
        <span>{item.numero || '-'}</span>
      )
    },
    {
      key: 'complemento',
      label: t('form.complement'),
      sortable: true,
      width: '120px',
      render: (item: Cliente) => (
        <span>{item.complemento || '-'}</span>
      )
    },
    {
      key: 'bairro',
      label: t('form.neighborhood'),
      sortable: true,
      width: '120px',
      render: (item: Cliente) => (
        <span>{item.bairro || '-'}</span>
      )
    },
    {
      key: 'cidade',
      label: t('form.city'),
      sortable: true,
      width: '130px',
      render: (item: Cliente) => (
        <span>{item.cidade || '-'}</span>
      )
    },
    {
      key: 'estado',
      label: t('form.state'),
      sortable: true,
      width: '63px',
      render: (item: Cliente) => (
        <span>{item.estado || '-'}</span>
      )
    },
    {
      key: 'ativo',
      label: t('table.status'),
      sortable: true,
      width: '60px',
      render: (item: Cliente) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? t('status.active') : t('status.inactive')}
        </span>
      )
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      width: '145px',
      render: (item: Cliente & { created_at?: string; created_at_formatada?: string | null }) => {
        // Usar created_at_formatada se disponível (vem do backend já formatada)
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        // Fallback para formatDateTime se não tiver formato do backend
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ], [t]);

  const filterTitleSuffix = initialFilters?.ativo === true
    ? ` - ${t('status.active')}`
    : initialFilters?.ativo === false
      ? ` - ${t('status.inactive')}`
      : '';
  const defaultTitle = (title || (onSelectClient ? t('ui.selectClient') : t('menu.clients'))) + filterTitleSuffix;
  
  const searchFields = [
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
    { key: 'estado', label: t('form.state') }
  ];

  const { data: clientesData, isLoading, refetch } = useClientes({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection,
    ...(initialFilters && Object.keys(initialFilters).length > 0 ? initialFilters : {})
  });

  const deleteClienteMutation = useDeleteCliente();

  const handleSelect = useCallback((selectedItems?: Cliente[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      if (onSelectClient) {
        onSelectClient(item);
        onClose();
      }
    }
  }, [selectedItem, clearSelection, onSelectClient, onClose]);

  const handleDelete = useCallback(async (clienteId: number) => {
    try {
      await deleteClienteMutation.mutateAsync(clienteId);
      refetch();
    } catch (error) {
    }
  }, [deleteClienteMutation, refetch]);

  const handleEdit = useCallback((selectedItems?: Cliente[]) => {
    const item = (selectedItems && selectedItems.length > 0) ? selectedItems[0] : selectedItem;
    if (item) {
      setSelectedClienteId(item.id);
      setShowEditModal(true);
    }
  }, [selectedItem]);

  const handleEditDelete = useCallback(async (selectedItems?: Cliente[]) => {
    const item = (selectedItems && selectedItems.length > 0) ? selectedItems[0] : selectedItem;
    if (!item) return;
    
    const confirmed = await confirm({
      message: t('messages.confirmDelete'),
      variant: 'danger',
      title: t('modal.deleteClient'),
      confirmText: t('actions.delete'),
      cancelText: t('actions.cancel'),
    });
    
    if (confirmed) {
      handleDelete(item.id);
    }
  }, [selectedItem, handleDelete, confirm, t]);

  // Paginação do backend - usar valores do backend quando disponíveis
  const pagination = useMemo(() => {
    if (clientesData?.pagination && typeof clientesData.pagination === 'object') {
      const pag = clientesData.pagination;
      const total = pag.total ?? 0;
      const perPage = pag.per_page ?? tableFilters.limit;
      const currentPage = pag.current_page ?? tableFilters.page;
      
      // Calcular last_page se não estiver definido
      let lastPage = pag.last_page;
      if (!lastPage && total > 0) {
        lastPage = Math.max(1, Math.ceil(total / perPage));
      } else if (!lastPage) {
        lastPage = 1;
      }
      
      return {
        current_page: currentPage,
        last_page: lastPage,
        per_page: perPage,
        total: total,
        from: pag.from ?? ((currentPage - 1) * perPage) + 1,
        to: pag.to ?? Math.min(currentPage * perPage, total)
      };
    }
    return {
      current_page: tableFilters.page,
      last_page: 1,
      per_page: tableFilters.limit,
      total: 0,
      from: 0,
      to: 0
    };
  }, [clientesData?.pagination, tableFilters.page, tableFilters.limit]);

  // Bulk actions memoizados
  const bulkActions = useMemo(() => {
    return onSelectClient ? [
      {
        label: t('buttons.cancel'),
        variant: 'primary' as const,
        action: () => {
          clearSelection();
          onClose();
        }
      },
      {
        label: t('buttons.select'),
        variant: 'primary' as const,
        disabled: (selectedItems: Cliente[]) => selectedItems.length === 0 && !selectedItem,
        action: handleSelect
      }
    ] : [
      {
        label: t('actions.create'),
        variant: 'primary' as const,
        action: () => setShowCreateModal(true)
      },
      {
        label: t('actions.edit'),
        variant: 'primary' as const,
        disabled: (selectedItems: Cliente[]) => selectedItems.length === 0 && !selectedItem,
        action: handleEdit
      },
      {
        label: t('actions.delete'),
        disabled: (selectedItems: Cliente[]) => selectedItems.length === 0 && !selectedItem,
        action: handleEditDelete
      }
    ];
  }, [onSelectClient, selectedItem, clearSelection, onClose, handleSelect, handleEdit, handleEditDelete, t]);

  const modalData = useMemo(() => clientesData?.data || [], [clientesData?.data]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
  }, [tableFilters]);

  const modalContent = (
    <>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            title={defaultTitle}
            config={{
              columns: tableColumns,
              data: modalData,
              loading: isLoading,
              searchable: true,
              searchPlaceholder: t('layout.searchPlaceholder'),
              searchFields,
              sortable: true,
              sortColumn: tableFilters.sortColumn,
              sortDirection: tableFilters.sortDirection,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              bulkActions: bulkActions.map(action => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                onClick: (items: Cliente[]) => {
                  // Se não há itens selecionados na tabela, usar selectedItem do hook
                  const itemsToUse = items.length > 0 ? items : (selectedItem ? [selectedItem] : []);
                  action.action(itemsToUse);
                },
                disabled: action.disabled,
                variant: action.variant
              })),
              emptyMessage: 'Nenhum cliente encontrado',
              pagination: pagination
            }}
            tableId="clientes-list-modal"
            onSelectionChange={handleSelectionChange}
            onRowClick={onSelectClient ? (item) => {
              onSelectClient(item);
              onClose();
            } : undefined}
            onRowDoubleClick={(cliente) => {
              if (onSelectClient) {
                onSelectClient(cliente);
                onClose();
              }
            }}
            onRefresh={refetch}
            onAudit={handleAudit}
            auditEntity="Cliente"
            onPageChange={tableFilters.setPage}
            onPageSizeChange={tableFilters.setLimit}
            onSort={(column, direction) => tableFilters.setSort(column, direction)}
            onSearch={(search, field) => handleSearchChange(search, field)}
            search={tableFilters.search}
          />
        </div>
      </div>
    </>
  );

  // Modais auxiliares (sempre renderizados, independente de skipWrapper)
  const auxiliaryModals = (
    <>
      {/* Modal de Criação */}
      <ClienteModal
        key="create-modal"
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Modal de Edição */}
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

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-cliente-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );

  if (skipWrapper) {
    return (
      <>
        {modalContent}
        {auxiliaryModals}
      </>
    );
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        title={defaultTitle}
        size="lg"
        modalId="clientes-list-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>
      {auxiliaryModals}
    </>
  );
};

export default ClienteListModal;
