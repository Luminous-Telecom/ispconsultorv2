import React, { useState } from 'react';
import { useClientes, useDeleteCliente } from '../../../hooks/useClientes';
import DraggableModal from '../../common/DraggableModal';
import { ClienteCreateModal, ClienteEditModal } from './index';
import { Table, TableConfig } from '../../tables';

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
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
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

  // Configuração da tabela unificada
  const tableConfig: TableConfig = {
    data: clientesData?.data || [],
    loading: isLoading,
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
    pagination: {
      current_page: page,
      last_page: clientesData?.pagination?.last_page || 1,
      per_page: limit,
      total: clientesData?.pagination?.total || 0,
      from: clientesData?.pagination?.from || (page - 1) * limit + 1,
      to: clientesData?.pagination?.to || Math.min(page * limit, clientesData?.pagination?.total || 0)
    },
    bulkActions: onSelectClient ? [] : [
      {
        key: 'create',
        label: 'Novo',
        icon: 'plus',
        variant: 'primary',
        onClick: () => setShowCreateModal(true)
      },
      {
        key: 'edit',
        label: 'Editar',
        icon: 'pencil',
        variant: 'primary',
        onClick: (selectedItems: any[]) => {
          if (selectedItems.length > 0) {
            setSelectedClienteId(selectedItems[0].id);
            setShowEditModal(true);
          }
        }
      },
      {
        key: 'delete',
        label: 'Excluir',
        icon: 'trash',
        variant: 'danger',
        onClick: (selectedItems: any[]) => {
          if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} cliente(s)?`)) {
            selectedItems.forEach(item => handleDelete(item.id));
          }
        }
      }
    ],
    searchable: true,
    searchPlaceholder: 'Buscar por CNPJ, razão social...',
    sortable: true,
    selectable: !onSelectClient,
    multiSelect: !onSelectClient,
    emptyMessage: 'Nenhum cliente encontrado'
  };


  const handleDelete = async (clienteId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await deleteClienteMutation.mutateAsync(clienteId);
        refetch();
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
      }
    }
  };

  const handleRowClick = (cliente: Cliente) => {
    if (onSelectClient) {
      onSelectClient(cliente);
      onClose();
    }
  };


  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      modalId="cliente-list-modal"
      className="no-padding"
    >
      <div>
        <Table
          config={tableConfig}
          onSort={(column: string, direction: 'asc' | 'desc') => {
            setSortColumn(column);
            setSortDirection(direction);
          }}
          onSelectionChange={(selectedItems) => {
            setSelectedItems(selectedItems);
          }}
          onRefresh={() => refetch()}
          className="cliente-list-table"
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
    </DraggableModal>
  );
};

export default ClienteListModal;
