import React, { useState } from 'react';
import { useClientes, useDeleteCliente } from '../../../hooks/useClientes';
import DataTable from '../../common/DataTable';
import TableFilters from '../../common/TableFilters';
import DraggableModal from '../../common/DraggableModal';
import ModalHeaderActions from '../../common/ModalHeaderActions';
import ConfirmModal from '../../common/ConfirmModal';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { useConfirm } from '../../../hooks/useConfirm';
import { ClienteCreateModal, ClienteEditModal } from './index';

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
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  // Hooks para gerenciar clientes
  const { data: clientesData, isLoading, refetch } = useClientes({
    search: search || undefined,
    ativo: status ? status === 'ativo' : undefined,
    page,
    limit
  });

  const deleteClienteMutation = useDeleteCliente();
  const { error: showError } = useNotificationContext();
  const { confirm, confirmState } = useConfirm();


  const handleDelete = async (clienteId: number) => {
    const confirmed = await confirm({
      message: 'Tem certeza que deseja excluir este cliente?',
      type: 'danger',
      confirmText: 'Excluir',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      try {
        await deleteClienteMutation.mutateAsync(clienteId);
        refetch();
      } catch (error: any) {
        console.error('Erro ao excluir cliente:', error);
        const errorMessage = error?.response?.data?.message || 
                           error?.response?.data?.error || 
                           'Erro ao excluir cliente';
        showError(errorMessage);
      }
    }
  };

  const handleRowClick = (cliente: Cliente) => {
    if (onSelectClient) {
      onSelectClient(cliente);
      onClose();
    }
  };

  const columns = [
    {
      key: 'cnpj',
      label: 'CNPJ',
      sortable: true,
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
      render: (item: Cliente) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    }
  ];

  const bulkActions = onSelectClient ? [] : [
    {
      label: 'Novo Cliente',
      action: () => {
        setShowCreateModal(true);
      }
    },
    {
      label: 'Editar',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          setSelectedClienteId(selectedItems[0].id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: 'Excluir',
      action: async (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          const confirmed = await confirm({
            message: `Tem certeza que deseja excluir ${selectedItems.length} cliente(s)?`,
            type: 'danger',
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
          });

          if (confirmed) {
            for (const item of selectedItems) {
              try {
                await deleteClienteMutation.mutateAsync(item.id);
              } catch (error: any) {
                console.error(`Erro ao excluir cliente ${item.id}:`, error);
                const errorMessage = error?.response?.data?.message || 
                                   error?.response?.data?.error || 
                                   `Erro ao excluir cliente ${item.id}`;
                showError(`Erro ao excluir cliente: ${errorMessage}`);
              }
            }
            refetch();
          }
        }
      }
    }
  ];


  // Ações para o header do modal usando componente reutilizável
  const headerActions = (
    <ModalHeaderActions
      bulkActions={bulkActions}
      selectedItems={selectedItems}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar por CNPJ, razão social..."
      limit={limit}
      onLimitChange={setLimit}
      pagination={clientesData?.pagination}
      onPageChange={setPage}
      onRefresh={() => refetch()}
    />
  );

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      headerActions={headerActions}
    >
      <div style={{ paddingLeft: '0.5rem' }}>
        <DataTable
            data={clientesData?.data || []}
            columns={columns}
            isLoading={isLoading}
            pagination={{
              from: clientesData?.pagination?.from || (page - 1) * limit + 1,
              to: clientesData?.pagination?.to || Math.min(page * limit, clientesData?.pagination?.total || 0),
              total: clientesData?.pagination?.total || 0,
              current_page: clientesData?.pagination?.current_page || page,
              last_page: clientesData?.pagination?.last_page || 1
            }}
            limit={limit}
            setLimit={setLimit}
            setPage={setPage}
            onSort={(column: string, direction: 'asc' | 'desc') => {
              setSortColumn(column);
              setSortDirection(direction);
            }}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            bulkActions={bulkActions}
            onSelectionChange={setSelectedItems}
            searchPlaceholder="Buscar por CNPJ, razão social..."
            onSearch={setSearch}
            emptyMessage="Nenhum cliente encontrado"
            showHeader={false}
          />
        </div>

      {/* Modal de Criação */}
      <ClienteCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch();
          setShowCreateModal(false);
        }}
      />

      {/* Modal de Edição */}
      <ClienteEditModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedClienteId(null);
        }}
        clienteId={selectedClienteId}
        onSuccess={() => {
          refetch();
          // Não fechar o modal automaticamente
        }}
      />

      {/* Modal de confirmação */}
      {confirmState && (
        <ConfirmModal
          show={confirmState.show}
          title={confirmState.options.title || 'Confirmar Ação'}
          message={confirmState.options.message}
          confirmText={confirmState.options.confirmText || 'Confirmar'}
          cancelText={confirmState.options.cancelText || 'Cancelar'}
          type={confirmState.options.type || 'warning'}
          onConfirm={confirmState.onConfirm}
          onCancel={confirmState.onCancel}
        />
      )}
    </DraggableModal>
  );
};

export default ClienteListModal;
