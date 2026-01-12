import React, { useState, useCallback, useMemo } from 'react';
import { useClientes, useDeleteCliente } from '@/hooks/useClientes';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { formatDateTime } from '@/utils/formatters';
import { useAuditoria } from '@/hooks/useAuditoria';
import ListModal from '@/components/common/ListModal';
import ClienteModal from './cliente/ClienteModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import { Cliente } from '@/types';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

interface ClienteListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectClient?: (cliente: Cliente) => void;
  title?: string;
  skipWrapper?: boolean;
}

const ClienteListModal: React.FC<ClienteListModalProps> = ({ 
  show, 
  onClose, 
  onSelectClient,
  title = "Selecionar Cliente",
  skipWrapper = false
}) => {
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

  // Configurar colunas memoizadas
  const columns = useMemo(() => [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '42px',
      render: (item: Cliente) => <span>{item.id}</span>
    },
    {
      key: 'cnpj',
      label: 'CNPJ',
      sortable: true,
      width: '130px',
      render: (item: Cliente) => (
        <span className="text-nowrap">{item.cnpj}</span>
      )
    },
    {
      key: 'razao_social',
      label: 'Razão Social',
      sortable: true,
      width: '200px',
      render: (item: Cliente) => (
        item.razao_social
      )
    },
    {
      key: 'nome_fantasia',
      label: 'Nome Fantasia',
      sortable: true,
      width: '180px',
      render: (item: Cliente) => (
        <span className="text-muted">{item.nome_fantasia || '-'}</span>
      )
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      width: '200px',
      render: (item: Cliente) => (
        <span className="text-nowrap">{item.email}</span>
      )
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      sortable: true,
      width: '120px',
      render: (item: Cliente) => (
        <span className="text-nowrap">{item.whatsapp || '-'}</span>
      )
    },
    {
      key: 'endereco',
      width: '180px',
      label: 'Endereço',
      sortable: true,
      render: (item: Cliente) => (
        <span>{item.endereco || '-'}</span>
      )
    },
    {
      key: 'numero',
      label: 'Número',
      sortable: true,
      width: '70px',
      render: (item: Cliente) => (
        <span>{item.numero || '-'}</span>
      )
    },
    {
      key: 'complemento',
      label: 'Complemento',
      sortable: true,
      width: '120px',
      render: (item: Cliente) => (
        <span>{item.complemento || '-'}</span>
      )
    },
    {
      key: 'bairro',
      label: 'Bairro',
      sortable: true,
      width: '120px',
      render: (item: Cliente) => (
        <span>{item.bairro || '-'}</span>
      )
    },
    {
      key: 'cidade',
      label: 'Cidade',
      sortable: true,
      width: '130px',
      render: (item: Cliente) => (
        <span>{item.cidade || '-'}</span>
      )
    },
    {
      key: 'estado',
      label: 'Estado',
      sortable: true,
      width: '63px',
      render: (item: Cliente) => (
        <span>{item.estado || '-'}</span>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      width: '60px',
      render: (item: Cliente) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
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
  ], []);

  // Configurar modal centralizado
  const modal = useListModal({
    title,
    columns,
    searchPlaceholder: 'Buscar...',
    searchFields: [
      { key: 'id', label: 'ID' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'razao_social', label: 'Razão Social' },
      { key: 'nome_fantasia', label: 'Nome Fantasia' },
      { key: 'email', label: 'Email' },
      { key: 'whatsapp', label: 'WhatsApp' },
      { key: 'endereco', label: 'Endereço' },
      { key: 'numero', label: 'Número' },
      { key: 'complemento', label: 'Complemento' },
      { key: 'bairro', label: 'Bairro' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'estado', label: 'Estado' }
    ]
  });

  // Hook para buscar clientes usando parâmetros do useTableFilters
  const { data: clientesData, isLoading, refetch } = useClientes({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit
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

  const handleEdit = useCallback((selectedItems: Cliente[]) => {
    const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      setSelectedClienteId(item.id);
      setShowEditModal(true);
    }
  }, [selectedItem]);

  const handleEditDelete = useCallback(async (selectedItems: Cliente[]) => {
    const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (!item) return;
    
    const confirmed = await confirm({
      message: 'Tem certeza que deseja excluir este cliente?',
      variant: 'danger',
      title: 'Excluir cliente',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
    });
    
    if (confirmed) {
      handleDelete(item.id);
    }
  }, [selectedItem, handleDelete, confirm]);

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
        label: 'Cancelar',
        variant: 'secondary' as const,
        action: () => {
          clearSelection();
          onClose();
        }
      },
      {
        label: 'Inserir',
        variant: 'primary' as const,
        disabled: (selectedItems: Cliente[]) => selectedItems.length === 0 && !selectedItem,
        action: handleSelect
      }
    ] : [
      {
        label: 'Novo',
        variant: 'primary' as const,
        action: () => setShowCreateModal(true)
      },
      {
        label: 'Editar',
        variant: 'primary' as const,
        disabled: (selectedItems: Cliente[]) => selectedItems.length === 0,
        action: handleEdit
      },
      {
        label: 'Excluir',
        disabled: (selectedItems: Cliente[]) => selectedItems.length === 0,
        action: handleEditDelete
      }
    ];
  }, [onSelectClient, selectedItem, clearSelection, onClose, handleSelect, handleEdit, handleEditDelete]);

  const modalData = useMemo(() => clientesData?.data || [], [clientesData?.data]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearch, tableFilters.setSearchField]);

  const handleSearchFieldChange = useCallback((field: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearchField(field);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearchField]);

  const handlePageChange = useCallback((page: number) => {
    tableFilters.setPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setPage]);

  const handleLimitChange = useCallback((limit: number) => {
    tableFilters.setLimit(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setLimit]);

  return (
    <>
      <ListModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        config={modal.config}
        data={modalData}
        loading={isLoading}
        selectedItems={selectedItem ? [selectedItem] : []}
        onSelectionChange={handleSelectionChange}
        onRowDoubleClick={(cliente) => {
          // Double-click seleciona o item e fecha o modal
          if (onSelectClient) {
            onSelectClient(cliente);
            onClose();
          }
        }}
        search={tableFilters.search}
        onSearchChange={handleSearchChange}
        onSearchFieldChange={handleSearchFieldChange}
        pagination={pagination}
        onPageChange={handlePageChange}
        limit={tableFilters.limit}
        onLimitChange={handleLimitChange}
        refreshQueryKeys={['clientes']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
        onAudit={handleAudit}
        auditEntity="Cliente"
        skipWrapper={skipWrapper}
      />

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
        title="Relatórios de logs"
        modalId="auditoria-cliente-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default ClienteListModal;
