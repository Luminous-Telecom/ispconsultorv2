import React, { useState } from 'react';
import { useBancos, useDeleteBanco } from '../../../hooks/useBancos';
import DataTable from '../../common/DataTable';
import TableFilters from '../../common/TableFilters';
import DraggableModal from '../../common/DraggableModal';

interface Banco {
  id: number;
  nome: string;
  tipo: 'tradicional' | 'efi' | 'asaas';
  url: string;
  ativo: boolean;
  data_criacao: string;
}

interface BancoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectBanco?: (banco: Banco) => void;
  title?: string;
}

const BancoListModal: React.FC<BancoListModalProps> = ({ 
  show, 
  onClose, 
  onSelectBanco,
  title = "Selecionar Banco"
}) => {
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Query para buscar bancos
  const { data: bancosData, isLoading, refetch } = useBancos({
    search: search || undefined,
    tipo_banco: tipo || undefined,
    page,
    limit
  });

  const deleteBancoMutation = useDeleteBanco();

  const getTipoBadgeClass = (tipo: string) => {
    switch (tipo) {
      case 'efi': return 'bg-primary';
      case 'asaas': return 'bg-info';
      case 'tradicional': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'efi': return 'EFI';
      case 'asaas': return 'ASAAS';
      case 'tradicional': return 'Tradicional';
      default: return tipo;
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setSearch('');
    setTipo('');
    setPage(1);
    refetch();
  };

  const handleDelete = async (bancoId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este banco?')) {
      try {
        await deleteBancoMutation.mutateAsync(bancoId);
        refetch();
      } catch (error) {
        console.error('Erro ao excluir banco:', error);
      }
    }
  };

  const handleRowClick = (banco: Banco) => {
    if (onSelectBanco) {
      onSelectBanco(banco);
      onClose();
    }
  };

  const columns = [
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (item: Banco) => (
        <div className="fw-bold">{item.nome}</div>
      )
    },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
      render: (item: Banco) => (
        <span className={`badge ${getTipoBadgeClass(item.tipo)}`}>
          {getTipoLabel(item.tipo)}
        </span>
      )
    },
    {
      key: 'url',
      label: 'URL',
      sortable: false,
      render: (item: Banco) => (
        <span className="text-muted small">{item.url}</span>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      render: (item: Banco) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'data_criacao',
      label: 'Data de Criação',
      sortable: true,
      render: (item: Banco) => (
        <span className="text-nowrap">
          {new Date(item.data_criacao).toLocaleDateString('pt-BR')}
        </span>
      )
    }
  ];

  const bulkActions = onSelectBanco ? [] : [
    {
      label: 'Novo Banco',
      action: () => {
        console.log('Abrir modal de novo banco');
      }
    },
    {
      label: 'Excluir',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} banco(s)?`)) {
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
          console.log('Visualizar banco:', selectedItems[0]);
        }
      }
    },
    {
      label: 'Editar',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          console.log('Editar banco:', selectedItems[0]);
        }
      }
    },
    {
      label: 'Testar Conexão',
      action: (selectedItems: any[]) => {
        if (selectedItems.length > 0) {
          console.log('Testar conexão do banco:', selectedItems[0]);
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
            search={search}
            onSearchChange={setSearch}
            status={tipo}
            onStatusChange={setTipo}
            onFilter={handleFilter}
            onReset={handleReset}
            statusOptions={[
              { value: '', label: 'Todos' },
              { value: 'efi', label: 'EFI' },
              { value: 'asaas', label: 'ASAAS' },
              { value: 'tradicional', label: 'Tradicional' }
            ]}
          />
        </div>

        {/* Tabela */}
        <div className="flex-grow-1">
          <DataTable
            data={bancosData?.data || []}
            columns={columns}
            isLoading={isLoading}
            pagination={{
              currentPage: page,
              totalPages: bancosData?.totalPages || 1,
              totalItems: bancosData?.total || 0,
              itemsPerPage: limit,
              onPageChange: setPage,
              onItemsPerPageChange: setLimit
            }}
            sorting={{
              column: sortColumn,
              direction: sortDirection,
              onSort: (column: string, direction: 'asc' | 'desc') => {
                setSortColumn(column);
                setSortDirection(direction);
              }
            }}
            bulkActions={bulkActions}
            topActions={topActions}
            onRowClick={handleRowClick}
            selectable={!onSelectBanco}
            searchable={false}
          />
        </div>
      </div>
    </DraggableModal>
  );
};

export default BancoListModal;
