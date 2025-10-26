import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ListModal from '../../common/ListModal';
import { useModalSelect } from '../../../hooks/useModalSelect';
import { useListModal } from '../../../hooks/useListModal';
import { SchedulerService, RotinaAgendada } from '../../../services/schedulerService';

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
        key: 'nome',
        label: 'Nome',
        sortable: true,
        render: (item: RotinaAgendada) => <strong>{item.nome}</strong>
      },
      {
        key: 'tipo',
        label: 'Tipo',
        sortable: true,
        render: (item: RotinaAgendada) => {
          const tipos: Record<string, string> = {
            'envio_boletos': 'Envio de Boletos',
            'remessa_bancaria': 'Remessa Bancária',
            'verificar_vencimentos': 'Verificar Vencimentos',
          };
          return <span className="badge bg-info">{tipos[item.tipo] || item.tipo}</span>;
        }
      },
      {
        key: 'frequencia',
        label: 'Frequência',
        sortable: true,
        render: (item: RotinaAgendada) => {
          const frequencias: Record<string, string> = {
            'diaria': 'Diária',
            'semanal': 'Semanal',
            'mensal': 'Mensal',
          };
          return frequencias[item.frequencia] || item.frequencia;
        }
      },
      {
        key: 'hora_execucao',
        label: 'Horário',
        sortable: true,
        render: (item: RotinaAgendada) => {
          if (!item.hora_execucao) return '-';
          const [hour, minute] = item.hora_execucao.split(':');
          return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        }
      },
      {
        key: 'proxima_execucao',
        label: 'Próxima Execução',
        render: (item: RotinaAgendada) => {
          if (!item.proxima_execucao) return '-';
          return new Date(item.proxima_execucao).toLocaleString('pt-BR');
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
        render: (item: RotinaAgendada) => item.total_execucoes || 0
      },
      {
        key: 'execucoes_com_erro',
        label: 'Erros',
        sortable: true,
        render: (item: RotinaAgendada) => item.execucoes_com_erro || 0
      }
    ],
    searchPlaceholder: 'Buscar por nome, tipo ou descrição...',
    multiSelect: false
  });

  const { data: rotinasData, isLoading, refetch } = useQuery({
    queryKey: ['agendador-tarefas'],
    queryFn: async () => {
      const response = await SchedulerService.getRotinas({
        page: 1,
        limit: 1000,
      });
      return response;
    },
    enabled: show,
  });

  const filteredRotinas = useMemo(() => {
    if (!rotinasData?.data) return [];
    
    let filtered = [...rotinasData.data];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(r => 
        r.nome?.toLowerCase().includes(searchLower) ||
        r.id?.toString().includes(searchLower) ||
        r.tipo?.toLowerCase().includes(searchLower) ||
        r.descricao?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
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
      refetch();
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    } catch (error: any) {
      alert(`Erro ao atualizar status: ${error?.response?.data?.message || 'Erro desconhecido'}`);
    }
  };

  const handleExecute = async (rotina: RotinaAgendada) => {
    if (!window.confirm(`Deseja executar a rotina "${rotina.nome}" agora?`)) {
      return;
    }
    try {
      await SchedulerService.executeRotina(rotina.id);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    } catch (error: any) {
      alert(`Erro ao executar rotina: ${error?.response?.data?.message || 'Erro desconhecido'}`);
    }
  };

  const handleDelete = async (rotina: RotinaAgendada) => {
    if (!window.confirm(`Tem certeza que deseja deletar a rotina "${rotina.nome}"?`)) {
      return;
    }
    try {
      await SchedulerService.deleteRotina(rotina.id);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    } catch (error: any) {
      alert(`Erro ao deletar rotina: ${error?.response?.data?.message || 'Erro desconhecido'}`);
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const bulkActions = [
    {
      label: 'Novo',
      variant: 'primary' as const,
      action: handleCreate
    },
    {
      label: 'Executar',
      variant: 'primary' as const,
      disabled: () => !selectedItem,
      action: () => {
        if (selectedItem) handleExecute(selectedItem);
      }
    },
    {
      label: 'Desativar',
      variant: 'secondary' as const,
      disabled: () => !selectedItem || !selectedItem.ativo,
      action: () => {
        if (selectedItem) handleToggle(selectedItem);
      }
    },
    {
      label: 'Excluir',
      variant: 'danger' as const,
      disabled: () => !selectedItem,
      action: () => {
        if (selectedItem) handleDelete(selectedItem);
      }
    }
  ];

  return (
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
      onRefresh={() => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
      }}
      bulkActions={bulkActions}
    />
  );
};

export default AgendadorTarefasModal;
