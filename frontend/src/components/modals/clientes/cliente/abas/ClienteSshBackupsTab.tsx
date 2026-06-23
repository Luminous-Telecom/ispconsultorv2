import React, { useMemo, useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTableFilters } from 'hooks/useTableFilters';
import { useI18n } from 'contexts/I18nContext';
import { useBulkBtn } from 'components/ui';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { SshDeviceBackupService, type SshDeviceBackupFile } from 'services/sshDeviceBackupService';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import TextPreviewModal from 'components/common/TextPreviewModal';
import {
  formatSshBackupBytes,
  isSshBackupTextPreviewSupported,
} from 'components/common/sshBackups/sshBackupsUtils';
import { useSshBackupPreview } from 'hooks/useSshBackupPreview';
import type { TableConfig } from 'components/tables/types';

interface ClienteBackupRow {
  id: string;
  device_id: string;
  device_name: string;
  fileName: string;
  size: number;
  modifiedAt: string;
}

interface ClienteSshBackupsTabProps {
  clienteId?: number;
}

const ClienteSshBackupsTab: React.FC<ClienteSshBackupsTabProps> = ({ clienteId }) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const { showApiError } = useApiError();
  const tableFilters = useTableFilters({
    initialSortColumn: 'modifiedAt',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });
  const queryClient = useQueryClient();
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [, setSelectedItems] = useState<ClienteBackupRow[]>([]);
  const preview = useSshBackupPreview();

  const { data: files = [], isLoading, isError, refetch } = useQuery<SshDeviceBackupFile[]>({
    queryKey: ['ssh-device-backups', 'cliente', clienteId],
    queryFn: () => SshDeviceBackupService.listByCliente(clienteId!),
    enabled: clienteId != null && clienteId > 0,
  });

  const tableData = useMemo<ClienteBackupRow[]>(() => {
    return (files ?? []).map((f: SshDeviceBackupFile) => {
      const did = f.device_id ?? '';
      return {
        id: `${did}:${f.fileName}`,
        device_id: did,
        device_name: (f.device_name?.trim() || did) || '—',
        fileName: f.fileName,
        size: f.size,
        modifiedAt: f.modifiedAt,
      };
    });
  }, [files]);

  const handleDownloadOne = useCallback(async (row: ClienteBackupRow) => {
    if (!row.device_id) return;
    setDownloadingKey(row.id);
    try {
      await SshDeviceBackupService.download(row.device_id, row.fileName);
    } finally {
      setDownloadingKey(null);
    }
  }, []);

  const handleView = useCallback(async (row: ClienteBackupRow) => {
    if (!row.device_id || !isSshBackupTextPreviewSupported(row.fileName)) return;
    await preview.openPreview(row.device_id, row.fileName, `${row.device_name} — ${row.fileName}`);
  }, [preview]);

  const handleDelete = useCallback(
    async (items: ClienteBackupRow[]) => {
      if (items.length === 0) return;
      const msg =
        items.length === 1
          ? `Excluir o backup "${items[0].fileName}"?`
          : `Excluir ${items.length} backup(s) selecionado(s)?`;
      if (!window.confirm(msg)) return;
      for (const row of items) {
        if (!row.device_id) continue;
        setDeletingKey(row.id);
        try {
          await SshDeviceBackupService.delete(row.device_id, row.fileName);
          await queryClient.invalidateQueries({ queryKey: ['ssh-device-backups', 'cliente', clienteId] });
        } catch (err) {
          showApiError(err, CONTEXT_ERROR_MESSAGES.SSH_BACKUP_DELETE_ERROR);
        } finally {
          setDeletingKey(null);
        }
      }
    },
    [clienteId, queryClient, showApiError]
  );

  const tableColumns: TableConfig<ClienteBackupRow>['columns'] = useMemo(
    () => [
      {
        key: 'device_name',
        label: t('sshDevice.backupDeviceColumn'),
        sortable: true,
        searchable: true,
        width: '160px',
        render: (row) => <span className="small">{row.device_name}</span>,
      },
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

  const bulkActions = useMemo(
    () => [
      {
        key: 'view-backup',
        label: bulkBtn.visualizar.label,
        variant: bulkBtn.visualizar.variant,
        disabled: (items: ClienteBackupRow[]) =>
          items.length !== 1 ||
          !items[0].device_id ||
          !isSshBackupTextPreviewSupported(items[0].fileName) ||
          preview.previewLoading,
        onClick: async (items: ClienteBackupRow[]) => {
          if (items.length !== 1) return;
          await handleView(items[0]);
        },
      },
      {
        key: 'download-selected',
        label: bulkBtn.baixar.label,
        variant: bulkBtn.baixar.variant,
        disabled: (items: ClienteBackupRow[]) =>
          items.length === 0 || downloadingKey !== null || items.some((r) => !r.device_id),
        onClick: async (items: ClienteBackupRow[]) => {
          if (items.length === 0) return;
          for (const row of items) {
            if (!row.device_id) continue;
            await handleDownloadOne(row);
          }
        },
      },
      {
        key: 'delete-selected',
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (items: ClienteBackupRow[]) =>
          items.length === 0 || deletingKey !== null || items.some((r) => !r.device_id),
        onClick: handleDelete,
      },
    ],
    [bulkBtn, downloadingKey, deletingKey, handleDownloadOne, handleDelete, preview.previewLoading, handleView]
  );

  if (!clienteId) {
    return (
      <div className="alert alert-info">
        {t('messages.saveClientFirstSshBackups')}
      </div>
    );
  }

  return (
    <>
          <EmbeddedTablePanel<ClienteBackupRow>
              key="cliente-ssh-backups-tab-table"
              title={t('tabs.sshDeviceBackups')}
              className="no-padding"
              config={{
                columns: tableColumns,
                data: isError ? [] : tableData,
                loading: isLoading,
                searchable: true,
                searchPlaceholder: t('layout.searchPlaceholder'),
                searchFields: [
                  { key: 'device_name', label: t('sshDevice.backupDeviceColumn') },
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
                bulkActions: bulkActions.map((action) => ({
                  key: action.key,
                  label: action.label,
                  onClick: action.onClick,
                  disabled: action.disabled,
                  variant: action.variant,
                })),
              }}
              tableId="cliente-ssh-backups"
              onRefresh={refetch}
              onSelectionChange={setSelectedItems}
              onSort={(col, dir) => tableFilters.setSort(col, dir)}
          />
    <TextPreviewModal
      show={preview.showPreview}
      onClose={preview.closePreview}
      title={preview.previewTitle}
      content={preview.previewContent}
      isLoading={preview.previewLoading}
      error={preview.previewError}
      modalId="cliente-ssh-backup-text-preview"
    />
    </>
  );
};

export default ClienteSshBackupsTab;
