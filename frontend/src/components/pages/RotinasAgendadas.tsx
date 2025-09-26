import React, { useState, useEffect } from 'react';
import { useNotification } from '../../hooks/useNotification';
import DataTable from '../common/DataTable';

interface RotinaAgendada {
  id: number;
  nome: string;
  tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'outros';
  descricao?: string;
  frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  hora_execucao: string;
  ativo: boolean;
  ultima_execucao?: string;
  proxima_execucao?: string;
  total_execucoes: number;
  execucoes_com_sucesso: number;
  execucoes_com_erro: number;
  created_at: string;
}

const RotinasAgendadas: React.FC = () => {
  const [rotinas, setRotinas] = useState<RotinaAgendada[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { addNotification } = useNotification();

  // Buscar rotinas
  const fetchRotinas = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(sortColumn && { sort: sortColumn, direction: sortDirection })
      });

      const response = await fetch(`/api/scheduler?${params}`);
      const data = await response.json();

      if (data.success) {
        setRotinas(data.data);
      } else {
        addNotification('error', 'Erro ao carregar rotinas agendadas');
      }
    } catch (error) {
      console.error('Erro ao buscar rotinas:', error);
      addNotification('error', 'Erro ao carregar rotinas agendadas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRotinas();
  }, [page, limit, search, sortColumn, sortDirection]);

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

  const handleToggleAtivo = async (rotina: RotinaAgendada) => {
    try {
      const response = await fetch(`/api/scheduler/${rotina.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ativo: !rotina.ativo })
      });

      const data = await response.json();

      if (data.success) {
        addNotification('success', data.message);
        fetchRotinas();
      } else {
        addNotification('error', data.error || 'Erro ao alterar status da rotina');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      addNotification('error', 'Erro ao alterar status da rotina');
    }
  };

  const handleExecutar = async (rotina: RotinaAgendada) => {
    if (!window.confirm(`Tem certeza que deseja executar a rotina "${rotina.nome}" agora?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/scheduler/${rotina.id}/execute`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        addNotification('success', data.message);
        fetchRotinas();
      } else {
        addNotification('error', data.error || 'Erro ao executar rotina');
      }
    } catch (error) {
      console.error('Erro ao executar rotina:', error);
      addNotification('error', 'Erro ao executar rotina');
    }
  };

  const handleDeletar = async (rotina: RotinaAgendada) => {
    if (!window.confirm(`Tem certeza que deseja excluir a rotina "${rotina.nome}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/scheduler/${rotina.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        addNotification('success', data.message);
        fetchRotinas();
      } else {
        addNotification('error', data.error || 'Erro ao excluir rotina');
      }
    } catch (error) {
      console.error('Erro ao excluir rotina:', error);
      addNotification('error', 'Erro ao excluir rotina');
    }
  };

  const handleTopoActions = (action: string, selectedItems: any[]) => {
    if (selectedItems.length === 0) return;
    
    const rotina = selectedItems[0];
    
    switch (action) {
      case 'editar':
        // Implementar edição
        addNotification('info', 'Funcionalidade de edição em desenvolvimento');
        break;
      case 'executar':
        handleExecutar(rotina);
        break;
      case 'deletar':
        handleDeletar(rotina);
        break;
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

  return (
    <>
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
            action: () => addNotification('info', 'Funcionalidade de criação em desenvolvimento')
          },
          {
            label: "Executar",
            action: (selectedItems) => handleTopoActions('executar', selectedItems)
          },
          {
            label: "Deletar",
            action: (selectedItems) => handleTopoActions('deletar', selectedItems)
          }
        ]}
        onSort={handleSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
      />
    </>
  );
};

export default RotinasAgendadas;
