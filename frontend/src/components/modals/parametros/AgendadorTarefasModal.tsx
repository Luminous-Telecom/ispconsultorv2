import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { SchedulerService, RotinaAgendada } from '@/services/schedulerService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { formatDateTime } from '@/utils/formatters';
import ListModal from '@/components/common/ListModal';
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
  const { success, error: showError } = useNotificationContext();
  
  // Hook unificado para filtros, busca e paginação
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

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
        render: (item: RotinaAgendada) => item.proxima_execucao ? formatDateTime(item.proxima_execucao) : '-'
      },
      {
        key: 'ultima_execucao',
        label: 'Última Execução',
        sortable: true,
        render: (item: RotinaAgendada & { ultima_execucao_formatada?: string | null }) => {
          // Usar ultima_execucao_formatada se disponível (vem do backend já formatada)
          if (item.ultima_execucao_formatada) {
            return item.ultima_execucao_formatada;
          }
          // Fallback para formatDateTime se não tiver formato do backend
          return item.ultima_execucao ? formatDateTime(item.ultima_execucao) : '-';
        }
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
      },
      {
        key: 'created_at',
        label: 'Criado em',
        sortable: true,
        render: (item: RotinaAgendada & { created_at?: string; created_at_formatada?: string | null }) => {
          // Usar created_at_formatada se disponível (vem do backend já formatada)
          if (item.created_at_formatada) {
            return item.created_at_formatada;
          }
          // Fallback para formatDateTime se não tiver formato do backend
          return item.created_at ? formatDateTime(item.created_at) : '-';
        }
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
    if (!tableFilters.debouncedSearch) return rotinasData.data;
    
    const searchLower = tableFilters.debouncedSearch.toLowerCase();
    return rotinasData.data.filter(r => 
      r.id?.toString().includes(searchLower) ||
      r.tipo?.toLowerCase().includes(searchLower) ||
      r.descricao?.toLowerCase().includes(searchLower)
    );
  }, [rotinasData, tableFilters.debouncedSearch]);

  const paginatedRotinas = useMemo(() => {
    const startIndex = (tableFilters.page - 1) * tableFilters.limit;
    return filteredRotinas.slice(startIndex, startIndex + tableFilters.limit);
  }, [filteredRotinas, tableFilters.page, tableFilters.limit]);

  const pagination = {
    from: (tableFilters.page - 1) * tableFilters.limit + 1,
    to: Math.min(tableFilters.page * tableFilters.limit, filteredRotinas.length),
    total: filteredRotinas.length,
    current_page: tableFilters.page,
    last_page: Math.ceil(filteredRotinas.length / tableFilters.limit),
    per_page: tableFilters.limit
  };

  const handleToggle = async (rotina: RotinaAgendada) => {
    try {
      await SchedulerService.toggleRotina(rotina.id, !rotina.ativo);
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        alert(`Erro ao atualizar status: ${axiosError.response?.data?.message || 'Erro desconhecido'}`);
      } else {
        alert('Erro ao atualizar status: Erro desconhecido');
      }
    }
  };

  const handleExecute = async (rotina: RotinaAgendada) => {
    if (!window.confirm('Deseja executar a rotina agora?')) return;
    try {
      await SchedulerService.executeRotina(rotina.id);
      success('Rotina iniciada em background');
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        showError(`Erro ao executar rotina: ${axiosError.response?.data?.message || 'Erro desconhecido'}`);
      } else {
        showError('Erro ao executar rotina: Erro desconhecido');
      }
    }
  };

  const handleDelete = async (rotina: RotinaAgendada) => {
    if (!window.confirm('Tem certeza que deseja deletar esta rotina?')) return;
    try {
      await SchedulerService.deleteRotina(rotina.id);
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        alert(`Erro ao deletar rotina: ${axiosError.response?.data?.message || 'Erro desconhecido'}`);
      } else {
        alert('Erro ao deletar rotina: Erro desconhecido');
      }
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRotinaId, setSelectedRotinaId] = useState<number | null>(null);

  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleEdit = (selectedItems: RotinaAgendada[]) => {
    const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      setSelectedRotinaId(item.id);
      setShowEditModal(true);
    }
  };

  const handleSuccess = async () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedRotinaId(null);
    clearSelection();
    await queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    await refetch();
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
      disabled: (selectedItems: RotinaAgendada[]) => selectedItems.length === 0 && !selectedItem,
      action: handleEdit
    },
    {
      label: 'Executar',
      variant: 'primary' as const,
      disabled: (selectedItems: RotinaAgendada[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: RotinaAgendada[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          handleExecute(item);
        }
      }
    },
    {
      label: 'Desativar',
      variant: 'secondary' as const,
      disabled: (selectedItems: RotinaAgendada[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        return !item || !item.ativo;
      },
      action: (selectedItems: RotinaAgendada[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          handleToggle(item);
        }
      }
    },
    {
      label: 'Excluir',
      variant: 'danger' as const,
      disabled: (selectedItems: RotinaAgendada[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: RotinaAgendada[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          handleDelete(item);
        }
      }
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
        search={tableFilters.search}
        onSearchChange={tableFilters.setSearch}
        pagination={pagination}
        onPageChange={tableFilters.setPage}
        limit={tableFilters.limit}
        onLimitChange={tableFilters.setLimit}
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
