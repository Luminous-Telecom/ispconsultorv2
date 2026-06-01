import React, { useMemo } from 'react';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import type { AuditoriaLog } from 'services/auditoriaService';
import type { UseTableFiltersReturn } from 'hooks/useTableFilters';
import type { SaasEmpresaTabId, SaasEmpresaTranslateFn } from '../types';
import { buildLogsColumns, buildLogsSearchFields } from '../saasEmpresaTableColumns';

interface LogsSectionProps {
  empresaId: number;
  logsData: {
    data?: AuditoriaLog[];
    pagination?: Record<string, unknown>;
  } | undefined;
  logsTf: UseTableFiltersReturn;
  activeTab: SaasEmpresaTabId;
  t: SaasEmpresaTranslateFn;
  onRefresh: () => void;
  onViewLog: (log: AuditoriaLog) => void;
}

const LogsSection: React.FC<LogsSectionProps> = ({
  empresaId,
  logsData,
  logsTf,
  activeTab,
  t,
  onRefresh,
  onViewLog,
}) => {
  const columns = useMemo(() => buildLogsColumns(t), [t]);
  const searchFields = useMemo(() => buildLogsSearchFields(t), [t]);

  return (
    <EmbeddedTablePanel
      key={`saas-logs-${empresaId}`}
      title="Logs"
      config={{
        columns,
        data: (logsData?.data as AuditoriaLog[]) ?? [],
        loading: activeTab === 'logs' && !logsData,
        emptyMessage: 'Nenhum log encontrado para este tenant',
        searchable: true,
        searchPlaceholder: '',
        searchField: logsTf.searchField || 'timestamp',
        searchFields,
        sortable: true,
        sortColumn: logsTf.sortColumn,
        sortDirection: logsTf.sortDirection,
        striped: true,
        hover: true,
        responsive: true,
        selectable: true,
        multiSelect: false,
        bulkActions: [
          {
            key: 'visualizar',
            label: t('audit.viewDetails'),
            variant: 'primary' as const,
            disabled: (s: AuditoriaLog[]) => s.length === 0,
            onClick: (s: AuditoriaLog[]) => { if (s[0]) onViewLog(s[0]); },
          },
        ],
        pagination: logsData?.pagination
          ? {
              current_page: (logsData.pagination as { current_page?: number }).current_page ?? 1,
              last_page: (logsData.pagination as { last_page?: number }).last_page ?? 1,
              per_page: (logsData.pagination as { per_page?: number }).per_page ?? 20,
              total: (logsData.pagination as { total?: number }).total ?? 0,
              from: (logsData.pagination as { from?: number }).from,
              to: (logsData.pagination as { to?: number }).to,
            }
          : undefined,
        className: 'no-padding',
      }}
      onRefresh={onRefresh}
      onSort={logsTf.setSort}
      onSearch={(s, f) => { logsTf.setSearch(s); if (f) logsTf.setSearchField(f); }}
      onSearchFieldChange={(f) => logsTf.setSearchField(f)}
      search={logsTf.search}
      onPageChange={(p) => logsTf.setPage(p)}
      onPageSizeChange={(l) => logsTf.setLimit(l)}
      onRowDoubleClick={(log) => onViewLog(log)}
    />
  );
};

export default LogsSection;
