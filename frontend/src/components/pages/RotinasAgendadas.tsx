import React, { useState, useEffect, useCallback } from 'react';
import { useNotificationContext } from '../../contexts/NotificationContext';
import DataTable from '../common/DataTable';
import { SchedulerService, RotinaAgendada } from '../../services/schedulerService';
import RotinaForm from './forms/RotinaForm';
import LogsModal from '../common/LogsModal';


const RotinasAgendadas: React.FC = () => {
  const [rotinas, setRotinas] = useState<RotinaAgendada[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<number | null>(null);
  const [selectedRoutineName, setSelectedRoutineName] = useState<string>('');
  const [selectedRoutine, setSelectedRoutine] = useState<RotinaAgendada | null>(null);

  const { addNotification } = useNotificationContext();


  // Buscar rotinas
  const fetchRotinas = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = {
        page,
        limit,
        ...(search && { search }),
        ...(sortColumn && { sort: sortColumn, direction: sortDirection })
      };

      const response = await SchedulerService.getRotinas(params);
      
      if (response.success) {
        setRotinas(response.data);
      } else {
        addNotification('error', 'Erro ao carregar rotinas agendadas');
      }
    } catch (error) {
      console.error('Erro ao buscar rotinas:', error);
      addNotification('error', 'Erro ao carregar rotinas agendadas');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, sortColumn, sortDirection, addNotification]);

  // Função para refresh sem reload completo
  const refreshRotinas = useCallback(async () => {
    try {
      const params = {
        page,
        limit,
        ...(search && { search }),
        ...(sortColumn && { sort: sortColumn, direction: sortDirection })
      };

      const response = await SchedulerService.getRotinas(params);
      
      if (response.success) {
        setRotinas(response.data);
        addNotification('success', 'Dados atualizados com sucesso!', 3000); // 3 segundos
      } else {
        addNotification('error', 'Erro ao atualizar dados', 5000);
      }
    } catch (error) {
      console.error('Erro ao atualizar rotinas:', error);
      addNotification('error', 'Erro ao atualizar dados', 5000);
    }
  }, [page, limit, search, sortColumn, sortDirection, addNotification]);

  useEffect(() => {
    fetchRotinas();
  }, [fetchRotinas]);

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
    setPage(1);
  };

  const getSortedData = () => {
    if (!rotinas || !sortColumn) {
      return rotinas;
    }

    return [...rotinas].sort((a, b) => {
      let aValue = (a as any)[sortColumn];
      let bValue = (b as any)[sortColumn];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'geracao_titulos': return 'Geração de Títulos';
      case 'envio_boletos': return 'Envio de Boletos';
      case 'remessa_bancaria': return 'Remessa Bancária';
      default: return tipo;
    }
  };

  const getFrequenciaLabel = (frequencia: string) => {
    switch (frequencia) {
      case 'diaria': return 'Diária';
      case 'semanal': return 'Semanal';
      case 'mensal': return 'Mensal';
      case 'anual': return 'Anual';
      case 'personalizada': return 'Personalizada';
      default: return frequencia;
    }
  };



  const columns = [
    {
      key: 'id',
      label: 'ID',
      className: 'col-id',
      sortable: true,
      render: (rotina: RotinaAgendada) => <code className="text-primary">#{rotina.id}</code>
    },
    {
      key: 'nome',
      label: 'Nome',
      className: 'col-extra-large',
      sortable: true,
      render: (rotina: RotinaAgendada) => <strong>{rotina.nome}</strong>
    },
    {
      key: 'tipo',
      label: 'Tipo',
      className: 'col-medium',
      sortable: true,
      render: (rotina: RotinaAgendada) => (
        <span className="badge bg-info">
          {getTipoLabel(rotina.tipo)}
        </span>
      )
    },
    {
      key: 'frequencia',
      label: 'Frequência',
      className: 'col-small',
      sortable: true,
      render: (rotina: RotinaAgendada) => (
        <span className="badge bg-secondary">
          {getFrequenciaLabel(rotina.frequencia)}
        </span>
      )
    },
    {
      key: 'hora_execucao',
      label: 'Hora',
      className: 'col-small',
      sortable: true,
      render: (rotina: RotinaAgendada) => rotina.hora_execucao
    },
    {
      key: 'proxima_execucao',
      label: 'Próxima Execução',
      className: 'col-medium',
      sortable: true,
      render: (rotina: RotinaAgendada) => 
        rotina.proxima_execucao ? new Date(rotina.proxima_execucao).toLocaleString('pt-BR') : '-'
    },
    {
      key: 'total_execucoes',
      label: 'Execuções',
      className: 'col-small',
      sortable: true,
      render: (rotina: RotinaAgendada) => (
        <>
          <span className="badge bg-success">{rotina.execucoes_com_sucesso}</span>
          <span className="text-muted"> / </span>
          <span className="badge bg-danger">{rotina.execucoes_com_erro}</span>
        </>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      className: 'col-small',
      sortable: true,
      render: (rotina: RotinaAgendada) => (
        <span className={`badge ${rotina.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {rotina.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      className: 'col-medium',
      sortable: true,
      render: (rotina: RotinaAgendada) => new Date(rotina.created_at).toLocaleDateString('pt-BR')
    }
  ];

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchRotinas();
    addNotification('success', 'Rotina criada com sucesso!');
  };

  const handleFormCancel = () => {
    setShowForm(false);
  };

  const handleEditFormSuccess = () => {
    console.log('🎉 Formulário de edição foi salvo com sucesso, recarregando dados...');
    setShowEditForm(false);
    setSelectedRoutine(null);
    fetchRotinas(); // Recarregar dados
    addNotification('success', 'Rotina atualizada com sucesso!');
  };

  const handleEditFormCancel = () => {
    setShowEditForm(false);
    setSelectedRoutine(null);
  };

  const handleTopoActions = async (action: string, selectedItems: RotinaAgendada[]) => {
    if (selectedItems.length === 0) {
      addNotification('warning', 'Selecione uma rotina para executar esta ação');
      return;
    }

    const rotina = selectedItems[0];

    try {
      switch (action) {
        case 'executar':
          await SchedulerService.executeRotina(rotina.id);
          addNotification('success', `Rotina "${rotina.nome}" executada com sucesso`);
          break;
        
        case 'editar':
          setSelectedRoutine(rotina);
          setShowEditForm(true);
          break;
        
        case 'deletar':
          if (window.confirm(`Tem certeza que deseja deletar a rotina "${rotina.nome}"?`)) {
            await SchedulerService.deleteRotina(rotina.id);
            addNotification('success', `Rotina "${rotina.nome}" deletada com sucesso`);
            fetchRotinas();
          }
          break;
        
        default:
          console.log('Ação não implementada:', action);
      }
    } catch (error: any) {
      console.error(`Erro ao ${action} rotina:`, error);
      addNotification('error', `Erro ao ${action} rotina: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <>
      <RotinaForm
        show={showForm}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
      
      {selectedRoutine && (
        <RotinaForm
          show={showEditForm}
          onSuccess={handleEditFormSuccess}
          onCancel={handleEditFormCancel}
          editData={selectedRoutine}
        />
      )}
      
      <DataTable
        columns={columns}
        data={getSortedData()}
        isLoading={isLoading}
        limit={limit}
        setLimit={setLimit}
        setPage={setPage}
        emptyMessage="Nenhuma rotina agendada encontrada"
        searchPlaceholder="Nome da rotina ou tipo"
        onSearch={setSearch}
        bulkActions={[
          {
            label: "Nova Rotina",
            action: (selectedItems) => {
              setShowForm(true);
            }
          },
          {
            label: "Executar",
            action: (selectedItems) => handleTopoActions('executar', selectedItems)
          },
          {
            label: "Editar",
            action: (selectedItems) => handleTopoActions('editar', selectedItems)
          },
          {
            label: "Ver Logs",
            action: (selectedItems) => {
              setSelectedRoutineId(selectedItems[0].id);
              setSelectedRoutineName(selectedItems[0].nome);
              setShowLogs(true);
            }
          },
          {
            label: "Deletar",
            action: (selectedItems) => handleTopoActions('deletar', selectedItems)
          }
        ]}
        onSort={handleSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onRefresh={refreshRotinas}
      />

      {/* Modal de logs reutilizável e arrastável */}
      <LogsModal
        show={showLogs}
        onClose={() => setShowLogs(false)}
        routineId={selectedRoutineId}
        routineName={selectedRoutineName}
      />
    </>
  );
};

export default RotinasAgendadas;
