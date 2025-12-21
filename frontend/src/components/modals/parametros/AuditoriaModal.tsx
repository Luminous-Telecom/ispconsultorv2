import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import { Table } from '../../tables';
import { auditoriaService, AuditoriaLog, AuditoriaFilters } from '@/services/auditoriaService';
import { formatDateTime } from '@/utils/formatters';

interface AuditoriaModalProps {
  show: boolean;
  onClose: () => void;
}

const AuditoriaModal: React.FC<AuditoriaModalProps> = ({ show, onClose }) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState('');
  const [acaoFilter, setAcaoFilter] = useState<string>('');
  const [entidadeFilter, setEntidadeFilter] = useState<string>('');

  const filters: AuditoriaFilters = useMemo(() => ({
    page,
    limit,
    search: search || undefined,
    acao: acaoFilter || undefined,
    entidade: entidadeFilter || undefined
  }), [page, limit, search, acaoFilter, entidadeFilter]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auditoria', filters],
    queryFn: async () => {
      const response = await auditoriaService.list(filters);
      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar logs de auditoria');
      }
      // response.data já é PaginatedResponse<AuditoriaLog>
      return response.data;
    },
    retry: 1
  });


  const formatAcao = (acao: string) => {
    const acoes: Record<string, string> = {
      create: 'Criar',
      update: 'Atualizar',
      delete: 'Excluir',
      login: 'Login',
      logout: 'Logout',
      export: 'Exportar',
      import: 'Importar'
    };
    return acoes[acao] || acao;
  };

  const getAcaoBadgeClass = (acao: string) => {
    const classes: Record<string, string> = {
      create: 'success',
      update: 'primary',
      delete: 'danger',
      login: 'info',
      logout: 'secondary',
      export: 'warning',
      import: 'warning'
    };
    return classes[acao] || 'secondary';
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDateTime(new Date(timestamp));
    } catch {
      return timestamp;
    }
  };

  const columns = useMemo(() => [
    {
      key: 'id',
      label: 'ID',
      sortable: false,
      width: '80px',
      render: (log: AuditoriaLog) => (
        <span className="text-muted small">{log.id.substring(0, 8)}...</span>
      )
    },
    {
      key: 'timestamp',
      label: 'Data/Hora',
      sortable: true,
      width: '150px',
      render: (log: AuditoriaLog) => (
        <span className="small">{formatTimestamp(log.timestamp)}</span>
      )
    },
    {
      key: 'acao',
      label: 'Ação',
      sortable: true,
      width: '100px',
      render: (log: AuditoriaLog) => (
        <span className={`badge bg-${getAcaoBadgeClass(log.acao)}`}>
          {formatAcao(log.acao)}
        </span>
      )
    },
    {
      key: 'entidade',
      label: 'Entidade',
      sortable: true,
      width: '120px',
      render: (log: AuditoriaLog) => (
        <span className="small">{log.entidade}</span>
      )
    },
    {
      key: 'usuario_email',
      label: 'Usuário',
      sortable: false,
      width: '200px',
      render: (log: AuditoriaLog) => (
        <div className="small">
          <div>{log.usuario_email || 'N/A'}</div>
          {log.usuario_nome && (
            <div className="text-muted">{log.usuario_nome}</div>
          )}
        </div>
      )
    },
    {
      key: 'rota',
      label: 'Rota',
      sortable: false,
      width: '200px',
      render: (log: AuditoriaLog) => (
        <div className="small">
          <div><code className="text-primary">{log.metodo_http}</code> {log.rota}</div>
          {log.ip_address && (
            <div className="text-muted">IP: {log.ip_address}</div>
          )}
        </div>
      )
    },
    {
      key: 'observacoes',
      label: 'Observações',
      sortable: false,
      render: (log: AuditoriaLog) => (
        <span className="small">{log.observacoes || '-'}</span>
      )
    }
  ], []);

  const handleViewDetails = (log: AuditoriaLog) => {
    // Criar modal ou expandir para mostrar diff
    const diff = log.dados_anteriores && log.dados_novos 
      ? JSON.stringify({ anterior: log.dados_anteriores, novo: log.dados_novos }, null, 2)
      : log.dados_novos 
        ? JSON.stringify(log.dados_novos, null, 2)
        : log.dados_anteriores
          ? JSON.stringify(log.dados_anteriores, null, 2)
          : 'Sem dados';

    const details = `
Ação: ${formatAcao(log.acao)}
Entidade: ${log.entidade}
ID da Entidade: ${log.entidade_id || 'N/A'}
Usuário: ${log.usuario_email || 'N/A'}
Data/Hora: ${formatTimestamp(log.timestamp)}
Rota: ${log.metodo_http} ${log.rota}
IP: ${log.ip_address || 'N/A'}
User-Agent: ${log.user_agent || 'N/A'}

Dados:
${diff}
    `;

    // Criar elemento temporário para copiar
    const textarea = document.createElement('textarea');
    textarea.value = details;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    alert('Detalhes copiados para a área de transferência!');
  };

  const sortedData = useMemo(() => {
    if (!data) return [];
    // data já é PaginatedResponse<AuditoriaLog>, então data.data é o array
    const logs = data.data || [];
    return [...logs].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [data]);

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Logs de Auditoria"
      size="xl"
    >
      <div className="p-3">
        {/* Filtros */}
        <div className="row mb-3">
          <div className="col-md-4">
            <label className="form-label small">Buscar</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Buscar por observações, rota, usuário..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small">Ação</label>
            <select
              className="form-select form-select-sm"
              value={acaoFilter}
              onChange={(e) => {
                setAcaoFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              <option value="create">Criar</option>
              <option value="update">Atualizar</option>
              <option value="delete">Excluir</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small">Entidade</label>
            <select
              className="form-select form-select-sm"
              value={entidadeFilter}
              onChange={(e) => {
                setEntidadeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              <option value="Cliente">Cliente</option>
              <option value="Plano">Plano</option>
              <option value="Contrato">Contrato</option>
              <option value="Usuario">Usuário</option>
              <option value="Titulo">Título</option>
            </select>
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <button
              className="btn btn-sm btn-outline-secondary w-100"
              onClick={() => {
                setSearch('');
                setAcaoFilter('');
                setEntidadeFilter('');
                setPage(1);
              }}
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Tabela */}
        <Table
          config={{
            columns,
            data: sortedData,
            loading: isLoading,
            searchable: false, // Já temos busca customizada
            sortable: true,
            striped: true,
            hover: true,
            responsive: true,
            emptyMessage: 'Nenhum log de auditoria encontrado',
            pagination: data?.pagination ? {
              current_page: data.pagination.current_page,
              last_page: data.pagination.last_page,
              per_page: data.pagination.per_page,
              total: data.pagination.total,
              from: data.pagination.from,
              to: data.pagination.to
            } : undefined,
            actions: [
              {
                key: 'view',
                label: 'Ver Detalhes',
                variant: 'info',
                onClick: (log: AuditoriaLog) => handleViewDetails(log),
                icon: 'bi-eye'
              }
            ]
          }}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          onRefresh={refetch}
        />
      </div>
    </DraggableModal>
  );
};

export default AuditoriaModal;

