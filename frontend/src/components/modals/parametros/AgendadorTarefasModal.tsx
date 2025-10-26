import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import { SchedulerService, RotinaAgendada } from '../../../services/schedulerService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { TableConfig } from '../../tables/types';
import Table from '../../tables/Table';
import Button from '../../ui/Button';

interface AgendadorTarefasModalProps {
  show: boolean;
  onClose: () => void;
}

const AgendadorTarefasModal: React.FC<AgendadorTarefasModalProps> = ({ show, onClose }) => {
  const { addNotification } = useNotificationContext();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agendador-tarefas'],
    queryFn: async () => {
      const response = await SchedulerService.getRotinas({
        page: 1,
        limit: 100,
      });
      return response;
    },
    enabled: show,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await SchedulerService.deleteRotina(id);
    },
    onSuccess: () => {
      addNotification('success', 'Rotina deletada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
      refetch();
    },
    onError: (error: any) => {
      addNotification('error', `Erro ao deletar rotina: ${error?.response?.data?.message || 'Erro desconhecido'}`);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: number; ativo: boolean }) => {
      await SchedulerService.toggleRotina(id, ativo);
    },
    onSuccess: () => {
      addNotification('success', 'Status da rotina atualizado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
      refetch();
    },
    onError: (error: any) => {
      addNotification('error', `Erro ao atualizar status: ${error?.response?.data?.message || 'Erro desconhecido'}`);
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (id: number) => {
      await SchedulerService.executeRotina(id);
    },
    onSuccess: () => {
      addNotification('success', 'Rotina executada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
      refetch();
    },
    onError: (error: any) => {
      addNotification('error', `Erro ao executar rotina: ${error?.response?.data?.message || 'Erro desconhecido'}`);
    },
  });

  const handleDelete = (id: number, nome: string) => {
    if (window.confirm(`Tem certeza que deseja deletar a rotina "${nome}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggle = (rotina: RotinaAgendada) => {
    toggleMutation.mutate({ id: rotina.id, ativo: !rotina.ativo });
  };

  const handleExecute = (rotina: RotinaAgendada) => {
    if (window.confirm(`Deseja executar a rotina "${rotina.nome}" agora?`)) {
      executeMutation.mutate(rotina.id);
    }
  };

  const tableConfig: TableConfig<RotinaAgendada> = {
    columns: [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
      },
      {
        key: 'nome',
        label: 'Nome',
        sortable: true,
      },
      {
        key: 'tipo',
        label: 'Tipo',
        render: (rotina) => {
          const tipos: Record<string, string> = {
            'envio_boletos': 'Envio de Boletos',
            'remessa_bancaria': 'Remessa Bancária',
            'verificar_vencimentos': 'Verificar Vencimentos',
          };
          return tipos[rotina.tipo] || rotina.tipo;
        },
      },
      {
        key: 'frequencia',
        label: 'Frequência',
        render: (rotina) => {
          const frequencias: Record<string, string> = {
            'diaria': 'Diária',
            'semanal': 'Semanal',
            'mensal': 'Mensal',
          };
          return frequencias[rotina.frequencia] || rotina.frequencia;
        },
      },
      {
        key: 'hora_execucao',
        label: 'Horário',
        render: (rotina) => {
          if (!rotina.hora_execucao) return '-';
          const [hour, minute] = rotina.hora_execucao.split(':');
          return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        },
      },
      {
        key: 'proxima_execucao',
        label: 'Próxima Execução',
        render: (rotina) => {
          if (!rotina.proxima_execucao) return '-';
          return new Date(rotina.proxima_execucao).toLocaleString('pt-BR');
        },
      },
      {
        key: 'ativo',
        label: 'Status',
        render: (rotina) => (
          <span className={`badge ${rotina.ativo ? 'bg-success' : 'bg-secondary'}`}>
            {rotina.ativo ? 'Ativo' : 'Inativo'}
          </span>
        ),
      },
      {
        key: 'total_execucoes',
        label: 'Execuções',
        sortable: true,
      },
      {
        key: 'execucoes_com_erro',
        label: 'Erros',
        sortable: true,
        render: (rotina) => rotina.execucoes_com_erro || 0,
      },
      {
        key: 'actions',
        label: 'Ações',
        render: (rotina) => (
          <div className="d-flex gap-1">
            <Button
              variant={rotina.ativo ? 'secondary' : 'success'}
              size="sm"
              onClick={() => handleToggle(rotina)}
            >
              <i className={`bi ${rotina.ativo ? 'bi-pause-circle' : 'bi-play-circle'}`}></i>
              {rotina.ativo ? ' Desativar' : ' Ativar'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleExecute(rotina)}
            >
              <i className="bi bi-play-fill"></i>
              {' Executar'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(rotina.id, rotina.nome)}
            >
              <i className="bi bi-trash"></i>
            </Button>
          </div>
        ),
      },
    ],
    data: data?.data || [],
    loading: isLoading,
    pagination: data?.pagination ? {
      current_page: data.pagination.page,
      last_page: data.pagination.pages,
      per_page: data.pagination.limit,
      total: data.pagination.total,
    } : undefined,
    searchable: true,
    searchPlaceholder: 'Buscar por nome, tipo ou descrição...',
    sortable: true,
    emptyMessage: 'Nenhuma rotina encontrada',
    actions: [
      {
        key: 'toggle',
        label: 'Ativar/Desativar',
        onClick: (rotina) => handleToggle(rotina),
      },
      {
        key: 'execute',
        label: 'Executar',
        onClick: (rotina) => handleExecute(rotina),
      },
      {
        key: 'delete',
        label: 'Deletar',
        onClick: (rotina) => handleDelete(rotina.id, rotina.nome),
        variant: 'danger',
        confirm: {
          title: 'Confirmar Exclusão',
          message: 'Tem certeza que deseja deletar esta rotina?',
        },
      },
    ],
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Agendador de Tarefas"
      size="xl"
    >
      <Table
        config={tableConfig}
        onRefresh={refetch}
      />
    </DraggableModal>
  );
};

export default AgendadorTarefasModal;

