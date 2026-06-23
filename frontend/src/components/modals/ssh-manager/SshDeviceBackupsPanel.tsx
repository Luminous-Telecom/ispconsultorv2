import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import { useBulkBtn } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useTableFilters } from 'hooks/useTableFilters';
import { SshDeviceBackupService, type SshDeviceBackupFile } from 'services/sshDeviceBackupService';
import { normalizeListPagination } from 'utils/pagination';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import TextPreviewModal from 'components/common/TextPreviewModal';
import {
  formatSshBackupBytes,
  isSshBackupTextPreviewSupported,
} from 'components/common/sshBackups/sshBackupsUtils';
import { useSshBackupPreview } from 'hooks/useSshBackupPreview';
import type { SortDirection, TableConfig } from 'components/tables/types';

interface BackupTableRow {
  id: string;
  fileName: string;
  size: number;
  modifiedAt: string;
}

interface SshDeviceBackupsPanelProps {
  deviceId: string;
  /** Dentro de aba do modal: sem divisor superior */
  variant?: 'section' | 'tab';
}

type PendingBackupAction = { kind: 'download' | 'delete'; fileName: string };

function matchBackupRow(row: BackupTableRow, term: string, field: string): boolean {
  const lower = term.toLowerCase().trim();
  if (field === 'size') {
    return String(row.size).includes(lower);
  }
  if (field === 'modifiedAt') {
    return (row.modifiedAt ?? '').toLowerCase().includes(lower);
  }
  return row.fileName.toLowerCase().includes(lower);
}

function compareBackupRows(
  a: BackupTableRow,
  b: BackupTableRow,
  column: string,
  direction: SortDirection
): number {
  const dir = direction === 'asc' ? 1 : -1;
  if (column === 'size') {
    return (a.size - b.size) * dir;
  }
  if (column === 'modifiedAt') {
    const sa = a.modifiedAt ?? '';
    const sb = b.modifiedAt ?? '';
    if (sa < sb) return -dir;
    if (sa > sb) return dir;
    return 0;
  }
  return a.fileName.localeCompare(b.fileName, undefined, { numeric: true }) * dir;
}

