import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDeleteContrato, Contrato } from '../../../hooks/useContratos';
import { ContratoService } from '../../../services/ContratoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import Table from '../../tables/Table';
import { TableConfig } from '../../tables/types';
import ContratoCreateModal from '../clientes/ContratoCreateModal';
import ContratoEditModal from '../clientes/ContratoEditModal';
import { AxiosError } from 'axios';

interface ContratoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectContrato?: (contrato: Contrato) => void;
  title?: string;
}

const ContratoListModal: React.FC<ContratoListModalProps> = ({
  show,
  onClose,
  onSelectContrato,
  title = "Contratos"
}) => {
  const [search, setSearch] = useState('');
  const [page] = useState(1);
  const [limit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [, setSelectedItems] = useState<Contrato[]>([]);
  
  const { success, error } = useNotificationContext();
  
  // Buscar todos os contratos ativos
  const { data: contratos, isLoading, refetch } = useQuery({
    queryKey: ['contratos', 'ativos'],
    queryFn: () => ContratoService.getAtivos(),
    staleTime: 30 * 1000, // 30 segundos
    refetchOnMount: false,
  });

  const deleteContratoMutation = useDeleteContrato();

  const handleDelete = async (id: number) => {
    try {
      await deleteContratoMutation.mutateAsync(id);
      success('Contrato excluído com sucesso!');
      refetch();
    } catch (err: unknown) {
      if (err instanceof Error && 'response' in err) {
        const axiosError = err as AxiosError<{ message?: string; error?: string }>;
        const errorMessage = axiosError.response?.data?.message || 
                            axiosError.response?.data?.error ||
                            'Erro ao excluir contrato';
        error(errorMessage);
      } else {
        error('Erro ao excluir contrato');
      }
    }
  };

  // Filtrar e ordenar dados
  const filteredData = React.useMemo(() => {
    if (!contratos) return [];
    
    let filtered = [...contratos];
    
    // Aplicar busca
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(c => 
        c.cliente?.razao_social?.toLowerCase().includes(searchLower) ||
        c.plano?.nome_plano?.toLowerCase().includes(searchLower) ||
        c.status?.toLowerCase().includes(searchLower)
      );
    }
    
    // Aplicar ordenação
    filtered.sort((a, b) => {
      let aVal: string | number | null | undefined = a[sortColumn as keyof Contrato] as string | number | null | undefined;
      let bVal: string | number | null | undefined = b[sortColumn as keyof Contrato] as string | number | null | undefined;
      
      // Tratamento especial para campos aninhados
      if (sortColumn === 'cliente') {
        aVal = a.cliente?.razao_social || '';
        bVal = b.cliente?.razao_social || '';
      } else if (sortColumn === 'plano') {
        aVal = a.plano?.nome_plano || '';
        bVal = b.plano?.nome_plano || '';
      }
      
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [contratos, search, sortColumn, sortDirection]);

  // Paginar dados
  const paginatedData = React.useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredData.slice(startIndex, startIndex + limit);
  }, [filteredData, page, limit]);

  const columns: TableConfig<Contrato>['columns'] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (item: Contrato) => <span>{item.id}</span>
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
      label: 'Novo',
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


  // Removido headerActions - botões agora ficam apenas na div interna do Table

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      modalId="contrato-list-modal"
    >
      <div>
        <Table
          config={{
            columns,
            data: paginatedData,
            loading: isLoading,
            searchable: true,
            searchPlaceholder: 'Buscar por cliente ou plano...',
            sortable: true,
            striped: true,
            hover: true,
            responsive: true,
            bulkActions: bulkActions.map(action => ({
              key: action.label.toLowerCase().replace(/\s+/g, '-'),
              label: action.label,
              onClick: action.action,
              disabled: action.disabled
            })),
            emptyMessage: 'Nenhum contrato encontrado'
          }}
          tableId="contrato-list-modal"
          onSort={(column: string, direction: 'asc' | 'desc') => {
            setSortColumn(column);
            setSortDirection(direction);
          }}
          onSelectionChange={setSelectedItems}
          onSearch={setSearch}
          onRefresh={refetch}
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
          // Não fecha o modal para permitir múltiplas edições
          refetch();
        }}
      />
    </DraggableModal>
  );
};

export default ContratoListModal;

