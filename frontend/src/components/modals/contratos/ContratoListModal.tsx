import React, { useState } from 'react';
import { useContratos, useDeleteContrato } from '../../../hooks/useContratos';
import { Contrato } from '../../../types';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import DataTable from '../../common/DataTable';
import ContratoCreateModal from '../clientes/ContratoCreateModal';
import ContratoEditModal from '../clientes/ContratoEditModal';

interface ContratoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectContrato?: (contrato: Contrato) => void;
}

const ContratoListModal: React.FC<ContratoListModalProps> = ({
  show,
  onClose,
  onSelectContrato
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  
  const { success, error } = useNotificationContext();
  
  // Buscar contratos
  const { data: contratosData, isLoading, refetch } = useContratos({
    search,
    page,
    limit
  });

  const deleteContratoMutation = useDeleteContrato();

  const handleDelete = async (id: number) => {
    try {
      await deleteContratoMutation.mutateAsync(id);
      success('Contrato excluído com sucesso!');
      refetch();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 
                          err?.response?.data?.error ||
                          'Erro ao excluir contrato';
      error(errorMessage);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (contrato: Contrato) => {
    if (onSelectContrato) {
      onSelectContrato(contrato);
      onClose();
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (item: Contrato) => <code className="text-primary">#{item.id}</code>
    },
    {
      key: 'cliente',
      label: 'Cliente',
      sortable: true,
      render: (item: Contrato) => (
        <div className="fw-bold">{item.cliente?.razao_social || '-'}</div>
      )
    },
    {
      key: 'plano',
      label: 'Plano',
      sortable: true,
      render: (item: Contrato) => item.plano?.nome_plano || '-'
    },
    {
      key: 'valor_plano',
      label: 'Valor Plano',
      sortable: true,
      render: (item: Contrato) => 
        item.plano?.valor_mensal ? `R$ ${Number(item.plano.valor_mensal).toFixed(2)}` : '-'
    },
    {
      key: 'valor_final',
      label: 'Valor Final',
      sortable: true,
      render: (item: Contrato) => 
        item.valor_final ? `R$ ${Number(item.valor_final).toFixed(2)}` : '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item: Contrato) => (
        <span className={`badge ${
          item.status === 'ativo' ? 'bg-success' :
          item.status === 'inativo' ? 'bg-danger' :
          'bg-warning text-dark'
        }`}>
          {item.status}
        </span>
      )
    },
    {
      key: 'data_inicio',
      label: 'Data Início',
      sortable: true,
      render: (item: Contrato) => 
        item.data_inicio ? new Date(item.data_inicio).toLocaleDateString('pt-BR') : '-'
    }
  ];

  const bulkActions = onSelectContrato ? [] : [
    {
      label: 'Novo Contrato',
      action: () => setShowCreateModal(true)
    },
    {
      label: 'Editar',
      action: (selectedItems: Contrato[]) => {
        if (selectedItems.length === 1) {
          setSelectedContratoId(selectedItems[0].id);
          setShowEditModal(true);
        }
      },
      disabled: (selectedItems: Contrato[]) => selectedItems.length !== 1
    },
    {
      label: 'Excluir',
      action: (selectedItems: Contrato[]) => {
        if (selectedItems.length > 0 && 
            window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} contrato(s)?`)) {
          selectedItems.forEach(item => handleDelete(item.id));
        }
      },
      disabled: (selectedItems: Contrato[]) => selectedItems.length === 0
    }
  ];

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Listar Contratos"
      size="xl"
    >
      <div className="modal-body">
        <DataTable
          columns={columns}
          data={contratosData?.data || []}
          isLoading={isLoading}
          pagination={contratosData?.pagination}
          limit={limit}
          setLimit={setLimit}
          setPage={setPage}
          emptyMessage="Nenhum contrato encontrado"
          searchPlaceholder="Buscar contratos..."
          onSearch={setSearch}
          bulkActions={bulkActions}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onRefresh={refetch}
          showHeader={!onSelectContrato}
          onRowClick={onSelectContrato ? handleRowClick : undefined}
        />
      </div>

      {/* Modal de Criação */}
      <ContratoCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          refetch();
        }}
      />

      {/* Modal de Edição */}
      <ContratoEditModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedContratoId(null);
        }}
        contratoId={selectedContratoId}
        onSuccess={() => {
          setShowEditModal(false);
          setSelectedContratoId(null);
          refetch();
        }}
      />
    </DraggableModal>
  );
};

export default ContratoListModal;

