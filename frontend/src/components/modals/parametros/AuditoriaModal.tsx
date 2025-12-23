import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useListModal } from '@/hooks/useListModal';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useTableFilters } from '@/hooks/useTableFilters';
import ListModal from '@/components/common/ListModal';
import DraggableModal from '@/components/common/DraggableModal';
import { auditoriaService, AuditoriaLog, AuditoriaFilters } from '@/services/auditoriaService';
import { formatDateTime } from '@/utils/formatters';

interface AuditoriaModalProps {
  show: boolean;
  onClose: () => void;
}

const AuditoriaModal: React.FC<AuditoriaModalProps> = ({ show, onClose }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditoriaLog | null>(null);

  // Hook unificado para filtros, busca e paginação
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const [acaoFilter, setAcaoFilter] = useState<string>('');
  const [entidadeFilter, setEntidadeFilter] = useState<string>('');

  const filters: AuditoriaFilters = useMemo(() => ({
    page: tableFilters.page,
    limit: tableFilters.limit,
    search: tableFilters.search || undefined,
    acao: acaoFilter || undefined,
    entidade: entidadeFilter || undefined
  }), [tableFilters.page, tableFilters.limit, tableFilters.search, acaoFilter, entidadeFilter]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auditoria', filters],
    queryFn: async () => {
      const response = await auditoriaService.list(filters);
      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar logs de auditoria');
      }
      return response.data;
    },
    retry: 1
  });

  // Usar hook customizado para gerenciar seleção
  const {
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<AuditoriaLog>();

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

  // Configurar modal centralizado
  const modal = useListModal({
    title: 'Logs de Auditoria',
    columns: [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '80px',
        render: (log: AuditoriaLog) => (
          <span className="text-muted small">{String(log.id).substring(0, 8)}...</span>
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
            <div><code className="text-primary">{log.metodo_http || 'N/A'}</code> {log.rota || 'N/A'}</div>
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
    ]
  });

  const handleViewDetails = (log: AuditoriaLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const pagination = data?.pagination ? {
    current_page: data.pagination.current_page,
    last_page: data.pagination.last_page,
    per_page: data.pagination.per_page,
    total: data.pagination.total,
    from: data.pagination.from,
    to: data.pagination.to
  } : {
    current_page: 1,
    last_page: 1,
    per_page: tableFilters.limit,
    total: 0,
    from: 0,
    to: 0
  };

  // Bulk actions
  const bulkActions = [
    {
      label: 'Ver Detalhes',
      variant: 'primary' as const,
      disabled: (selectedItems: AuditoriaLog[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: AuditoriaLog[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          handleViewDetails(item);
        }
      }
    }
  ];

  // Filtros customizados
  const customFilters = (
    <div className="row mb-3">
      <div className="col-md-4">
        <label className="form-label small">Buscar</label>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Buscar por observações, rota, usuário..."
          value={tableFilters.search}
          onChange={(e) => {
            tableFilters.setSearch(e.target.value);
            tableFilters.setPage(1);
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
            tableFilters.setPage(1);
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
            tableFilters.setPage(1);
          }}
        >
          <option value="">Todas</option>
          <option value="Cliente">Cliente</option>
          <option value="Plano">Plano</option>
          <option value="Contrato">Contrato</option>
          <option value="Usuario">Usuário</option>
          <option value="Titulo">Título</option>
          <option value="Banco">Banco</option>
          <option value="ScheduledRoutine">Rotina Agendada</option>
        </select>
      </div>
      <div className="col-md-2 d-flex align-items-end">
        <button
          className="btn btn-sm btn-outline-secondary w-100"
          onClick={() => {
            tableFilters.setSearch('');
            setAcaoFilter('');
            setEntidadeFilter('');
            tableFilters.setPage(1);
          }}
        >
          Limpar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <DraggableModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        title="Logs de Auditoria"
        size="xl"
      >
        <div className="p-3">
          {customFilters}
          <div>
            <ListModal
              show={true}
              onClose={() => {}}
              config={modal.config}
              data={data?.data || []}
              loading={isLoading}
              selectedItems={selectedItem ? [selectedItem] : []}
              onSelectionChange={handleSelectionChange}
              search={tableFilters.search}
              onSearchChange={tableFilters.setSearch}
              pagination={pagination}
              onPageChange={tableFilters.setPage}
              limit={tableFilters.limit}
              onLimitChange={tableFilters.setLimit}
              refreshQueryFn={refetch}
              bulkActions={bulkActions}
              skipWrapper={true}
            />
          </div>
        </div>
      </DraggableModal>

      {/* Modal de Detalhes */}
      {selectedLog && (
        <DraggableModal
          show={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedLog(null);
          }}
          title="Detalhes do Log de Auditoria"
          size="lg"
        >
          <div className="p-3">
            <div className="mb-3">
              <h6 className="mb-2">Informações Gerais</h6>
              <div className="row g-2">
                <div className="col-md-6">
                  <small className="text-muted">Ação:</small><br />
                  <span className={`badge bg-${getAcaoBadgeClass(selectedLog.acao)}`}>
                    {formatAcao(selectedLog.acao)}
                  </span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">Entidade:</small><br />
                  <span>{selectedLog.entidade}</span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">ID da Entidade:</small><br />
                  <span>{selectedLog.entidade_id || 'N/A'}</span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">Data/Hora:</small><br />
                  <span>{formatTimestamp(selectedLog.timestamp)}</span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">Usuário:</small><br />
                  <span>{selectedLog.usuario_email || 'N/A'}</span>
                  {selectedLog.usuario_nome && (
                    <div className="text-muted small">{selectedLog.usuario_nome}</div>
                  )}
                </div>
                <div className="col-md-6">
                  <small className="text-muted">IP:</small><br />
                  <span>{selectedLog.ip_address || 'N/A'}</span>
                </div>
                {selectedLog.rota && (
                  <div className="col-md-12">
                    <small className="text-muted">Rota:</small><br />
                    <code>{selectedLog.metodo_http || 'N/A'} {selectedLog.rota}</code>
                  </div>
                )}
                {selectedLog.user_agent && (
                  <div className="col-md-12">
                    <small className="text-muted">User-Agent:</small><br />
                    <span className="small">{selectedLog.user_agent}</span>
                  </div>
                )}
                {selectedLog.observacoes && (
                  <div className="col-md-12">
                    <small className="text-muted">Observações:</small><br />
                    <span>{selectedLog.observacoes}</span>
                  </div>
                )}
              </div>
            </div>

            {(selectedLog.dados_anteriores || selectedLog.dados_novos) && (
              <div className="mb-3">
                <h6 className="mb-2">Dados</h6>
                <div className="card">
                  <div className="card-body" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <pre 
                      className="mb-0" 
                      style={{ 
                        fontSize: '0.875rem', 
                        maxHeight: '400px', 
                        overflow: 'auto',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        padding: '1rem',
                        borderRadius: '0.25rem',
                        border: '1px solid var(--border-color)',
                        margin: 0
                      }}
                    >
                      {JSON.stringify(
                        selectedLog.dados_anteriores && selectedLog.dados_novos
                          ? { anterior: selectedLog.dados_anteriores, novo: selectedLog.dados_novos }
                          : selectedLog.dados_novos || selectedLog.dados_anteriores,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DraggableModal>
      )}
    </>
  );
};

export default AuditoriaModal;
