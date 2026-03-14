import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useTableFilters } from '@/hooks/useTableFilters';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { auditoriaService, AuditoriaLog, AuditoriaFilters } from '@/services/auditoriaService';
import { formatDateTime } from '@/utils/formatters';
import { useI18n } from '@/contexts/I18nContext';

export type LogsAuditoriaType =
  | 'usuarios'
  | 'agenda-tarefas'
  | 'webhook'
  | 'email'
  | 'whatsapp'
  | 'assinatura-digital'
  | 'acesso-sistema';

export const LOGS_AUDITORIA_CONFIG: Record<
  LogsAuditoriaType,
  { entidade?: string; acao?: string; search?: string; comUsuarioObrigatorio?: boolean; semUsuarioObrigatorio?: boolean; origemAuditoria?: string }
> = {
  usuarios: { comUsuarioObrigatorio: true },
  'agenda-tarefas': { origemAuditoria: 'agendador' },
  webhook: { origemAuditoria: 'webhook' },
  email: { entidade: 'ServidorEmail' },
  whatsapp: { entidade: 'ServidorWhatsApp' },
  'assinatura-digital': { entidade: 'AssinaturaDigital' },
  'acesso-sistema': { acao: 'login,logout' },
};

interface LogsAuditoriaModalProps {
  show: boolean;
  onClose: () => void;
  logType?: LogsAuditoriaType;
  skipWrapper?: boolean;
}

