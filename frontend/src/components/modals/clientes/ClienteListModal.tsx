import React, { useState } from 'react';
import { useClientes, useDeleteCliente } from '../../../hooks/useClientes';
import DataTable from '../../common/DataTable';
import TableFilters from '../../common/TableFilters';
import DraggableModal from '../../common/DraggableModal';
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
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} cliente(s)?`)) {
          selectedItems.forEach(item => handleDelete(item.id));
        }
      }
    }
  ];


  // Ações para o header do modal
  const headerActions = (
    <>
      {/* Botões de ação */}
      <div className="d-flex" style={{ gap: '8px' }}>
        {bulkActions.map((bulkAction, index) => {
          const isNewButton = bulkAction.label.toLowerCase().includes('nova') || bulkAction.label.toLowerCase().includes('novo');
          const isDisabled = !isNewButton && selectedItems.length === 0;
          
          return (
            <button
              key={index}
              className="btn btn-sm btn-primary"
              onClick={() => {
                if (!isDisabled) {
                  bulkAction.action(selectedItems);
                }
              }}
              disabled={isDisabled}
              style={{ flexShrink: 0 }}
            >
              {bulkAction.label}
            </button>
          );
        })}
      </div>

      {/* Filtros e controles */}
      <div className="d-flex align-items-center gap-2">
        {/* Busca */}
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Buscar por CNPJ, razão social..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '200px', height: '32px' }}
        />
        
        {/* Seletor de linhas por página */}
        <select 
          className="form-select form-select-sm" 
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value))}
          style={{ width: '100px', height: '32px', cursor: 'pointer' }}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>

        {/* Paginação compacta */}
        <div className="d-flex align-items-center gap-1">
          <button 
            className="btn btn-outline-secondary btn-sm" 
            onClick={() => setPage(1)}
            disabled={!clientesData?.pagination || clientesData.pagination.current_page <= 1}
          >
            <i className="bi bi-chevron-double-left"></i>
          </button>
          <button 
            className="btn btn-outline-secondary btn-sm" 
            onClick={() => setPage(page - 1)}
            disabled={!clientesData?.pagination || clientesData.pagination.current_page <= 1}
          >
            <i className="bi bi-chevron-left"></i>
          </button>
          <span className="small text-muted mx-2">
            {clientesData?.pagination ? `${clientesData.pagination.from} - ${clientesData.pagination.to} / ${clientesData.pagination.total}` : '0 - 0 / 0'}
          </span>
          <button 
            className="btn btn-outline-secondary btn-sm" 
            onClick={() => setPage(page + 1)}
            disabled={!clientesData?.pagination || clientesData.pagination.current_page >= clientesData.pagination.last_page}
          >
            <i className="bi bi-chevron-right"></i>
          </button>
          <button 
            className="btn btn-outline-secondary btn-sm" 
            onClick={() => setPage(clientesData?.pagination?.last_page || 1)}
            disabled={!clientesData?.pagination || clientesData.pagination.current_page >= clientesData.pagination.last_page}
          >
            <i className="bi bi-chevron-double-right"></i>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      headerActions={headerActions}
    >
      <div className="d-flex flex-column h-100">
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
            onSelectionChange={setSelectedItems}
            searchPlaceholder="Buscar por CNPJ, razão social..."
            onSearch={setSearch}
            emptyMessage="Nenhum cliente encontrado"
            showHeader={false}
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
          setShowEditModal(false);
          setSelectedClienteId(null);
        }}
      />
    </DraggableModal>
  );
};

export default ClienteListModal;
