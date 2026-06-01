import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import { useBulkBtn } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import { SshDeviceBackupService, type SshDeviceBackupFile } from 'services/sshDeviceBackupService';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import TextPreviewModal from 'components/common/TextPreviewModal';
import {
  formatSshBackupBytes,
  isSshBackupTextPreviewSupported,
} from 'components/common/sshBackups/sshBackupsUtils';
import { useSshBackupPreview } from 'hooks/useSshBackupPreview';
import type { TableConfig } from 'components/tables/types';

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

const SshDeviceBackupsPanel: React.FC<SshDeviceBackupsPanelProps> = ({ deviceId, variant = 'section' }) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
      const { success } = useNotificationContext();
      const { showApiError } = useApiError();
  const tableFilters = useTableFilters({
    initialSortColumn: 'modifiedAt',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<PendingBackupAction | null>(null);
  const preview = useSshBackupPreview();

  const { handleSelectionChange, clearSelection } = useModalSelect<BackupTableRow>();

  const { data: files = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['ssh-device-backups', deviceId],
    queryFn: () => SshDeviceBackupService.listByDevice(deviceId),
    enabled: !!deviceId,
  });

  useEffect(() => {
    clearSelection();
  }, [deviceId, clearSelection]);

  const tableData = useMemo<BackupTableRow[]>(() => {
    return (files as SshDeviceBackupFile[]).map((f) => ({
      id: f.fileName,
      fileName: f.fileName,
      size: f.size,
      modifiedAt: f.modifiedAt,
    }));
  }, [files]);

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

  const handleDeleteBackup = useCallback(
    async (row: BackupTableRow) => {
      const confirmed = window.confirm(t('backup.confirmDelete').replace('{{nome}}', row.fileName));
      if (!confirmed) return;
      setPendingAction({ kind: 'delete', fileName: row.fileName });
      try {
        await SshDeviceBackupService.delete(deviceId, row.fileName);
        success(t('backup.deleted'));
        await queryClient.invalidateQueries({ queryKey: ['ssh-device-backups'] });
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.SSH_BACKUP_DELETE_ERROR);
      } finally {
        setPendingAction(null);
      }
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
        disabled: (selectedItems: BackupTableRow[]) => selectedItems.length !== 1 || isBusy,
        onClick: async (selectedItems: BackupTableRow[]) => {
          if (selectedItems.length !== 1) return;
          await handleDownload(selectedItems[0]);
        },
      },
      {
        key: 'delete-backup',
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (selectedItems: BackupTableRow[]) => selectedItems.length !== 1 || isBusy,
        onClick: async (selectedItems: BackupTableRow[]) => {
          if (selectedItems.length !== 1) return;
          await handleDeleteBackup(selectedItems[0]);
        },
      },
    ];
  }, [bulkBtn, pendingAction, handleDownload, handleDeleteBackup, preview.previewLoading, handleView]);

  const rootClass = variant === 'tab' ? '' : 'mt-4 pt-3 border-top';

  const inner = (
    <EmbeddedTablePanel<BackupTableRow>
      key={`ssh-device-backups-table-${deviceId}`}
      title={t('tabs.sshDeviceBackups')}
      className="no-padding"
      config={{
        columns: tableColumns,
        data: isError ? [] : tableData,
        loading: isLoading,
        searchable: true,
        searchPlaceholder: t('layout.searchPlaceholder'),
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
        multiSelect: false,
        emptyMessage: isError ? t('sshDevice.backupsLoadError') : t('sshDevice.backupsEmpty'),
        bulkActions: bulkActions.map((action) => ({
          key: action.key,
          label: action.label,
          onClick: action.onClick,
          disabled: action.disabled,
          variant: action.variant,
        })),
      }}
      tableId={`ssh-device-backups-${deviceId}`}
      onRefresh={refetch}
      onSelectionChange={(items) => handleSelectionChange(items)}
      onSort={(col, dir) => tableFilters.setSort(col, dir)}
    />
  );

  if (variant === 'tab') {
    return (
      <React.Fragment>
        <div className={rootClass}>
          <div
            className="row"
            style={{
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              margin: 0,
              padding: 0,
            }}
          >
            <div className="col-12 p-0" style={{ height: '100%', minHeight: 0 }}>
              {inner}
            </div>
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
  }

  return (
    <React.Fragment>
      <div className={rootClass}>
        <div
          className="row"
          style={{ margin: 0, padding: 0 }}
        >
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