const LogsAuditoriaModal: React.FC<LogsAuditoriaModalProps> = ({
  show,
  onClose,
  logType = 'usuarios',
  skipWrapper = false,
}) => {
  const { t } = useI18n();
  const effectiveLogType = logType;
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditoriaLog | null>(null);
  const preset = useMemo(
    () => LOGS_AUDITORIA_CONFIG[effectiveLogType] || {},
    [effectiveLogType]
  );

  const tableFilters = useTableFilters({
    initialSearch: preset.search ?? '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const handleSearchChange = useCallback(
    (search: string, field?: string) => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
      tableFilters.setPage(1);
    },
    [tableFilters]
  );

  const filters: AuditoriaFilters = useMemo(
    () => ({
      page: tableFilters.page,
      limit: tableFilters.limit,
      search: tableFilters.search || preset.search || undefined,
      searchField: tableFilters.searchField || (tableFilters.search ? 'id' : undefined),
      acao: preset.acao,
      entidade: preset.entidade,
      comUsuarioObrigatorio: preset.comUsuarioObrigatorio,
      semUsuarioObrigatorio: preset.semUsuarioObrigatorio,
      origemAuditoria: preset.origemAuditoria,
      sortColumn: tableFilters.sortColumn,
      sortDirection: tableFilters.sortDirection,
    }),
    [
      tableFilters.page,
      tableFilters.limit,
      tableFilters.search,
      tableFilters.searchField,
      tableFilters.sortColumn,
      tableFilters.sortDirection,
      preset,
    ]
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auditoria-logs', effectiveLogType, filters],
    queryFn: async () => {
      const response = await auditoriaService.list(filters);
      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar logs');
      }
      return response.data;
    },
    retry: 1,
    enabled: show,
  });

  const { selectedItem, handleSelectionChange } = useModalSelect<AuditoriaLog>();

  const formatAcao = useCallback(
    (acao: string) => {
      const acoes: Record<string, string> = {
        create: t('audit.actions.create'),
        update: t('audit.actions.update'),
        delete: t('audit.actions.delete'),
        login: t('audit.actions.login'),
        logout: t('audit.actions.logout'),
        export: t('audit.actions.export'),
        import: t('audit.actions.import'),
        executar: t('audit.actions.executar'),
      };
      return acoes[acao] || acao;
    },
    [t]
  );

  const getAcaoBadgeClass = useCallback((acao: string) => {
    const classes: Record<string, string> = {
      create: 'success',
      update: 'primary',
      delete: 'danger',
      login: 'info',
      logout: 'secondary',
      export: 'warning',
      import: 'warning',
      executar: 'info',
    };
    return classes[acao] || 'secondary';
  }, []);

  const formatTimestamp = useCallback((timestamp: string) => {
    try {
      return formatDateTime(new Date(timestamp));
    } catch {
      return timestamp;
    }
  }, []);

  const tableColumns = useMemo(
    () => [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '42px',
        render: (log: AuditoriaLog) => (
          <span className="text-muted small">{String(log.id).substring(0, 8)}...</span>
        ),
      },
      {
        key: 'timestamp',
        label: t('audit.timestamp'),
        sortable: true,
        width: '150px',
        render: (log: AuditoriaLog) => (
          <span className="small">{formatTimestamp(log.timestamp)}</span>
        ),
      },
      {
        key: 'usuario_nome',
        label: t('table.name'),
        sortable: true,
        width: '150px',
        render: (log: AuditoriaLog) => (
          <span className="small">{log.usuario_nome || '-'}</span>
        ),
      },
      {
        key: 'usuario_email',
        label: t('audit.user'),
        sortable: true,
        width: '180px',
        render: (log: AuditoriaLog) => (
          <span className="small">{log.usuario_email || '-'}</span>
        ),
      },
      {
        key: 'ip_address',
        label: t('audit.ip'),
        sortable: true,
        width: '120px',
        render: (log: AuditoriaLog) => (
          <span className="small text-muted">{log.ip_address || '-'}</span>
        ),
      },
      {
        key: 'acao',
        label: t('table.action'),
        sortable: true,
        render: (log: AuditoriaLog) => (
          <span className={`badge bg-${getAcaoBadgeClass(log.acao)}`}>
            {formatAcao(log.acao)}
          </span>
        ),
      },
      {
        key: 'entidade',
        label: t('audit.entity'),
        sortable: true,
        width: '120px',
        render: (log: AuditoriaLog) => <span className="small">{log.entidade}</span>,
      },
      {
        key: 'observacoes',
        label: t('table.observations'),
        sortable: true,
        render: (log: AuditoriaLog) => (
          <span className="small">{log.observacoes || '-'}</span>
        ),
      },
    ],
    [t, formatAcao, getAcaoBadgeClass, formatTimestamp]
  );

  const handleViewDetails = useCallback((log: AuditoriaLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  }, []);

  const pagination = useMemo(() => {
    if (data?.pagination && typeof data.pagination === 'object') {
      const pag = data.pagination;
      const total = pag.total ?? 0;
      const perPage = pag.per_page ?? tableFilters.limit;
      const currentPage = pag.current_page ?? 1;
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
        from: pag.from ?? (currentPage - 1) * perPage + 1,
        to: pag.to ?? Math.min(currentPage * perPage, total),
      };
    }
    return {
      current_page: 1,
      last_page: 1,
      per_page: tableFilters.limit,
      total: 0,
      from: 0,
      to: 0,
    };
  }, [data?.pagination, tableFilters.limit]);

  const bulkActions = useMemo(
    () => [
      {
        label: t('audit.viewDetails'),
        variant: 'primary' as const,
        disabled: (selectedItems: AuditoriaLog[]) =>
          selectedItems.length === 0 && !selectedItem,
        action: (selectedItems: AuditoriaLog[]) => {
          const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
          if (item) handleViewDetails(item);
        },
      },
    ],
    [t, selectedItem, handleViewDetails]
  );

  const modalData = useMemo(() => data?.data || [], [data?.data]);

  const detailsModal = selectedLog && (
    <DraggableModal
      show={showDetailsModal}
      onClose={() => {
        setShowDetailsModal(false);
        setSelectedLog(null);
      }}
      title={t('audit.detailsTitle')}
      size="lg"
      modalId="logs-auditoria-details-modal"
    >
      <div className="p-3 logs-auditoria-details">
        <div className="mb-3">
          <div className="row g-2">
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('table.action')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={formatAcao(selectedLog.acao)}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('audit.entity')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={selectedLog.entidade}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('audit.timestamp')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={formatTimestamp(selectedLog.timestamp)}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('audit.user')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={selectedLog.usuario_email || 'N/A'}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('table.name')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={selectedLog.usuario_nome || '-'}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('audit.ip')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={selectedLog.ip_address || 'N/A'}
                readOnly
              />
            </div>
            {selectedLog.rota && (
              <div className="col-12">
                <label className="form-label small text-muted mb-1">{t('audit.route')}</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-secondary bg-opacity-10 font-monospace"
                  value={`${selectedLog.metodo_http || 'N/A'} ${selectedLog.rota}`}
                  readOnly
                />
              </div>
            )}
            {selectedLog.user_agent && (
              <div className="col-12">
                <label className="form-label small text-muted mb-1">{t('audit.userAgent')}</label>
                <textarea
                  className="form-control form-control-sm bg-secondary bg-opacity-10 small"
                  value={selectedLog.user_agent}
                  readOnly
                  rows={2}
                />
              </div>
            )}
            {selectedLog.observacoes && (
              <div className="col-12">
                <label className="form-label small text-muted mb-1">{t('table.observations')}</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-secondary bg-opacity-10"
                  value={selectedLog.observacoes}
                  readOnly
                />
              </div>
            )}
          </div>
        </div>
        {(selectedLog.dados_anteriores || selectedLog.dados_novos) && (
          <div className="mt-3">
            <h6 className="mb-2">{t('audit.data')}</h6>
            <textarea
              className="form-control font-monospace small bg-secondary bg-opacity-10"
              value={JSON.stringify(
                selectedLog.dados_anteriores && selectedLog.dados_novos
                  ? { anterior: selectedLog.dados_anteriores, novo: selectedLog.dados_novos }
                  : selectedLog.dados_novos || selectedLog.dados_anteriores,
                null,
                2
              )}
              readOnly
              rows={12}
              style={{ resize: 'none' }}
            />
          </div>
        )}
      </div>
    </DraggableModal>
  );

  const modalContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table
          title={t('audit.title')}
          config={{
            columns: tableColumns,
            data: modalData,
            loading: isLoading,
            searchable: true,
            searchPlaceholder: t('layout.searchPlaceholder'),
            searchFields: [
              { key: 'id', label: t('table.id') },
              { key: 'timestamp', label: t('audit.timestamp') },
              { key: 'usuario_nome', label: t('table.name') },
              { key: 'usuario_email', label: t('audit.user') },
              { key: 'ip_address', label: t('audit.ip') },
              { key: 'acao', label: t('table.action') },
              { key: 'entidade', label: t('audit.entity') },
              { key: 'observacoes', label: t('table.observations') },
              { key: 'rota', label: t('audit.route') },
            ],
              sortable: true,
              sortColumn: tableFilters.sortColumn,
              sortDirection: tableFilters.sortDirection,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              bulkActions: bulkActions.map((action) => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                onClick: action.action,
                disabled: action.disabled,
                variant: action.variant,
              })),
              emptyMessage: 'Nenhum log encontrado',
              pagination: pagination,
            }}
            tableId={`logs-auditoria-table-${effectiveLogType}`}
            onSelectionChange={(items) => handleSelectionChange(items)}
            onRefresh={refetch}
            onPageChange={(page) => {
              setTimeout(() => tableFilters.setPage(page), 0);
            }}
            onPageSizeChange={(limit) => {
              setTimeout(() => tableFilters.setLimit(limit), 0);
            }}
            onSort={(column, direction) => {
              setTimeout(() => tableFilters.setSort(column, direction), 0);
            }}
            onSearch={handleSearchChange}
            onSearchFieldChange={(field) => {
              setTimeout(() => tableFilters.setSearchField(field), 0);
            }}
            search={tableFilters.search}
            syncWithHeader={false}
          />
      </div>
    </div>
  );

  if (skipWrapper) {
    return (
      <>
        {modalContent}
        {detailsModal}
      </>
    );
  }

  return (
    <>
      <DraggableModal show={show} onClose={onClose} title={t('audit.title')} size="xl">
        {modalContent}
      </DraggableModal>
      {detailsModal}
    </>
  );
};

export default LogsAuditoriaModal;
