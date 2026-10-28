import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useI18n } from 'contexts/I18nContext';
import { FileInput, useBulkBtn } from 'components/ui';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import {
  BackupService,
  Backup,
  BackupManualTipo,
  BackupStreamEvent,
} from 'services/backupService';
import BackupRunPanel from './BackupRunPanel';

interface BackupRunState {
  active: boolean;
  progress: number;
  message: string;
  logs: string[];
}

const MAX_BACKUP_LOGS = 400;

interface BackupsModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

interface BackupWithId extends Backup {
  id: string;
}

const BACKUP_MANUAL_OPTIONS: { tipo: BackupManualTipo; labelKey: string; icon: string; destaque?: boolean }[] = [
  { tipo: 'database', labelKey: 'backup.manualDatabase', icon: 'bi-database' },
  { tipo: 'arquivos', labelKey: 'backup.manualFiles', icon: 'bi-folder' },
  { tipo: 'logs', labelKey: 'backup.manualLogs', icon: 'bi-list-ul' },
  { tipo: 'completo', labelKey: 'backup.manualFull', icon: 'bi-check2-square', destaque: true }
];

const BackupsModal: React.FC<BackupsModalProps> = ({ show, onClose, skipWrapper = false }) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
    const { success } = useNotificationContext();
    const { showApiError } = useApiError();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<{ delete?: string; download?: string; restore?: string; upload?: boolean }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('data');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [run, setRun] = useState<BackupRunState | null>(null);

  useEffect(() => {
    if (!show) setRun(null);
  }, [show]);

  const applyStreamEvent = useCallback((event: BackupStreamEvent) => {
    setRun((prev) => {
      const logs = [...(prev?.logs ?? []), ...(event.logs ?? [])].slice(-MAX_BACKUP_LOGS);
      return {
        active: !event.success && !event.error,
        progress: typeof event.progress === 'number' ? event.progress : (prev?.progress ?? 0),
        message: event.message ?? prev?.message ?? '',
        logs,
      };
    });
  }, []);

  const { data: backups = [] as Backup[], isLoading, refetch } = useQuery<Backup[]>({
    queryKey: ['backups'],
    queryFn: () => BackupService.list(),
    enabled: show,
    staleTime: 0
  });

  const manualMutation = useMutation({
    mutationFn: (tipo: BackupManualTipo) => BackupService.executeManualStream(tipo, applyStreamEvent),
    onSuccess: (data) => {
      setRun((prev) => (prev ? { ...prev, active: false, progress: 100 } : prev));
      success(data?.message ?? t('backup.finished'));
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      refetch();
    },
    onError: (err) => {
      setRun((prev) => (prev && prev.logs.length > 0 ? { ...prev, active: false } : null));
      showApiError(err, CONTEXT_ERROR_MESSAGES.BACKUP_CREATE_ERROR);
    },
  });

  const handleDelete = useCallback(async (item: BackupWithId) => {
    const confirmed = window.confirm(t('backup.confirmDelete').replace('{{nome}}', item.nome));
    if (!confirmed) return;
    setActionLoading(prev => ({ ...prev, delete: item.nome }));
    try {
      await BackupService.deleteBackup(item.nome);
      success(t('backup.deleted'));
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      refetch();
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.BACKUP_DELETE_ERROR);
    } finally {
      setActionLoading(prev => ({ ...prev, delete: undefined }));
    }
  }, [queryClient, refetch, success, showApiError, t]);

  const handleDownload = useCallback((item: BackupWithId) => {
    setActionLoading(prev => ({ ...prev, download: item.nome }));
    try {
      BackupService.startBackupDownload(item.nome);
      success(t('backup.downloadStarted'));
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.BACKUP_CREATE_ERROR);
    } finally {
      setActionLoading(prev => ({ ...prev, download: undefined }));
    }
  }, [success, showApiError, t]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setActionLoading(prev => ({ ...prev, upload: true }));
    try {
      const result = await BackupService.uploadBackup(file);
      success(result?.message ?? t('backup.imported'));
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      refetch();
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.BACKUP_IMPORT_ERROR);
    } finally {
      setActionLoading(prev => ({ ...prev, upload: false }));
    }
  }, [queryClient, refetch, success, showApiError, t]);

  const handleRestore = useCallback(async (item: BackupWithId) => {
    const confirmed = window.confirm(t('backup.confirmRestoreCritical'));
    if (!confirmed) return;
    setActionLoading(prev => ({ ...prev, restore: item.nome }));
    try {
      const result = await BackupService.restoreBackup(item.nome);
      success(result?.message ?? t('backup.restoreRequested'));
      // Limpa todo o cache pois a restauração altera todos os dados do banco
      queryClient.clear();
      refetch();
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.BACKUP_RESTORE_ERROR);
    } finally {
      setActionLoading(prev => ({ ...prev, restore: undefined }));
    }
  }, [queryClient, refetch, success, showApiError, t]);

  const modalData = useMemo<BackupWithId[]>(() =>
    (backups as Backup[]).map((b) => ({ ...b, id: b.nome })),
    [backups]
  );

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return modalData;
    const term = searchTerm.toLowerCase().trim();
    const field = searchField || 'nome';
    return modalData.filter((item) => {
      const val = field === 'tipo' ? item.tipo.toLowerCase() : item.nome.toLowerCase();
      return val.includes(term);
    });
  }, [modalData, searchTerm, searchField]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    const key = sortColumn === 'tamanhoFormatado' ? 'tamanho' : sortColumn === 'dataFormatada' ? 'data' : sortColumn;
    sorted.sort((a, b) => {
      const aVal = a[key as keyof BackupWithId];
      const bVal = b[key as keyof BackupWithId];
      if (aVal === bVal) return 0;
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (aVal == null || aVal === '') return 1 * dir;
      if (bVal == null || bVal === '') return -1 * dir;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * dir;
      }
      return String(aVal).localeCompare(String(bVal), undefined, { numeric: true }) * dir;
    });
    return sorted;
  }, [filteredData, sortColumn, sortDirection]);

  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  }, []);

  const tableColumns: TableConfig<BackupWithId>['columns'] = useMemo(() => [
    {
      key: 'nome',
      label: t('backup.columnName'),
      sortable: true,
      render: (item) => item.nome,
    },
    {
      key: 'tamanhoFormatado',
      label: t('backup.columnSize'),
      sortable: true,
      width: '100px'
    },
    {
      key: 'dataFormatada',
      label: t('backup.columnDate'),
      sortable: true,
      width: '160px'
    },
    {
      key: 'tipo',
      label: t('backup.columnType'),
      sortable: true,
      badgeLabels: ['database', 'arquivos', 'completo'],
      render: (item) => <span className="badge bg-secondary">{item.tipo}</span>
    }
  ], [t]);

  const bulkActions = useMemo(() => [
    {
      key: 'executar-backup',
      label: t('backup.executeManual'),
      variant: 'primary' as const,
      requiresSelection: false,
      disabled: (_items: BackupWithId[]) => manualMutation.isPending,
      dropdown: BACKUP_MANUAL_OPTIONS.map(opt => ({
        label: t(opt.labelKey as keyof typeof t),
        disabled: manualMutation.isPending,
        action: () => {
          setRun({ active: true, progress: 0, message: t('backup.running'), logs: [] });
          manualMutation.mutate(opt.tipo);
        }
      }))
    },
    {
      key: 'deletar',
      label: bulkBtn.deletar.label,
      variant: bulkBtn.deletar.variant,
      disabled: (items: BackupWithId[]) => manualMutation.isPending || items.length === 0 || !!(actionLoading.delete || actionLoading.download || actionLoading.restore),
      onClick: (items: BackupWithId[]) => {
        const item = items[0];
        if (item) handleDelete(item);
      }
    },
    {
      key: 'importar',
      label: t('backup.import'),
      variant: 'primary' as const,
      requiresSelection: false,
      disabled: (_items: BackupWithId[]) => manualMutation.isPending || !!(actionLoading.upload),
      onClick: () => handleImportClick()
    },
    {
      key: 'baixar',
      label: bulkBtn.baixar.label,
      variant: bulkBtn.baixar.variant,
      disabled: (items: BackupWithId[]) => manualMutation.isPending || items.length === 0 || !!(actionLoading.delete || actionLoading.download || actionLoading.restore),
      onClick: (items: BackupWithId[]) => {
        const item = items[0];
        if (item) handleDownload(item);
      }
    },
    {
      key: 'restaurar',
      label: t('backup.restore'),
      variant: 'primary' as const,
      disabled: (items: BackupWithId[]) => manualMutation.isPending || items.length === 0 || !!(actionLoading.delete || actionLoading.download || actionLoading.restore),
      onClick: (items: BackupWithId[]) => {
        const item = items[0];
        if (item) handleRestore(item);
      }
    }
  ], [t, actionLoading, manualMutation, handleImportClick, handleDelete, handleDownload, handleRestore, bulkBtn]);

  const pagination = useMemo(() => ({
    currentPage: 1,
    lastPage: 1,
    perPage: sortedData.length || 15,
    total: sortedData.length,
    from: sortedData.length > 0 ? 1 : 0,
    to: sortedData.length
  }), [sortedData.length]);

  const modalContent = (
    <div className="backup-modal-layout">
      <FileInput
        ref={fileInputRef}
        accept=".sql,.tar.gz,.ndjson,.txt"
        className="visually-hidden-input"
        onChange={handleFileChange}
      />
      {run && (
        <BackupRunPanel
          active={run.active}
          progress={run.progress}
          message={run.message}
          logs={run.logs}
        />
      )}
      <Table
          syncWithHeader={false}
          title={t('backup.title')}
          config={{
            columns: tableColumns,
            data: sortedData,
            loading: isLoading,
            sortable: true,
            sortColumn,
            sortDirection,
            searchable: true,
            searchPlaceholder: t('layout.searchPlaceholder'),
            searchField: searchField || 'nome',
            searchFields: [
              { key: 'nome', label: t('backup.columnName') },
              { key: 'tipo', label: t('backup.columnType') }
            ],
            striped: true,
            hover: true,
            responsive: true,
            selectable: true,
            multiSelect: false,
            bulkActions: bulkActions,
            emptyMessage: t('backup.empty'),
            pagination
          }}
          tableId="backups-list"
          onRefresh={refetch}
          onSearch={(term, field) => { setSearchTerm(term); if (field) setSearchField(field); }}
          onSearchFieldChange={(f) => setSearchField(f)}
          onSort={handleSort}
          search={searchTerm}
          />
    </div>
  );

  if (skipWrapper) {
    return <>{modalContent}</>;
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('backup.title')}
      size="xl"
      modalId="backups-modal"
      className="no-padding"
    >
      {modalContent}
    </DraggableModal>
  );
};

export default BackupsModal;
