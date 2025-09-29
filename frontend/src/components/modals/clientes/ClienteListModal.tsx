import React, { useState } from 'react';
import { useClientes, useDeleteCliente } from '../../../hooks/useClientes';
import DataTable from '../../common/DataTable';
import TableFilters from '../../common/TableFilters';
import DraggableModal from '../../common/DraggableModal';
import { ClienteCreateModal } from './index';

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

  // Hooks para gerenciar clientes
  const { data: clientesData, isLoading, refetch } = useClientes({
    search: search || undefined,
    ativo: status ? status === 'ativo' : undefined,
    page,
    limit
  });

  const deleteClienteMutation = useDeleteCliente();

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setSearch('');
    setStatus('');
    setPage(1);
    refetch();
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
        <div>
          <div className="fw-bold">{item.razao_social}</div>
          {item.nome_fantasia && (
            <small className="text-muted">{item.nome_fantasia}</small>
          )}
        </div>
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
      label: 'Excluir',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} cliente(s)?`)) {
          selectedItems.forEach(item => handleDelete(item.id));
        }
      }
    }
  ];

  const topActions = [
    {
      label: 'Visualizar',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          console.log('Visualizar cliente:', selectedItems[0]);
        }
      }
    },
    {
      label: 'Editar',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          console.log('Editar cliente:', selectedItems[0]);
        }
      }
    }
  ];

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
    >
      <div className="d-flex flex-column h-100">
        {/* Filtros */}
        <div className="mb-3">
          <TableFilters
            fields={[
              {
                name: 'search',
                label: 'Buscar',
                type: 'text',
                placeholder: 'Buscar por CNPJ, razão social...',
                value: search,
                onChange: setSearch
              },
              {
                name: 'status',
                label: 'Status',
                type: 'select',
                value: status,
                onChange: setStatus,
                options: [
                  { value: '', label: 'Todos' },
                  { value: 'ativo', label: 'Ativos' },
                  { value: 'inativo', label: 'Inativos' }
                ]
              }
            ]}
            onFilter={handleFilter}
            onReset={handleReset}
          />
        </div>

        {/* Tabela */}
        <div className="flex-grow-1">
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
            onSelectionChange={(selectedItems) => {
              // Implementar lógica de seleção se necessário
            }}
          />
        </div>
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
    </DraggableModal>
  );
};

export default ClienteListModal;
