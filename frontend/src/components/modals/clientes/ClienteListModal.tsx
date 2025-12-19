import React, { useState } from 'react';
import { useClientes, useDeleteCliente } from '@/hooks/useClientes';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { formatDateTime } from '@/utils/formatters';
import ListModal from '@/components/common/ListModal';
import ClienteModal from './cliente/ClienteModal';

interface Cliente {
  id: number;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  email: string;
  whatsapp?: string;
  ativo: boolean;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

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

  // Configurar modal centralizado
  const modal = useListModal({
    title,
    columns: [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '80px',
        render: (item: Cliente) => <span>{item.id}</span>
      },
      {
        key: 'cnpj',
        label: 'CNPJ',
        sortable: true,
        width: '150px',
        render: (item: Cliente) => (
          <span className="text-nowrap">{item.cnpj}</span>
        )
      },
      {
        key: 'razao_social',
        label: 'Razão Social',
        sortable: true,
        render: (item: Cliente) => (
          <strong>{item.razao_social}</strong>
        )
      },
      {
        key: 'nome_fantasia',
        label: 'Nome Fantasia',
        sortable: true,
        render: (item: Cliente) => (
          <span className="text-muted">{item.nome_fantasia || '-'}</span>
        )
      },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        render: (item: Cliente) => (
          <span className="text-nowrap">{item.email}</span>
        )
      },
      {
        key: 'whatsapp',
        label: 'WhatsApp',
        sortable: false,
        render: (item: Cliente) => (
          <span className="text-nowrap">{item.whatsapp || '-'}</span>
        )
      },
      {
        key: 'endereco',
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
        render: (item: Cliente) => (
          <span>{item.numero || '-'}</span>
        )
      },
      {
        key: 'complemento',
        label: 'Complemento',
        sortable: true,
        render: (item: Cliente) => (
          <span>{item.complemento || '-'}</span>
        )
      },
      {
        key: 'bairro',
        label: 'Bairro',
        sortable: true,
        render: (item: Cliente) => (
          <span>{item.bairro || '-'}</span>
        )
      },
      {
        key: 'cidade',
        label: 'Cidade',
        sortable: true,
        render: (item: Cliente) => (
          <span>{item.cidade || '-'}</span>
        )
      },
      {
        key: 'estado',
        label: 'Estado',
        sortable: true,
        render: (item: Cliente) => (
          <span>{item.estado || '-'}</span>
        )
      },
      {
        key: 'ativo',
        label: 'Status',
        sortable: true,
        width: '100px',
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
        render: (item: Cliente & { created_at?: string; created_at_formatada?: string | null }) => {
          // Usar created_at_formatada se disponível (vem do backend já formatada)
          if (item.created_at_formatada) {
            return item.created_at_formatada;
          }
          // Fallback para formatDateTime se não tiver formato do backend
          return item.created_at ? formatDateTime(item.created_at) : '-';
        }
      }
    ],
    searchPlaceholder: 'Buscar por CNPJ, razão social...',
    multiSelect: false // Sempre permitir apenas 1 seleção
  });

  // Hook para buscar clientes usando parâmetros do useTableFilters
  const { data: clientesData, isLoading, refetch } = useClientes({
    search: tableFilters.debouncedSearch || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit
  });

  const deleteClienteMutation = useDeleteCliente();

  const handleSelect = (selectedItems?: Cliente[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      if (onSelectClient) {
        onSelectClient(item);
        onClose();
      }
    }
  };

  const handleDelete = async (clienteId: number) => {
    try {
      await deleteClienteMutation.mutateAsync(clienteId);
      refetch();
    } catch (error) {
    }
  };

  // Paginação do backend - usar valores do backend quando disponíveis
  const pagination = clientesData?.pagination ? {
    current_page: clientesData.pagination.current_page,
    last_page: clientesData.pagination.last_page,
    per_page: clientesData.pagination.per_page,
    total: clientesData.pagination.total,
    from: clientesData.pagination.from,
    to: clientesData.pagination.to
  } : {
    current_page: tableFilters.page,
    last_page: 1,
    per_page: tableFilters.limit,
    total: 0,
    from: 0,
    to: 0
  };

  // Bulk actions
  const bulkActions = onSelectClient ? [
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
      action: (selectedItems: Cliente[]) => handleSelect(selectedItems)
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
      action: (selectedItems: Cliente[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          setSelectedClienteId(item.id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: 'Excluir',
      variant: 'danger' as const,
      disabled: (selectedItems: Cliente[]) => selectedItems.length === 0,
      action: (selectedItems: Cliente[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item && window.confirm('Tem certeza que deseja excluir este cliente?')) {
          handleDelete(item.id);
        }
      }
    }
  ];

  return (
    <>
      <ListModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        config={modal.config}
        data={clientesData?.data || []}
        loading={isLoading}
        selectedItems={selectedItem ? [selectedItem] : []}
        onSelectionChange={handleSelectionChange}
        search={tableFilters.search}
        onSearchChange={tableFilters.setSearch}
        pagination={pagination}
        onPageChange={tableFilters.setPage}
        limit={tableFilters.limit}
        onLimitChange={tableFilters.setLimit}
        refreshQueryKeys={['clientes']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
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
    </>
  );
};

export default ClienteListModal;
