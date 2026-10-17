import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import DraggableModal from 'components/common/DraggableModal';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { Badge, FormField, LimparButton } from 'components/ui';
import { TableConfig } from 'components/tables/types';
import { auditoriaService, AuditoriaLog, AuditoriaFilters } from 'services/auditoriaService';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import AuditoriaDetalhesModal from 'components/modals/auditoria/AuditoriaDetalhesModal';
import { useLogsAuditoriaFormatters } from 'components/modals/logs/logsModal/hooks/useLogsAuditoriaFormatters';
import { formatAuditoriaListId } from 'utils/formatters';
import { getAuditoriaDetalheExibir } from 'utils/auditoriaOperacionalDetalhe';
import { useI18n } from 'contexts/I18nContext';
import { normalizeListPagination } from 'utils/pagination';

interface AuditoriaModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  variant?: 'erp';
}

const DEFAULT_SEARCH_FIELD = 'usuario_email';

const AuditoriaModal: React.FC<AuditoriaModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  variant = 'erp',
}) => {
  const { t } = useI18n();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditoriaLog | null>(null);
  const [acaoFilter, setAcaoFilter] = useState('');
  const [entidadeFilter, setEntidadeFilter] = useState('');

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    initialSearchField: DEFAULT_SEARCH_FIELD,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const { formatTimestamp, formatAcao, getAcaoBadgeVariant } = useLogsAuditoriaFormatters();

  const filters: AuditoriaFilters = useMemo(
    () => ({
      page: tableFilters.page,
      limit: tableFilters.limit,
      search: tableFilters.debouncedSearch || undefined,
      searchField: tableFilters.searchField || DEFAULT_SEARCH_FIELD,
      acao: acaoFilter || undefined,
      entidade: entidadeFilter || undefined,
      sortColumn: tableFilters.sortColumn,
      sortDirection: tableFilters.sortDirection,
    }),
    [
      tableFilters.page,
      tableFilters.limit,
      tableFilters.debouncedSearch,
      tableFilters.searchField,
      acaoFilter,
      entidadeFilter,
      tableFilters.sortColumn,
      tableFilters.sortDirection,
    ]
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auditoria-operacional', variant, filters],
    queryFn: async () => {
      const response = await auditoriaService.listOperacional(filters);
      if (!response.success) {
        throw new Error(response.message || CONTEXT_ERROR_MESSAGES.AUDIT_LOAD_ERROR);
      }
      return response.data;
    },
    enabled: show,
    retry: 1,
  });

  const auditoriaExibirDetalhe = useMemo(
    () => getAuditoriaDetalheExibir(selectedLog, showDetailsModal),
    [selectedLog, showDetailsModal]
  );

  const { selectedItem, handleSelectionChange, clearSelection } = useModalSelect<AuditoriaLog>();

  const handleViewDetails = useCallback((items: unknown[]) => {
    const item = items.length > 0 ? items[0] : null;
    if (item) {
      setSelectedLog(item as AuditoriaLog);
      setShowDetailsModal(true);
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    tableFilters.setSearch('');
    tableFilters.setSearchField(DEFAULT_SEARCH_FIELD);
    setAcaoFilter('');
    setEntidadeFilter('');
    tableFilters.setPage(1);
  }, [tableFilters]);

  const tableColumns: TableConfig<AuditoriaLog>['columns'] = useMemo(
    () => [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '56px',
        sortValue: (log: AuditoriaLog) => log.operacional_id ?? String(log.id),
        render: (log: AuditoriaLog) => {
          const { display, title } = formatAuditoriaListId(log);
          return (
            <span className="small text-muted" title={title}>
              {display}
            </span>
          );
        },
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
          <span className="small">{log.usuario_nome || '—'}</span>
        ),
      },
      {
        key: 'ip_address',
        label: t('audit.ip'),
        sortable: true,
        width: '120px',
        render: (log: AuditoriaLog) => (
          <span className="small text-muted">{log.ip_address || '—'}</span>
        ),
      },
      {
        key: 'acao',
        label: t('table.action'),
        sortable: true,
        render: (log: AuditoriaLog) => (
          <Badge variant={getAcaoBadgeVariant(log.acao)}>{formatAcao(log.acao)}</Badge>
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
        key: 'usuario_email',
        label: t('audit.user'),
        sortable: true,
        width: '180px',
        render: (log: AuditoriaLog) => (
          <span className="small">{log.usuario_email || '—'}</span>
        ),
      },
      {
        key: 'metodo_http',
        label: t('audit.method'),
        sortable: true,
        width: '80px',
        render: (log: AuditoriaLog) => (
          <code className="text-primary small">{log.metodo_http || '—'}</code>
        ),
      },
      {
        key: 'rota',
        label: t('audit.route'),
        sortable: true,
        width: '200px',
        render: (log: AuditoriaLog) => <span className="small">{log.rota || '—'}</span>,
      },
    ],
    [t, formatTimestamp, formatAcao, getAcaoBadgeVariant]
  );

  const pagination = useMemo(
    () =>
      normalizeListPagination(
        data?.pagination && typeof data.pagination === 'object' ? data.pagination : undefined,
        tableFilters.page,
        tableFilters.limit
      ),
    [data?.pagination, tableFilters.page, tableFilters.limit]
  );

  const acaoFilterOptions = useMemo(
    () => [
      { value: '', label: t('audit.actions.all') },
      { value: 'create', label: t('audit.actions.create') },
      { value: 'update', label: t('audit.actions.update') },
      { value: 'delete', label: t('audit.actions.delete') },
      { value: 'login', label: t('audit.actions.login') },
      { value: 'logout', label: t('audit.actions.logout') },
      { value: 'executar', label: t('audit.actions.executar') },
    ],
    [t]
  );

  const entidadeFilterOptions = useMemo(
    () => [
      { value: '', label: t('audit.entities.all') },
      { value: 'Cliente', label: t('table.client') },
      { value: 'Plano', label: t('table.plan') },
      { value: 'Contrato', label: t('table.contract') },
      { value: 'Usuario', label: t('audit.user') },
      { value: 'Titulo', label: t('form.title') },
      { value: 'Banco', label: t('table.bank') },
      { value: 'ScheduledRoutine', label: t('modal.scheduledRoutine') },
      { value: 'Agent', label: t('modal.agents') },
      { value: 'SshDevice', label: t('modal.sshDevices') },
      { value: 'SshDeviceBackup', label: t('sshDevice.manualBackup') },
    ],
    [t]
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: t('table.id') },
      { key: 'usuario_email', label: t('emailServer.userEmail') },
      { key: 'usuario_nome', label: t('audit.user') },
      { key: 'acao', label: t('table.action') },
      { key: 'entidade', label: t('audit.entity') },
      { key: 'ip_address', label: t('audit.ip') },
      { key: 'rota', label: t('audit.route') },
      { key: 'timestamp', label: t('audit.timestamp') },
    ],
    [t]
  );

  const filterControls = useMemo(
    () => (
      <div className="d-flex flex-nowrap align-items-center small filter-compact gap-2">
        <FormField
          name="auditoria_acao_filter"
          type="select"
          size="sm"
          label={t('table.action')}
          value={acaoFilter}
          options={acaoFilterOptions}
          onChange={(value) => {
            setAcaoFilter(String(value ?? ''));
            tableFilters.setPage(1);
          }}
        />
        <FormField
          name="auditoria_entidade_filter"
          type="select"
          size="sm"
          label={t('audit.entity')}
          value={entidadeFilter}
          options={entidadeFilterOptions}
          onChange={(value) => {
            setEntidadeFilter(String(value ?? ''));
            tableFilters.setPage(1);
          }}
        />
        <LimparButton type="button" size="sm" className="table-toolbar-btn h-input-compact" onClick={handleClearFilters} />
      </div>
    ),
    [
      acaoFilter,
      acaoFilterOptions,
      entidadeFilter,
      entidadeFilterOptions,
      handleClearFilters,
      t,
      tableFilters,
    ]
  );

  const modalData = useMemo(() => data?.data ?? [], [data?.data]);

  const tablePanel = (
    <EmbeddedTablePanel<AuditoriaLog>
      config={{
        columns: tableColumns,
        data: modalData,
        loading: isLoading,
        searchable: true,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchField: tableFilters.searchField || DEFAULT_SEARCH_FIELD,
        searchFields,
        sortable: true,
        sortColumn: tableFilters.sortColumn,
        sortDirection: tableFilters.sortDirection,
        striped: true,
        hover: true,
        responsive: true,
        selectable: true,
        multiSelect: false,
        customControls: filterControls,
        bulkActions: [
          {
            key: 'ver-detalhes',
            label: t('audit.viewDetails'),
            variant: 'primary',
            requiresSelection: true,
            disabled: (items) => items.length === 0 && !selectedItem,
            onClick: (items) => {
              const item = items.length > 0 ? items[0] : selectedItem;
              if (item) handleViewDetails([item]);
            },
          },
        ],
        emptyMessage: t('logs.executionEmpty'),
        pagination,
      }}
      tableId={`auditoria-modal-table-${variant}`}
      onSelectionChange={(items) => handleSelectionChange(items as AuditoriaLog[])}
      onRefresh={() => refetch()}
      onPageChange={(page) => tableFilters.setPage(page)}
      onPageSizeChange={(limit) => tableFilters.setLimit(limit)}
      onSort={(column, direction) => tableFilters.setSort(column, direction)}
      onSearch={(search, field) => {
        tableFilters.setSearch(search);
        if (field) tableFilters.setSearchField(field);
        tableFilters.setPage(1);
      }}
      onSearchFieldChange={(field) => {
        tableFilters.setSearchField(field);
        tableFilters.setPage(1);
      }}
      search={tableFilters.search}
    />
  );

  const auditoriaDetalhesModal = (
    <AuditoriaDetalhesModal
      show={showDetailsModal}
      onClose={() => {
        setShowDetailsModal(false);
        setSelectedLog(null);
      }}
      detalhe={auditoriaExibirDetalhe}
      modalId="auditoria-detalhes"
      showEmpresaColumn={false}
      showClienteColumn={false}
    />
  );

  if (skipWrapper) {
    return (
      <>
        {tablePanel}
        {auditoriaDetalhesModal}
      </>
    );
  }

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
        className="no-padding"
        modalId="auditoria-modal"
      >
        {tablePanel}
      </DraggableModal>
      {auditoriaDetalhesModal}
    </>
  );
};

export default AuditoriaModal;
