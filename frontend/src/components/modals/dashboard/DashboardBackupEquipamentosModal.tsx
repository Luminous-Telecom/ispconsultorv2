import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { useTableFilters } from 'hooks/useTableFilters';
import { useModalSelect } from 'hooks/useModalSelect';
import { formatDateTime } from 'utils/formatters';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import DetailFieldGrid, { DetailFieldItem } from 'components/common/DetailFieldGrid';
import FormField from 'components/ui/FormField';
import DraggableModal from 'components/common/DraggableModal';
import type { SortDirection, TableConfig } from 'components/tables/types';

export interface DashboardBackupEquipamentoItem {
  id: string;
  deviceId: string;
  deviceName: string;
  fileName: string | null;
  sizeBytes: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  detail: string | null;
}

type BackupEquipRow = DashboardBackupEquipamentoItem;

function formatBytes(bytes: number | null): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / k ** i).toFixed(i === 0 ? 0 : 1))} ${sizes[i]}`;
}

function formatTs(iso: string | null): string {
  if (!iso?.trim()) return '—';
  return formatDateTime(iso);
}

interface DashboardBackupEquipamentosModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  items?: DashboardBackupEquipamentoItem[];
}

function compareRows(a: BackupEquipRow, b: BackupEquipRow, column: string, direction: SortDirection): number {
  const dir = direction === 'asc' ? 1 : -1;
  if (column === 'sizeBytes') {
    return ((a.sizeBytes ?? -1) - (b.sizeBytes ?? -1)) * dir;
  }
  if (column === 'startedAt' || column === 'finishedAt') {
    const sa = (a[column] ?? '').toString();
    const sb = (b[column] ?? '').toString();
    if (sa < sb) return -dir;
    if (sa > sb) return dir;
    return 0;
  }
  const sa = String(
    column === 'deviceId'
      ? a.deviceId ?? ''
      : column === 'fileName'
        ? a.fileName ?? ''
        : column === 'detail'
          ? a.detail ?? ''
          : a.deviceName ?? ''
  ).toLowerCase();
  const sb = String(
    column === 'deviceId'
      ? b.deviceId ?? ''
      : column === 'fileName'
        ? b.fileName ?? ''
        : column === 'detail'
          ? b.detail ?? ''
          : b.deviceName ?? ''
  ).toLowerCase();
  if (sa < sb) return -dir;
  if (sa > sb) return dir;
  return 0;
}

const DashboardBackupEquipamentosModal: React.FC<DashboardBackupEquipamentosModalProps> = ({
  show,
  onClose: _onClose,
  items = [],
}) => {
  const { t } = useI18n();
  const { selectedItem, handleSelectionChange, clearSelection } = useModalSelect<BackupEquipRow>();

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailRow, setDetailRow] = useState<BackupEquipRow | null>(null);

  const tableFilters = useTableFilters({
    initialSortColumn: 'finishedAt',
    initialSortDirection: 'desc',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const tableResetKey = useMemo(() => items.map((i) => i.id).join(';'), [items]);

  useEffect(() => {
    if (!show) return;
    tableFilters.resetAll();
    clearSelection();
    setShowDetailsModal(false);
    setDetailRow(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset ao abrir / trocar lista
  }, [show, tableResetKey]);

  useEffect(() => {
    if (!show) {
      setShowDetailsModal(false);
      setDetailRow(null);
    }
  }, [show]);

  const rows: BackupEquipRow[] = useMemo(() => items, [items]);

  const sortRows = useCallback(
    (data: BackupEquipRow[]) => {
      const col = tableFilters.sortColumn || 'finishedAt';
      const dir = tableFilters.sortDirection;
      return [...data].sort((a, b) => compareRows(a, b, col, dir));
    },
    [tableFilters.sortColumn, tableFilters.sortDirection]
  );

  const customFilters = useCallback((data: BackupEquipRow[]) => sortRows(data), [sortRows]);

  const handleViewDetails = useCallback((item: BackupEquipRow) => {
    setDetailRow(item);
    setShowDetailsModal(true);
  }, []);

  const bulkActions = useMemo(
    () => [
      {
        label: t('history.view'),
        variant: 'primary' as const,
        disabled: (selected: BackupEquipRow[]) => selected.length === 0 && !selectedItem,
        requiresSelection: true,
        action: (selected: BackupEquipRow[]) => {
          const it = selected.length > 0 ? selected[0] : selectedItem;
          if (it) handleViewDetails(it);
        },
      },
    ],
    [t, selectedItem, handleViewDetails]
  );

  const columns: TableConfig<BackupEquipRow>['columns'] = useMemo(
    () => [
      {
        key: 'deviceId',
        label: t('table.id'),
        sortable: true,
        searchable: true,
        width: '70px',
        render: (row) => <span className="font-monospace small">{row.deviceId}</span>,
      },
      {
        key: 'deviceName',
        label: t('sshDevice.backupDeviceColumn'),
        sortable: true,
        searchable: true,
      },
      {
        key: 'fileName',
        label: t('sshDevice.backupFileColumn'),
        sortable: true,
        searchable: true,
        render: (row) => (row.fileName?.trim() ? row.fileName : '—'),
      },
      {
        key: 'sizeBytes',
        label: t('sshDevice.backupSizeColumn'),
        sortable: true,
        searchable: true,
        align: 'right',
        headerAlign: 'right',
        render: (row) => <span className="small">{formatBytes(row.sizeBytes)}</span>,
      },
      {
        key: 'startedAt',
        label: t('dashboard.backupLogStartAt'),
        sortable: true,
        searchable: true,
        width: '155px',
        render: (row) => <span className="small text-nowrap">{formatTs(row.startedAt)}</span>,
      },
      {
        key: 'finishedAt',
        label: t('dashboard.backupLogEndAt'),
        sortable: true,
        searchable: true,
        width: '155px',
        render: (row) => <span className="small text-nowrap">{formatTs(row.finishedAt)}</span>,
      },
      {
        key: 'detail',
        label: t('dashboard.backupStatusDetailColumn'),
        sortable: true,
        searchable: true,
        render: (row) => (
          <span className="small text-muted">{row.detail?.trim() ? row.detail : '—'}</span>
        ),
      },
    ],
    [t]
  );

  if (!show) return null;

  const detailFields: DetailFieldItem[] = detailRow
    ? [
        { label: t('sshDevice.backupDeviceColumn'), value: detailRow.deviceName || '—' },
        {
          label: t('table.id'),
          value: detailRow.deviceId,
          inputClassName: 'font-monospace small',
        },
        {
          label: t('sshDevice.backupFileColumn'),
          value: detailRow.fileName?.trim() ? detailRow.fileName : '—',
          inputClassName: 'font-monospace small',
          colClassName: 'col-12',
        },
        { label: t('sshDevice.backupSizeColumn'), value: formatBytes(detailRow.sizeBytes) },
        { label: t('dashboard.backupLogStartAt'), value: formatTs(detailRow.startedAt) },
        { label: t('dashboard.backupLogEndAt'), value: formatTs(detailRow.finishedAt) },
      ]
    : [];

  return (
    <>
          <EmbeddedTablePanel<BackupEquipRow>
            key={tableResetKey}
            tableId="dashboard-backup-equipamentos"
            config={{
              columns,
              data: rows,
              loading: false,
              searchable: true,
              searchPlaceholder: t('layout.searchPlaceholder'),
              searchFields: [
                { key: 'deviceId', label: t('table.id') },
                { key: 'deviceName', label: t('sshDevice.backupDeviceColumn') },
                { key: 'fileName', label: t('sshDevice.backupFileColumn') },
                { key: 'detail', label: t('dashboard.backupStatusDetailColumn') },
              ],
              sortable: true,
              sortColumn: tableFilters.sortColumn,
              sortDirection: tableFilters.sortDirection,
              selectable: true,
              multiSelect: false,
              striped: true,
              hover: true,
              responsive: true,
              emptyMessage: t('dashboard.deviceBackupsModalEmpty'),
              customFilters,
              bulkActions: bulkActions.map((a) => ({
                key: a.label.toLowerCase().replace(/\s+/g, '-'),
                label: a.label,
                onClick: a.action,
                disabled: a.disabled,
                variant: a.variant,
                requiresSelection: a.requiresSelection,
              })),
            }}
            search={tableFilters.search}
            onSearch={(term, field) => {
              tableFilters.setSearch(term);
              if (field) tableFilters.setSearchField(field);
            }}
            onSearchFieldChange={(field) => tableFilters.setSearchField(field)}
            onSort={(column, direction) => tableFilters.setSort(column, direction)}
            onPageChange={(page) => setTimeout(() => tableFilters.setPage(page), 0)}
            onPageSizeChange={(size) => setTimeout(() => tableFilters.setLimit(size), 0)}
            onSelectionChange={(sel) => handleSelectionChange(sel)}
          />

      {detailRow && (
        <DraggableModal
          show={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setDetailRow(null);
          }}
          title={t('audit.detailsTitle')}
          size="lg"
          modalId="dashboard-backup-log-details"
        >
          <div className="form-modal-simple logs-auditoria-details">
            <DetailFieldGrid fields={detailFields} />
            {detailRow?.detail?.trim() ? (
              <div className="mt-3">
                <FormField
                  name="backup_log_detail"
                  type="textarea"
                  label={t('dashboard.backupStatusDetailColumn')}
                  value={detailRow.detail}
                  onChange={() => undefined}
                  size="sm"
                  readOnly
                  rows={Math.min(12, Math.max(3, detailRow.detail.split('\n').length + 2))}
                />
              </div>
            ) : null}
          </div>
        </DraggableModal>
      )}
    </>
  );
};

export default DashboardBackupEquipamentosModal;