const SshDeviceBackupsPanel: React.FC<SshDeviceBackupsPanelProps> = ({ deviceId, variant = 'section' }) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const tableFilters = useTableFilters({
    initialSortColumn: 'modifiedAt',
    initialSortDirection: 'desc',
    initialPage: 1,
    initialLimit: 15,
    resetPageOnFilterChange: true,
    initialSearchField: 'fileName',
  });
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<PendingBackupAction | null>(null);
  const preview = useSshBackupPreview();

  const { data: files = [], isLoading, isError, refetch } = useQuery<SshDeviceBackupFile[]>({
    queryKey: ['ssh-device-backups', deviceId],
    queryFn: () => SshDeviceBackupService.listByDevice(deviceId),
    enabled: !!deviceId,
  });

  const allRows = useMemo<BackupTableRow[]>(() => {
    return (files as SshDeviceBackupFile[]).map((f) => ({
      id: f.fileName,
      fileName: f.fileName,
      size: f.size,
      modifiedAt: f.modifiedAt,
    }));
  }, [files]);

  const { tableData, pagination, allFilteredSortedRows } = useMemo(() => {
    const source = isError ? [] : allRows;
    const term = tableFilters.debouncedSearch.trim();
    const field = tableFilters.searchField || 'fileName';
    let filtered = source;
    if (term) {
      filtered = source.filter((row) => matchBackupRow(row, term, field));
    }

    const col = tableFilters.sortColumn || 'modifiedAt';
    const dir = tableFilters.sortDirection;
    const sorted = [...filtered].sort((a, b) => compareBackupRows(a, b, col, dir));

    const total = sorted.length;
    const perPage = tableFilters.limit;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(tableFilters.page, lastPage);
    const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
    const to = total === 0 ? 0 : Math.min(safePage * perPage, total);
    const pageRows = sorted.slice(from > 0 ? from - 1 : 0, to);

    return {
      tableData: pageRows,
      allFilteredSortedRows: sorted,
      pagination: normalizeListPagination(
        { current_page: safePage, last_page: lastPage, per_page: perPage, total, from, to },
        safePage,
        perPage
      ),
    };
  }, [
    allRows,
    isError,
    tableFilters.debouncedSearch,
    tableFilters.searchField,
    tableFilters.sortColumn,
    tableFilters.sortDirection,
    tableFilters.page,
    tableFilters.limit,
  ]);

  const handleSelectAllPages = useCallback(
    async (): Promise<BackupTableRow[]> => allFilteredSortedRows,
    [allFilteredSortedRows]
  );

  const handleDownload = useCallback(
    async (row: BackupTableRow) => {
      setPendingAction({ kind: 'download', fileName: row.fileName });
      try {
        await SshDeviceBackupService.download(deviceId, row.fileName);
      } finally {
        setPendingAction(null);
      }
    },
    [deviceId]
  );

  const handleDeleteMany = useCallback(
    async (items: BackupTableRow[]) => {
      if (items.length === 0) return;
      const msg =
        items.length === 1
          ? t('backup.confirmDelete').replace('{{nome}}', items[0].fileName)
          : `Excluir ${items.length} backup(s) selecionado(s)?`;
      if (!window.confirm(msg)) return;

      for (const row of items) {
        setPendingAction({ kind: 'delete', fileName: row.fileName });
        try {
          await SshDeviceBackupService.delete(deviceId, row.fileName);
        } catch (err) {
          showApiError(err, CONTEXT_ERROR_MESSAGES.SSH_BACKUP_DELETE_ERROR);
          return;
        } finally {
          setPendingAction(null);
        }
      }

      success(t('backup.deleted'));
      await queryClient.invalidateQueries({ queryKey: ['ssh-device-backups'] });
    },
    [deviceId, queryClient, showApiError, success, t]
  );

  const handleView = useCallback(
    async (row: BackupTableRow) => {
      if (!isSshBackupTextPreviewSupported(row.fileName)) return;
      await preview.openPreview(deviceId, row.fileName, row.fileName);
    },
    [deviceId, preview]
  );

  const tableColumns: TableConfig<BackupTableRow>['columns'] = useMemo(
    () => [
      {
        key: 'fileName',
        label: t('sshDevice.backupFileColumn'),
        sortable: true,
        searchable: true,
        render: (row) => row.fileName,
      },
      {
        key: 'size',
        label: t('sshDevice.backupSizeColumn'),
        sortable: true,
        searchable: false,
        align: 'right',
        headerAlign: 'right',
        width: '88px',
        render: (row) => <span className="small">{formatSshBackupBytes(row.size)}</span>,
      },
      {
        key: 'modifiedAt',
        label: t('sshDevice.backupDateColumn'),
        sortable: true,
        searchable: false,
        width: '150px',
        render: (row) => (
          <span className="small">
            {row.modifiedAt
              ? new Date(row.modifiedAt).toLocaleString(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
              : '—'}
          </span>
        ),
      },
    ],
    [t]
  );

  const bulkActions = useMemo(() => {
    const isBusy = pendingAction !== null;
    return [
      {
        key: 'view-backup',
        label: bulkBtn.visualizar.label,
        variant: bulkBtn.visualizar.variant,
        disabled: (selectedItems: BackupTableRow[]) =>
          selectedItems.length !== 1 ||
          !isSshBackupTextPreviewSupported(selectedItems[0].fileName) ||
          preview.previewLoading ||
          isBusy,
        onClick: async (selectedItems: BackupTableRow[]) => {
          if (selectedItems.length !== 1) return;
          await handleView(selectedItems[0]);
        },
      },
      {
        key: 'download-backup',
        label: bulkBtn.baixar.label,
        variant: bulkBtn.baixar.variant,
        disabled: (selectedItems: BackupTableRow[]) => selectedItems.length === 0 || isBusy,
        onClick: async (selectedItems: BackupTableRow[]) => {
          for (const row of selectedItems) {
            await handleDownload(row);
          }
        },
      },
      {
        key: 'delete-backup',
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (selectedItems: BackupTableRow[]) => selectedItems.length === 0 || isBusy,
        onClick: handleDeleteMany,
      },
    ];
  }, [bulkBtn, pendingAction, handleDownload, handleDeleteMany, preview.previewLoading, handleView]);

  const rootClass = variant === 'tab' ? '' : 'mt-4 pt-3 border-top';

  const inner = (
    <EmbeddedTablePanel<BackupTableRow>
      key={`ssh-device-backups-table-${deviceId}`}
      syncWithHeader={false}
      title={t('tabs.sshDeviceBackups')}
      className="no-padding"
      config={{
        columns: tableColumns,
        data: tableData,
        loading: isLoading,
        searchable: true,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchField: tableFilters.searchField || 'fileName',
        searchFields: [
          { key: 'fileName', label: t('sshDevice.backupFileColumn') },
          { key: 'size', label: t('sshDevice.backupSizeColumn') },
          { key: 'modifiedAt', label: t('sshDevice.backupDateColumn') },
        ],
        sortable: true,
        sortColumn: tableFilters.sortColumn,
        sortDirection: tableFilters.sortDirection,
        striped: true,
        hover: true,
        responsive: true,
        selectable: true,
        multiSelect: true,
        emptyMessage: isError ? t('sshDevice.backupsLoadError') : t('sshDevice.backupsEmpty'),
        pagination,
        bulkActions: bulkActions.map((action) => ({
          key: action.key,
          label: action.label,
          onClick: action.onClick,
          disabled: action.disabled,
          variant: action.variant,
        })),
      }}
      tableId={`ssh-device-backups-${deviceId}`}
      search={tableFilters.search}
      onSearch={(term, field) => {
        tableFilters.setSearch(term);
        if (field) tableFilters.setSearchField(field);
        tableFilters.setPage(1);
      }}
      onSearchFieldChange={(field) => tableFilters.setSearchField(field)}
      onRefresh={refetch}
      onSort={(col, dir) => tableFilters.setSort(col, dir)}
      onPageChange={(page) => setTimeout(() => tableFilters.setPage(page), 0)}
      onPageSizeChange={(size) => setTimeout(() => tableFilters.setLimit(size), 0)}
      onSelectAllPages={handleSelectAllPages}
    />
  );

  if (variant === 'tab') {
    return (
      <React.Fragment>
        <div className={rootClass} style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {inner}
        </div>
        <TextPreviewModal
          show={preview.showPreview}
          onClose={preview.closePreview}
          title={preview.previewTitle}
          content={preview.previewContent}
          isLoading={preview.previewLoading}
          error={preview.previewError}
          modalId="ssh-backup-text-preview"
        />
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <div className={rootClass}>
        <div className="row" style={{ margin: 0, padding: 0 }}>
          <div className="col-12 px-0">{inner}</div>
        </div>
      </div>
      <TextPreviewModal
        show={preview.showPreview}
        onClose={preview.closePreview}
        title={preview.previewTitle}
        content={preview.previewContent}
        isLoading={preview.previewLoading}
        error={preview.previewError}
        modalId="ssh-backup-text-preview"
      />
    </React.Fragment>
  );
};

export default SshDeviceBackupsPanel;
