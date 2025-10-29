import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ListModal from '../../common/ListModal';
import { useModalSelect } from '../../../hooks/useModalSelect';
import { useListModal } from '../../../hooks/useListModal';
import { SchedulerService, RotinaAgendada } from '../../../services/schedulerService';
import RotinaAgendadaModal from './RotinaAgendadaModal';

interface AgendadorTarefasModalProps {
  show: boolean;
  onClose: () => void;
}

const AgendadorTarefasModal: React.FC<AgendadorTarefasModalProps> = ({ 
  show, 
  onClose
}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const {
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<RotinaAgendada>();

  const modal = useListModal({
    title: "Agendador de Tarefas",
    columns: [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        render: (item: RotinaAgendada) => <span>{item.id}</span>
      },
      {
        key: 'tipo',
        label: 'Tipo',
        sortable: true,
        render: (item: RotinaAgendada) => (
          <span className="badge bg-info">{item.tipo.replace(/_/g, ' ')}</span>
        )
      },
      {
        key: 'frequencia',
        label: 'Frequência',
        sortable: true,
        render: (item: RotinaAgendada) => item.frequencia
      },
      {
        key: 'hora_execucao',
        label: 'Horário',
        sortable: true,
        render: (item: RotinaAgendada) => item.hora_execucao || '-'
      },
      {
        key: 'proxima_execucao',
        label: 'Próxima Execução',
        render: (item: RotinaAgendada) => item.proxima_execucao ? new Date(item.proxima_execucao).toLocaleString('pt-BR') : '-'
      },
      {
        key: 'ativo',
        label: 'Status',
        sortable: true,
        render: (item: RotinaAgendada) => (
          <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
            {item.ativo ? 'Ativo' : 'Inativo'}
          </span>
        )
      },
      {
        key: 'total_execucoes',
        label: 'Execuções',
        sortable: true,
        render: (item: RotinaAgendada) => item.total_execucoes
      },
      {
        key: 'execucoes_com_erro',
        label: 'Erros',
        sortable: true,
        render: (item: RotinaAgendada) => item.execucoes_com_erro
      }
    ],
    searchPlaceholder: 'Buscar por tipo ou descrição...',
    multiSelect: false
  });

  const { data: rotinasData, isLoading, refetch } = useQuery({
    queryKey: ['agendador-tarefas'],
    queryFn: () => SchedulerService.getRotinas({ page: 1, limit: 1000 }),
    enabled: show,
  });

  const filteredRotinas = useMemo(() => {
    if (!rotinasData?.data) return [];
    if (!search) return rotinasData.data;
    
    const searchLower = search.toLowerCase();
    return rotinasData.data.filter(r => 
      r.id?.toString().includes(searchLower) ||
      r.tipo?.toLowerCase().includes(searchLower) ||
      r.descricao?.toLowerCase().includes(searchLower)
    );
  }, [rotinasData, search]);

  const paginatedRotinas = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredRotinas.slice(startIndex, startIndex + limit);
  }, [filteredRotinas, page, limit]);

  const pagination = {
    from: (page - 1) * limit + 1,
    to: Math.min(page * limit, filteredRotinas.length),
    total: filteredRotinas.length,
    current_page: page,
    last_page: Math.ceil(filteredRotinas.length / limit),
    per_page: limit
  };

  const handleToggle = async (rotina: RotinaAgendada) => {
    try {
      await SchedulerService.toggleRotina(rotina.id, !rotina.ativo);
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    } catch (error: any) {
      alert(`Erro ao atualizar status: ${error?.response?.data?.message || 'Erro desconhecido'}`);
    }
  };

  const handleExecute = async (rotina: RotinaAgendada) => {
    if (!window.confirm('Deseja executar a rotina agora?')) return;
    try {
      await SchedulerService.executeRotina(rotina.id);
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    } catch (error: any) {
      alert(`Erro ao executar rotina: ${error?.response?.data?.message || 'Erro desconhecido'}`);
    }
  };

  const handleDelete = async (rotina: RotinaAgendada) => {
    if (!window.confirm('Tem certeza que deseja deletar esta rotina?')) return;
    try {
      await SchedulerService.deleteRotina(rotina.id);
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    } catch (error: any) {
      alert(`Erro ao deletar rotina: ${error?.response?.data?.message || 'Erro desconhecido'}`);
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRotinaId, setSelectedRotinaId] = useState<number | null>(null);

  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleEdit = () => {
    if (selectedItem) {
      setSelectedRotinaId(selectedItem.id);
      setShowEditModal(true);
    }
  };

  const handleSuccess = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedRotinaId(null);
    clearSelection();
    queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
  };

  const bulkActions = [
    {
      label: 'Novo',
      variant: 'primary' as const,
      action: handleCreate
    },
    {
      label: 'Editar',
      variant: 'primary' as const,
      disabled: () => !selectedItem,
      action: handleEdit
    },
    {
      label: 'Executar',
      variant: 'primary' as const,
      disabled: () => !selectedItem,
      action: () => selectedItem && handleExecute(selectedItem)
    },
    {
      label: 'Desativar',
      variant: 'secondary' as const,
      disabled: () => !selectedItem || !selectedItem.ativo,
      action: () => selectedItem && handleToggle(selectedItem)
    },
    {
      label: 'Excluir',
      variant: 'danger' as const,
      disabled: () => !selectedItem,
      action: () => selectedItem && handleDelete(selectedItem)
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
        data={paginatedRotinas}
        loading={isLoading}
        selectedItems={selectedItem ? [selectedItem] : []}
        onSelectionChange={handleSelectionChange}
        search={search}
        onSearchChange={setSearch}
        pagination={pagination}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={setLimit}
        refreshQueryKeys={['agendador-tarefas']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
      />

      <RotinaAgendadaModal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedRotinaId(null);
        }}
        rotinaId={showEditModal ? selectedRotinaId : null}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default AgendadorTarefasModal;
