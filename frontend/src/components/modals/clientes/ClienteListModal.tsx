import React, { useState } from 'react';
import { useClientes, useDeleteCliente } from '../../../hooks/useClientes';
import { useModalSelect } from '../../../hooks/useModalSelect';
import { useListModal } from '../../../hooks/useListModal';
import ListModal from '../../common/ListModal';
import ClienteModal from './cliente/ClienteModal';

interface Cliente {
  id: number;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  email: string;
  whatsapp?: string;
  ativo: boolean;
}

interface ClienteListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectClient?: (cliente: Cliente) => void;
  title?: string;
}

const ClienteListModal: React.FC<ClienteListModalProps> = ({ 
  show, 
  onClose, 
  onSelectClient,
  title = "Selecionar Cliente"
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  
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
        key: 'ativo',
        label: 'Status',
        sortable: true,
        width: '100px',
        render: (item: Cliente) => (
          <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
            {item.ativo ? 'Ativo' : 'Inativo'}
          </span>
        )
      }
    ],
    searchPlaceholder: 'Buscar por CNPJ, razão social...',
    multiSelect: false // Sempre permitir apenas 1 seleção
  });

  // Hooks para gerenciar clientes
  // Usar useEffect para atualizar busca sem recriar o hook
  const [searchParam, setSearchParam] = useState<string | undefined>(undefined);
  
  // Debounce da busca para evitar muitas requisições
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParam(search || undefined);
      setPage(1); // Resetar para primeira página ao buscar
    }, 300); // 300ms de debounce
    
    return () => clearTimeout(timer);
  }, [search]);
  
  const { data: clientesData, isLoading, refetch } = useClientes({
    search: searchParam,
    page,
    limit
  });

  const deleteClienteMutation = useDeleteCliente();

  const handleSelect = () => {
    if (selectedItem) {
      clearSelection();
      if (onSelectClient) {
        onSelectClient(selectedItem);
        onClose();
      }
    }
  };

  const handleDelete = async (clienteId: number) => {
    try {
      await deleteClienteMutation.mutateAsync(clienteId);
      refetch();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
    }
  };

  const pagination = {
    current_page: page,
    last_page: clientesData?.pagination?.last_page || 1,
    per_page: limit,
    total: clientesData?.pagination?.total || 0,
    from: clientesData?.pagination?.from || (page - 1) * limit + 1,
    to: clientesData?.pagination?.to || Math.min(page * limit, clientesData?.pagination?.total || 0)
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
      disabled: () => !selectedItem,
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
      disabled: () => !selectedItem,
      action: () => {
        if (selectedItem) {
          setSelectedClienteId(selectedItem.id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: 'Excluir',
      variant: 'danger' as const,
      disabled: () => !selectedItem,
      action: () => {
        if (selectedItem && window.confirm('Tem certeza que deseja excluir este cliente?')) {
          handleDelete(selectedItem.id);
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
        search={search}
        onSearchChange={setSearch}
        pagination={pagination}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={setLimit}
        refreshQueryKeys={['clientes']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
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
