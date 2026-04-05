import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useModalSelect } from 'hooks/useModalSelect';
import { SshDeviceBackupService, type SshDeviceBackupFile } from 'services/sshDeviceBackupService';
import Table from 'components/tables/Table';
import TextPreviewModal from 'components/common/TextPreviewModal';
import type { TableConfig } from 'components/tables/types';

const TEXT_PREVIEW_EXTENSIONS = ['.rsc', '.txt', '.cfg', '.conf', '.log'];

function isTextPreviewSupported(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return TEXT_PREVIEW_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / k ** i).toFixed(i === 0 ? 0 : 1))} ${sizes[i]}`;
}

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
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<PendingBackupAction | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

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
        const msg =
          (err as AxiosError<{ message?: string }>)?.response?.data?.message ??
          (err as Error)?.message ??
          t('messages.error');
        showError(msg);
      } finally {
        setPendingAction(null);
      }
    },
    [deviceId, queryClient, showError, success, t]
  );

  const handleView = useCallback(
    async (row: BackupTableRow) => {
      if (!isTextPreviewSupported(row.fileName)) return;
      setShowPreview(true);
      setPreviewContent(null);
      setPreviewError(null);
      setPreviewTitle(row.fileName);
      setPreviewLoading(true);
      try {
        const text = await SshDeviceBackupService.fetchAsText(deviceId, row.fileName);
        setPreviewContent(text);
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : 'Erro ao carregar');
      } finally {
        setPreviewLoading(false);
      }
    },
    [deviceId]
  );

  const closePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewContent(null);
    setPreviewError(null);
  }, []);

  const tableColumns: TableConfig<BackupTableRow>['columns'] = useMemo(
    () => [
      {
        key: 'fileName',
        label: t('sshDevice.backupFileColumn'),
        sortable: false,
        searchable: true,
        render: (row) => <span className="small text-break">{row.fileName}</span>,
      },
      {
        key: 'size',
        label: t('sshDevice.backupSizeColumn'),
        sortable: false,
        searchable: false,
        align: 'right',
        headerAlign: 'right',
        width: '88px',
        render: (row) => <span className="small">{formatBytes(row.size)}</span>,
      },
      {
        key: 'modifiedAt',
        label: t('sshDevice.backupDateColumn'),
        sortable: false,
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
        label: t('buttons.view'),
        variant: 'primary' as const,
        disabled: (selectedItems: BackupTableRow[]) =>
          selectedItems.length !== 1 ||
          !isTextPreviewSupported(selectedItems[0].fileName) ||
          previewLoading ||
          isBusy,
        onClick: async (selectedItems: BackupTableRow[]) => {
          if (selectedItems.length !== 1) return;
          await handleView(selectedItems[0]);
        },
      },
      {
        key: 'download-backup',
        label: t('buttons.download'),
        variant: 'primary' as const,
        disabled: (selectedItems: BackupTableRow[]) => selectedItems.length !== 1 || isBusy,
        onClick: async (selectedItems: BackupTableRow[]) => {
          if (selectedItems.length !== 1) return;
          await handleDownload(selectedItems[0]);
        },
      },
      {
        key: 'delete-backup',
        label: t('actions.delete'),
        variant: 'primary' as const,
        disabled: (selectedItems: BackupTableRow[]) => selectedItems.length !== 1 || isBusy,
        onClick: async (selectedItems: BackupTableRow[]) => {
          if (selectedItems.length !== 1) return;
          await handleDeleteBackup(selectedItems[0]);
        },
      },
    ];
  }, [t, pendingAction, handleDownload, handleDeleteBackup, previewLoading, handleView]);

  const rootClass = variant === 'tab' ? '' : 'mt-4 pt-3 border-top';

  const inner = (
    <Table<BackupTableRow>
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
        sortable: false,
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
      syncWithHeader={false}
      onRefresh={refetch}
      onSelectionChange={(items) => handleSelectionChange(items)}
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
            <div
              className="col-12"
              style={{
                height: '100%',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
              }}
            >
              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>{inner}</div>
            </div>
          </div>
        </div>
        <TextPreviewModal
          show={showPreview}
          onClose={closePreview}
          title={previewTitle}
          content={previewContent}
          isLoading={previewLoading}
          error={previewError}
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
        show={showPreview}
        onClose={closePreview}
        title={previewTitle}
        content={previewContent}
        isLoading={previewLoading}
        error={previewError}
        modalId="ssh-backup-text-preview"
      />
    </React.Fragment>
  );
};

export default SshDeviceBackupsPanel;
