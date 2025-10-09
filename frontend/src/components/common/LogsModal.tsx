import React, { useState, useEffect } from 'react';
import DraggableModal from './DraggableModal';
import DataTable from './DataTable';

interface LogsModalProps {
  show: boolean;
  onClose: () => void;
  routineId: number | null;
  routineName?: string;
}

interface LogEntry {
  id: number;
  routine_id: number;
  status: 'sucesso' | 'erro' | 'executando';
  data_inicio: string;
  data_fim?: string;
  duracao_ms?: number;
  resultado?: string;
  erro?: string;
  stack_trace?: string;
  created_at: string;
  updated_at?: string;
  routine?: {
    nome: string;
    tipo: string;
  };
}

const LogsModal: React.FC<LogsModalProps> = ({
  show,
  onClose,
  routineId,
  routineName = 'Rotina'
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('data_inicio');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Função para ordenar logs
  const getSortedLogs = (logsData: LogEntry[]) => {
    if (!sortColumn) return logsData;
    
    return [...logsData].sort((a, b) => {
      let aValue: any = a[sortColumn as keyof LogEntry];
      let bValue: any = b[sortColumn as keyof LogEntry];
      
      // Tratamento especial para data_inicio
      if (sortColumn === 'data_inicio') {
        aValue = aValue ? new Date(aValue as string).getTime() : 0;
        bValue = bValue ? new Date(bValue as string).getTime() : 0;
      }
      
      // Tratamento especial para duracao_ms
      else if (sortColumn === 'duracao_ms') {
        aValue = (aValue as number) || 0;
        bValue = (bValue as number) || 0;
      }
      
      // Tratamento especial para status
      else if (sortColumn === 'status') {
        const statusOrder = { 'erro': 0, 'executando': 1, 'sucesso': 2 };
        aValue = statusOrder[aValue as keyof typeof statusOrder] ?? 3;
        bValue = statusOrder[bValue as keyof typeof statusOrder] ?? 3;
      }
      
      // Tratamento geral para valores undefined/null
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Função para lidar com ordenação dos logs
  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  // Buscar logs
  const fetchLogs = async () => {
    if (!routineId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/scheduler/logs/${routineId}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar logs quando o modal abrir
  useEffect(() => {
    if (show && routineId) {
      fetchLogs();
      // Reset paginação e busca quando abrir o modal
      setCurrentPage(1);
      setPageSize(10);
      setSearchTerm('');
    }
  }, [show, routineId]);

  // Função para filtrar logs por busca
  const filterLogsBySearch = (logsData: LogEntry[], search: string) => {
    if (!search.trim()) return logsData;
    
    const searchLower = search.toLowerCase();
    return logsData.filter((log: LogEntry) => {
      // Buscar em diferentes campos
      const statusMatch = log.status.toLowerCase().includes(searchLower);
      const errorMatch = log.erro?.toLowerCase().includes(searchLower) || false;
      const resultMatch = log.resultado?.toLowerCase().includes(searchLower) || false;
      const dateMatch = log.data_inicio ? new Date(log.data_inicio).toLocaleString('pt-BR').includes(search) : false;
      
      return statusMatch || errorMatch || resultMatch || dateMatch;
    });
  };

  // Filtrar logs por busca e erros
  const searchedLogs = filterLogsBySearch(logs, searchTerm);
  const filteredLogs = searchedLogs.filter((log: LogEntry) => !showOnlyErrors || log.status === 'erro');
  const sortedLogs = getSortedLogs(filteredLogs);
  
  // Calcular paginação
  const totalItems = sortedLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedLogs = sortedLogs.slice(startIndex, endIndex);
  
  // Configurar objeto de paginação
  const pagination = {
    from: startIndex + 1,
    to: Math.min(endIndex, totalItems),
    total: totalItems,
    current_page: currentPage,
    last_page: totalPages
  };

  // Funções para mudança de página e limite
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (limit: number) => {
    setPageSize(limit);
    setCurrentPage(1); // Reset para primeira página quando mudar o limite
  };

  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset para primeira página quando buscar
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={`Logs de Execução - ${routineName}`}
      size="xl"
    >
      {loading ? (
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-2">Carregando logs de execução...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center text-muted">
          <i className="bi bi-info-circle fs-1"></i>
          <p className="mt-2">Nenhum log encontrado</p>
          <small>Esta rotina ainda não foi executada ou os logs não estão disponíveis.</small>
        </div>
      ) : (
        <div>
          {/* Filtro para mostrar apenas erros */}
          {logs.some((log: LogEntry) => log.status === 'erro') && (
            <div className="mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="showOnlyErrors"
                  checked={showOnlyErrors}
                  onChange={(e) => setShowOnlyErrors(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="showOnlyErrors">
                  Mostrar apenas logs com erro
                </label>
              </div>
            </div>
          )}
          
          <DataTable
            data={paginatedLogs}
            columns={[
              {
                key: 'status',
                label: 'Status',
                sortable: true,
                render: (log: LogEntry) => (
                  <span className={`badge ${
                    log.status === 'sucesso' ? 'bg-success' :
                    log.status === 'erro' ? 'bg-danger' :
                    'bg-warning'
                  }`}>
                    {log.status === 'sucesso' ? 'Sucesso' :
                     log.status === 'erro' ? 'Erro' :
                     'Executando'}
                  </span>
                )
              },
              {
                key: 'data_inicio',
                label: 'Data/Hora',
                sortable: true,
                render: (log: LogEntry) => log.data_inicio ? new Date(log.data_inicio).toLocaleString('pt-BR') : '-'
              },
              {
                key: 'duracao_ms',
                label: 'Duração',
                sortable: true,
                render: (log: LogEntry) => log.duracao_ms ? `${log.duracao_ms}ms` : '-'
              },
              {
                key: 'resultado',
                label: 'Resultado',
                sortable: false,
                render: (log: LogEntry) => {
                  if (log.resultado) {
                    return (
                      <small className="text-muted">
                        {typeof log.resultado === 'string' 
                          ? log.resultado 
                          : JSON.stringify(log.resultado)}
                      </small>
                    );
                  } else if (log.erro) {
                    return (
                      <div>
                        <small className="text-danger">
                          {log.erro}
                        </small>
                        {log.stack_trace && (
                          <details className="mt-1">
                            <summary className="text-warning" style={{ cursor: 'pointer', fontSize: '0.7rem' }}>
                              Ver detalhes técnicos
                            </summary>
                            <pre className="text-danger mt-1" style={{ fontSize: '0.6rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {log.stack_trace}
                            </pre>
                          </details>
                        )}
                      </div>
                    );
                  }
                  return '-';
                }
              }
            ]}
            isLoading={loading}
            pagination={pagination}
            limit={pageSize}
            setLimit={handleLimitChange}
            setPage={handlePageChange}
            bulkActions={[]}
            onSearch={handleSearchChange}
            onSort={handleSort}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSelectionChange={() => {}}
            onRefresh={() => window.location.reload()}
          />
        </div>
      )}
    </DraggableModal>
  );
};

export default LogsModal;
