import React, { useState } from 'react';
import { useContratos } from '../../hooks/useContratos';
import { useSorting } from '../../hooks/useSorting';
import DataTable from '../common/DataTable';
import TableFilters from '../common/TableFilters';
import { Contrato } from '../../hooks/useContratos';
import ContratoCreateModal from '../modals/contratos/ContratoCreateModal';

const Contratos: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const { data: contratos = [], isLoading, error, refetch } = useContratos();

  // Usar hook de ordenação reutilizável
  const sortedData = useSorting(contratos, sortColumn, sortDirection);

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
    setPage(1);
  };

  const handleDelete = (contratoId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este contrato?')) {
      // TODO: Implementar exclusão
      console.log('Deletar contrato:', contratoId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-success';
      case 'inativo':
        return 'bg-danger';
      case 'suspenso':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true
    },
    {
      key: 'cliente',
      label: 'Cliente',
      sortable: true,
      render: (contrato: Contrato) => contrato.cliente?.razao_social || '-'
    },
    {
      key: 'plano',
      label: 'Plano',
      sortable: true,
      render: (contrato: Contrato) => contrato.plano?.nome_plano || '-'
    },
    {
      key: 'valor_final',
      label: 'Valor',
      sortable: true,
      render: (contrato: Contrato) => {
        const valor = contrato.valor_final || contrato.plano?.valor_mensal || 0;
        return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
      }
    },
    {
      key: 'data_inicio',
      label: 'Início',
      sortable: true,
      render: (contrato: Contrato) => contrato.data_inicio ? new Date(contrato.data_inicio).toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'data_fim',
      label: 'Fim',
      sortable: true,
      render: (contrato: Contrato) => contrato.data_fim ? new Date(contrato.data_fim).toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (contrato: Contrato) => (
        <span className={`badge ${getStatusColor(contrato.status)}`}>
          {contrato.status.charAt(0).toUpperCase() + contrato.status.slice(1)}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (contrato: Contrato) => new Date(contrato.created_at).toLocaleDateString('pt-BR')
    }
  ];

  const bulkActions = [
    {
      label: 'Novo Contrato',
      action: () => setShowCreateModal(true)
    },
    {
      label: 'Editar',
      action: (selectedItems: Contrato[]) => {
        if (selectedItems.length === 1) {
          console.log('Editar contrato:', selectedItems[0].id);
        }
      }
    },
    {
      label: 'Excluir',
      action: (selectedItems: Contrato[]) => {
        if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} contrato(s)?`)) {
          selectedItems.forEach(item => handleDelete(item.id));
        }
      }
    }
  ];

  if (error) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-danger">
              Erro ao carregar contratos: {error.message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={sortedData}
        isLoading={isLoading}
        pagination={{
          from: (page - 1) * limit + 1,
          to: Math.min(page * limit, contratos.length),
          total: contratos.length,
          current_page: page,
          last_page: Math.ceil(contratos.length / limit)
        }}
        limit={limit}
        setLimit={setLimit}
        setPage={setPage}
        emptyMessage="Nenhum contrato encontrado"
        searchPlaceholder="Buscar por cliente, plano ou status..."
        onSearch={setSearch}
        bulkActions={bulkActions}
        onSort={handleSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onRefresh={refetch}
        onSelectionChange={() => {}}
      />

      <ContratoCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          refetch();
        }}
      />
    </>
  );
};

export default Contratos;
