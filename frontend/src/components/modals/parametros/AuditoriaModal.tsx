import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useListModal } from '@/hooks/useListModal';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useTableFilters } from '@/hooks/useTableFilters';
import ListModal from '@/components/common/ListModal';
import DraggableModal from '@/components/common/DraggableModal';
import { auditoriaService, AuditoriaLog, AuditoriaFilters } from '@/services/auditoriaService';
import { formatDateTime } from '@/utils/formatters';
import { useI18n } from '@/contexts/I18nContext';

interface AuditoriaModalProps {
  show: boolean;
  onClose: () => void;
}

const AuditoriaModal: React.FC<AuditoriaModalProps> = ({ show, onClose }) => {
  const { t } = useI18n();
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

  const handleSearchChange = useCallback((value: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearch(value);
      tableFilters.setPage(1);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearch, tableFilters.setPage]);

  const handleClearFilters = useCallback(() => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearch('');
      setAcaoFilter('');
      setEntidadeFilter('');
      tableFilters.setPage(1);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearch, tableFilters.setPage]);

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
      create: t('audit.actions.create'),
      update: t('audit.actions.update'),
      delete: t('audit.actions.delete'),
      login: t('audit.actions.login'),
      logout: t('audit.actions.logout'),
      export: t('audit.actions.export'),
      import: t('audit.actions.import')
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
    title: t('audit.title'),
    columns: [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '42px',
        render: (log: AuditoriaLog) => (
          <span className="text-muted small">{String(log.id).substring(0, 8)}...</span>
        )
      },
      {
        key: 'timestamp',
        label: t('audit.timestamp'),
        sortable: true,
        width: '150px',
        render: (log: AuditoriaLog) => (
          <span className="small">{formatTimestamp(log.timestamp)}</span>
        )
      },
      {
        key: 'acao',
        label: t('table.action'),
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
        label: t('audit.entity'),
        sortable: true,
        width: '120px',
        render: (log: AuditoriaLog) => (
          <span className="small">{log.entidade}</span>
        )
      },
      {
        key: 'usuario_email',
        label: t('audit.user'),
        sortable: true,
        width: '180px',
        render: (log: AuditoriaLog) => (
          <span className="small">{log.usuario_email || 'N/A'}</span>
        )
      },
      {
        key: 'usuario_nome',
        label: t('table.name'),
        sortable: true,
        width: '150px',
        render: (log: AuditoriaLog) => (
          <span className="small text-muted">{log.usuario_nome || '-'}</span>
        )
      },
      {
        key: 'metodo_http',
        label: t('audit.method'),
        sortable: true,
        width: '80px',
        render: (log: AuditoriaLog) => (
          <code className="text-primary small">{log.metodo_http || '-'}</code>
        )
      },
      {
        key: 'rota',
        label: t('audit.route'),
        sortable: true,
        width: '200px',
        render: (log: AuditoriaLog) => (
          <span className="small">{log.rota || '-'}</span>
        )
      },
      {
        key: 'ip_address',
        label: t('audit.ip'),
        sortable: true,
        width: '120px',
        render: (log: AuditoriaLog) => (
          <span className="small text-muted">{log.ip_address || '-'}</span>
        )
      },
      {
        key: 'observacoes',
        label: t('table.observations'),
        sortable: true,
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

  const pagination = useMemo(() => {
    if (data?.pagination && typeof data.pagination === 'object') {
      const pag = data.pagination;
      const total = pag.total ?? 0;
      const perPage = pag.per_page ?? tableFilters.limit;
      const currentPage = pag.current_page ?? 1;
      
      // Calcular last_page se não estiver definido
      let lastPage = pag.last_page;
      if (!lastPage && total > 0) {
        lastPage = Math.max(1, Math.ceil(total / perPage));
      } else if (!lastPage) {
        lastPage = 1;
      }
      
      return {
        current_page: currentPage,
        last_page: lastPage,
        per_page: perPage,
        total: total,
        from: pag.from ?? ((currentPage - 1) * perPage) + 1,
        to: pag.to ?? Math.min(currentPage * perPage, total)
      };
    }
    return {
      current_page: 1,
      last_page: 1,
      per_page: tableFilters.limit,
      total: 0,
      from: 0,
      to: 0
    };
  }, [data?.pagination, tableFilters.limit]);

  // Bulk actions
  const bulkActions = [
    {
      label: t('audit.viewDetails'),
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
    <div className="row mb-1">
      <div className="col-md-4">
        <label className="form-label small">{t('buttons.search')}</label>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder=""
          value={tableFilters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>
      <div className="col-md-3">
        <label className="form-label small">{t('table.action')}</label>
        <select
          className="form-select form-select-sm"
          value={acaoFilter}
          onChange={(e) => {
            setAcaoFilter(e.target.value);
            tableFilters.setPage(1);
          }}
        >
          <option value="">{t('audit.actions.all')}</option>
          <option value="create">{t('audit.actions.create')}</option>
          <option value="update">{t('audit.actions.update')}</option>
          <option value="delete">{t('audit.actions.delete')}</option>
          <option value="login">{t('audit.actions.login')}</option>
          <option value="logout">{t('audit.actions.logout')}</option>
        </select>
      </div>
      <div className="col-md-3">
        <label className="form-label small">{t('audit.entity')}</label>
        <select
          className="form-select form-select-sm"
          value={entidadeFilter}
          onChange={(e) => {
            setEntidadeFilter(e.target.value);
            tableFilters.setPage(1);
          }}
        >
          <option value="">{t('audit.entities.all')}</option>
          <option value="Cliente">{t('table.client')}</option>
          <option value="Plano">{t('table.plan')}</option>
          <option value="Contrato">{t('table.contract')}</option>
          <option value="Usuario">{t('audit.user')}</option>
          <option value="Titulo">{t('form.title')}</option>
          <option value="Banco">{t('table.bank')}</option>
          <option value="ScheduledRoutine">{t('modal.scheduledRoutine')}</option>
        </select>
      </div>
      <div className="col-md-2 d-flex align-items-end">
        <button
          className="btn btn-sm btn-outline-primary w-100"
          onClick={handleClearFilters}
        >
          {t('buttons.clear')}
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
        title={t('audit.title')}
        size="xl"
      >
        <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
          <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
            {/* Filtros */}
            <div style={{ padding: '16px', paddingBottom: '8px', flexShrink: 0 }}>
              {customFilters}
            </div>
            {/* Tabela */}
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <ListModal
                show={true}
                onClose={() => {}}
                config={modal.config}
                data={data?.data || []}
                loading={isLoading}
                selectedItems={selectedItem ? [selectedItem] : []}
                onSelectionChange={handleSelectionChange}
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
          title={t('audit.detailsTitle')}
          size="lg"
        >
          <div style={{ padding: '16px' }}>
            <div className="mb-1">
              <h6 className="mb-1">{t('audit.generalInfo')}</h6>
              <div className="row g-1">
                <div className="col-md-6">
                  <small className="text-muted">{t('table.action')}:</small><br />
                  <span className={`badge bg-${getAcaoBadgeClass(selectedLog.acao)}`}>
                    {formatAcao(selectedLog.acao)}
                  </span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">{t('audit.entity')}:</small><br />
                  <span>{selectedLog.entidade}</span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">{t('audit.entityId')}:</small><br />
                  <span>{selectedLog.entidade_id || 'N/A'}</span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">{t('audit.timestamp')}:</small><br />
                  <span>{formatTimestamp(selectedLog.timestamp)}</span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">{t('audit.user')}:</small><br />
                  <span>{selectedLog.usuario_email || 'N/A'}</span>
                  {selectedLog.usuario_nome && (
                    <div className="text-muted small">{selectedLog.usuario_nome}</div>
                  )}
                </div>
                <div className="col-md-6">
                  <small className="text-muted">{t('audit.ip')}:</small><br />
                  <span>{selectedLog.ip_address || 'N/A'}</span>
                </div>
                {selectedLog.rota && (
                  <div className="col-md-12">
                    <small className="text-muted">{t('audit.route')}:</small><br />
                    <code>{selectedLog.metodo_http || 'N/A'} {selectedLog.rota}</code>
                  </div>
                )}
                {selectedLog.user_agent && (
                  <div className="col-md-12">
                    <small className="text-muted">{t('audit.userAgent')}:</small><br />
                    <span className="small">{selectedLog.user_agent}</span>
                  </div>
                )}
                {selectedLog.observacoes && (
                  <div className="col-md-12">
                    <small className="text-muted">{t('table.observations')}:</small><br />
                    <span>{selectedLog.observacoes}</span>
                  </div>
                )}
              </div>
            </div>

            {(selectedLog.dados_anteriores || selectedLog.dados_novos) && (
              <div className="mb-1">
                <h6 className="mb-1">{t('audit.data')}</h6>
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
