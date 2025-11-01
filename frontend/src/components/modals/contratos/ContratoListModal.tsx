import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDeleteContrato, Contrato } from '../../../hooks/useContratos';
import { ContratoService } from '../../../services/ContratoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import Table from '../../tables/Table';
import { TableConfig } from '../../tables/types';
import ContratoModal from '../clientes/contrato/ContratoModal';
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

  // Adicionar campos virtuais para busca funcionar com campos aninhados
  const dataWithVirtualFields = React.useMemo(() => {
    if (!contratos) return [];
    
    return contratos.map((c: Contrato) => ({
      ...c,
      // Adicionar campos virtuais para busca funcionar com campos aninhados
      cliente_razao_social: c.cliente?.razao_social || '',
      plano_nome: c.plano?.nome_plano || '',
      valor_plano_str: (c.plano?.valor_mensal || 0).toString(),
      valor_final_str: (c.valor_final || 0).toString()
    }));
  }, [contratos]);

  const columns: TableConfig<Contrato & { cliente_razao_social?: string; plano_nome?: string; valor_plano_str?: string; valor_final_str?: string }>['columns'] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      searchable: true,
      render: (item: Contrato) => <span>{item.id}</span>
    },
    {
      key: 'cliente_razao_social',
      label: 'Cliente',
      sortable: true,
      searchable: true,
      render: (item: Contrato & { cliente_razao_social?: string }) => (
        <div className="fw-bold">{item.cliente?.razao_social || item.cliente_razao_social || '-'}</div>
      )
    },
    {
      key: 'plano_nome',
      label: 'Plano',
      sortable: true,
      searchable: true,
      render: (item: Contrato & { plano_nome?: string }) => item.plano?.nome_plano || item.plano_nome || '-'
    },
    {
      key: 'valor_plano_str',
      label: 'Valor Plano',
      sortable: false,
      searchable: true,
      render: (item: Contrato) => 
        item.plano?.valor_mensal ? `R$ ${Number(item.plano.valor_mensal).toFixed(2)}` : '-'
    },
    {
      key: 'valor_final_str',
      label: 'Valor Final',
      sortable: false,
      searchable: true,
      render: (item: Contrato) => 
        item.valor_final ? `R$ ${Number(item.valor_final).toFixed(2)}` : '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      searchable: true,
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
      searchable: false,
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
            data: dataWithVirtualFields,
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
              onSelectionChange={setSelectedItems}
              onRefresh={refetch}
        />
      </div>

      {/* Modal de Contrato (criação e edição unificados) */}
      <ContratoModal
        show={showCreateModal || showEditModal}
        clienteId={undefined}
        contratoId={showEditModal ? selectedContratoId : null}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedContratoId(null);
        }}
        onSuccess={() => {
          // Não fechar o modal automaticamente - permitir criar múltiplos contratos
          refetch();
        }}
      />
    </DraggableModal>
  );
};

export default ContratoListModal;

