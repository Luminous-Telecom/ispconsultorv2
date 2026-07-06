import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DraggableModal from './DraggableModal';
import EmbeddedTablePanel from './EmbeddedTablePanel';
import DetailFieldGrid, { type DetailFieldItem } from './DetailFieldGrid';
import { Badge, FormField, Loading, TableFilterCheckbox } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { useTableFilters } from 'hooks/useTableFilters';
import { useModalSelect } from 'hooks/useModalSelect';
import { createSchedulerService } from 'services/createSchedulerService';
import type { RoutineExecutionLog } from 'types/entities';
import type { BadgeVariant } from 'components/ui/Badge';
import { TableConfig } from 'components/tables/types';
import { formatDateTime } from 'utils/formatters';

interface RotinaLogsModalProps {
  show: boolean;
  onClose: () => void;
  routineId: number | null;
  routineName?: string;
  /** API do agendador ERP (`/scheduler`) ou SaaS (`/saas/scheduler`). */
  variant?: 'erp' | 'saas';
}

const STATUS_VARIANT: Record<RoutineExecutionLog['status'], BadgeVariant> = {
  sucesso: 'success',
  erro: 'danger',
  executando: 'warning',
};

function formatResultado(value: RoutineExecutionLog['resultado']): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

const RotinaLogsModal: React.FC<RotinaLogsModalProps> = ({
  show,
  onClose,
  routineId,
  routineName = 'Rotina',
  variant = 'saas',
}) => {
  const { t } = useI18n();
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [selectedLog, setSelectedLog] = useState<RoutineExecutionLog | null>(null);
  const { selectedItem, handleSelectionChange } = useModalSelect<RoutineExecutionLog>();

  const schedulerService = useMemo(
    () => createSchedulerService(variant === 'saas' ? '/saas/scheduler' : '/scheduler', { hasLogs: true }),
    [variant]
  );

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 10,
    initialSortColumn: 'data_inicio',
    initialSortDirection: 'desc',
    searchDebounceMs: 0,
    resetPageOnFilterChange: true,
  });

  const { data: logsResponse, isLoading, refetch } = useQuery({
    queryKey: ['scheduler-routine-logs', variant, routineId],
    queryFn: async () => {
      if (!routineId || !schedulerService.getLogs) return [];
      const response = await schedulerService.getLogs(routineId);
      return response.data ?? [];
    },
    enabled: show && !!routineId,
    staleTime: 0,
  });

  const logs = logsResponse ?? [];

  useEffect(() => {
    if (!show) {
      setShowOnlyErrors(false);
      setSelectedLog(null);
    }
  }, [show]);

  const statusLabel = useCallback(
    (status: RoutineExecutionLog['status']) => {
      const map: Record<RoutineExecutionLog['status'], string> = {
        sucesso: t('logs.status.success'),
        erro: t('logs.status.error'),
        executando: t('logs.status.executing'),
      };
      return map[status] ?? status;
    },
    [t]
  );

  const filterLogsBySearch = useCallback(
    (items: RoutineExecutionLog[], search: string) => {
      if (!search.trim()) return items;
      const searchLower = search.toLowerCase();
      return items.filter((log) => {
        const statusMatch = log.status.toLowerCase().includes(searchLower);
        const errorMatch = log.erro?.toLowerCase().includes(searchLower) ?? false;
        const resultMatch = formatResultado(log.resultado).toLowerCase().includes(searchLower);
        const dateMatch = log.data_inicio ? formatDateTime(log.data_inicio).includes(search) : false;
        return statusMatch || errorMatch || resultMatch || dateMatch;
      });
    },
    []
  );

  const getSortedLogs = useCallback(
    (items: RoutineExecutionLog[]) => {
      const column = tableFilters.sortColumn;
      if (!column) return items;

      return [...items].sort((a, b) => {
        let aValue: string | number = a[column as keyof RoutineExecutionLog] as string | number;
        let bValue: string | number = b[column as keyof RoutineExecutionLog] as string | number;

        if (column === 'data_inicio') {
          aValue = aValue ? new Date(aValue as string).getTime() : 0;
          bValue = bValue ? new Date(bValue as string).getTime() : 0;
        } else if (column === 'duracao_ms') {
          aValue = (aValue as number) || 0;
          bValue = (bValue as number) || 0;
        } else if (column === 'status') {
          const statusOrder = { erro: 0, executando: 1, sucesso: 2 };
          aValue = statusOrder[aValue as keyof typeof statusOrder] ?? 3;
          bValue = statusOrder[bValue as keyof typeof statusOrder] ?? 3;
        }

        if (aValue == null) aValue = '';
        if (bValue == null) bValue = '';

        if (aValue < bValue) return tableFilters.sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return tableFilters.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    },
    [tableFilters.sortColumn, tableFilters.sortDirection]
  );

  const filteredLogs = useMemo(() => {
    const searched = filterLogsBySearch(logs, tableFilters.search);
    const errorFiltered = searched.filter((log) => !showOnlyErrors || log.status === 'erro');
    return getSortedLogs(errorFiltered);
  }, [logs, tableFilters.search, showOnlyErrors, filterLogsBySearch, getSortedLogs]);

  const pagination = useMemo(() => {
    const total = filteredLogs.length;
    const perPage = tableFilters.limit;
    const lastPage = Math.max(1, Math.ceil(total / perPage) || 1);
    const currentPage = Math.min(tableFilters.page, lastPage);
    const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
    const to = Math.min(currentPage * perPage, total);
    return {
      current_page: currentPage,
      last_page: lastPage,
      per_page: perPage,
      total,
      from,
      to,
    };
  }, [filteredLogs.length, tableFilters.limit, tableFilters.page]);

  const paginatedLogs = useMemo(() => {
    const start = (pagination.current_page - 1) * pagination.per_page;
    return filteredLogs.slice(start, start + pagination.per_page);
  }, [filteredLogs, pagination.current_page, pagination.per_page]);

  const handleViewDetails = useCallback(
    (items: unknown[]) => {
      const item = items.length > 0 ? items[0] : selectedItem;
      if (item) setSelectedLog(item as RoutineExecutionLog);
    },
    [selectedItem]
  );

  const columns = useMemo(
    (): TableConfig<RoutineExecutionLog>['columns'] => [
      {
        key: 'status',
        label: t('table.status'),
        sortable: true,
        width: '100px',
        render: (log) => (
          <Badge variant={STATUS_VARIANT[log.status]} pill>
            {statusLabel(log.status)}
          </Badge>
        ),
      },
      {
        key: 'data_inicio',
        label: t('audit.timestamp'),
        sortable: true,
        width: '150px',
        render: (log) => (
          <span className="small">{log.data_inicio ? formatDateTime(log.data_inicio) : '—'}</span>
        ),
      },
      {
        key: 'duracao_ms',
        label: t('logs.duration'),
        sortable: true,
        width: '90px',
        render: (log) => (
          <span className="small">{log.duracao_ms != null ? `${log.duracao_ms}ms` : '—'}</span>
        ),
      },
      {
        key: 'resultado',
        label: t('logs.result'),
        sortable: false,
        render: (log) => {
          if (log.resultado) {
            return <span className="small text-muted">{formatResultado(log.resultado)}</span>;
          }
          if (log.erro) {
            return <span className="small text-danger">{log.erro}</span>;
          }
          return '—';
        },
      },
    ],
    [t, statusLabel]
  );

  const detailFields = useMemo((): DetailFieldItem[] => {
    if (!selectedLog) return [];
    const fields: DetailFieldItem[] = [
      {
        label: t('table.status'),
        value: statusLabel(selectedLog.status),
        inputClassName: selectedLog.status === 'erro' ? 'text-danger' : 'text-success',
      },
      {
        label: t('audit.timestamp'),
        value: selectedLog.data_inicio ? formatDateTime(selectedLog.data_inicio) : '—',
      },
      {
        label: t('logs.duration'),
        value: selectedLog.duracao_ms != null ? `${selectedLog.duracao_ms}ms` : '—',
      },
    ];
    if (selectedLog.resultado) {
      fields.push({ label: t('logs.result'), value: formatResultado(selectedLog.resultado) });
    }
    if (selectedLog.erro) {
      fields.push({
        label: t('history.error'),
        value: selectedLog.erro,
        inputClassName: 'text-danger',
      });
    }
    return fields;
  }, [selectedLog, statusLabel, t]);

  const errorFilterControl =
    logs.some((log) => log.status === 'erro') ? (
      <TableFilterCheckbox
        id="rotina-logs-show-only-errors"
        name="showOnlyErrors"
        label={t('logs.showOnlyErrors')}
        checked={showOnlyErrors}
        onChange={(checked) => {
          setShowOnlyErrors(checked);
          tableFilters.setPage(1);
        }}
      />
    ) : undefined;

  const tableContent = (
    <EmbeddedTablePanel<RoutineExecutionLog>
      config={{
        columns,
        data: paginatedLogs,
        loading: isLoading,
        searchable: true,
        searchPlaceholder: t('logs.executionSearch'),
        searchFields: [
          { key: 'status', label: t('table.status') },
          { key: 'erro', label: t('history.error') },
          { key: 'resultado', label: t('logs.result') },
        ],
        sortable: true,
        sortColumn: tableFilters.sortColumn,
        sortDirection: tableFilters.sortDirection,
        striped: true,
        hover: true,
        responsive: true,
        selectable: true,
        multiSelect: false,
        customControls: errorFilterControl,
        bulkActions: [
          {
            key: 'ver-detalhes',
            label: t('audit.viewDetails'),
            variant: 'primary',
            requiresSelection: true,
            onClick: handleViewDetails,
          },
        ],
        emptyMessage: t('logs.executionEmpty'),
        pagination,
      }}
      tableId={`rotina-logs-${variant}`}
      onSelectionChange={(items) => handleSelectionChange(items as RoutineExecutionLog[])}
      onRefresh={() => refetch()}
      onPageChange={tableFilters.setPage}
      onPageSizeChange={tableFilters.setLimit}
      onSort={tableFilters.setSort}
      onSearch={(search) => {
        tableFilters.setSearch(search);
        tableFilters.setPage(1);
      }}
      search={tableFilters.search}
    />
  );

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={t('logs.executionTitle', { name: routineName })}
        size="xl"
        className="no-padding"
        modalId="rotina-logs-modal"
      >
        {isLoading && logs.length === 0 ? (
          <Loading variant="modal" />
        ) : !isLoading && logs.length === 0 ? (
          <div className="form-modal-simple">
            <p className="text-muted mb-1">{t('logs.executionEmpty')}</p>
            <p className="form-helper-message">{t('logs.executionEmptyHint')}</p>
          </div>
        ) : (
          tableContent
        )}
      </DraggableModal>

      {selectedLog && (
        <DraggableModal
          show={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={t('logs.detailsTitle')}
          size="lg"
          modalId="rotina-log-details-modal"
        >
          <div className="form-modal-simple logs-auditoria-details">
            <DetailFieldGrid fields={detailFields} />
            {selectedLog.stack_trace ? (
              <div className="mt-3">
                <FormField
                  name="stack_trace"
                  type="textarea"
                  label={t('logs.stackTrace')}
                  value={selectedLog.stack_trace}
                  onChange={() => undefined}
                  rows={Math.min(12, Math.max(4, selectedLog.stack_trace.split('\n').length + 1))}
                  size="sm"
                  readOnly
                  className="text-danger font-monospace"
                />
              </div>
            ) : null}
          </div>
        </DraggableModal>
      )}
    </>
  );
};

export default RotinaLogsModal;
