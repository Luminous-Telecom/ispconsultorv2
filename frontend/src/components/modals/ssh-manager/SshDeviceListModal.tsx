import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSshDevices, useDeleteSshDevice, useTestSshDevice, useQueueManualSshDeviceBackup } from 'hooks/useSshDevices';
import { useTableFilters } from 'hooks/useTableFilters';
import { useModalSelect } from 'hooks/useModalSelect';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useI18n } from 'contexts/I18nContext';
import { SshDevice } from 'types';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import SshDeviceModal from './SshDeviceModal';
import SshTerminalModal from './SshTerminalModal';

interface SshDeviceListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  /** Quando definido, lista apenas devices vinculados ao cliente e associa novos cadastros a ele. */
  clienteIdFilter?: number;
  tableTitle?: string;
}

const DEVICE_TYPE_LABELS: Record<string, string> = {
  mikrotik: 'MikroTik',
  cisco: 'Cisco (em breve)',
  huawei: 'Huawei (em breve)',
};

const SshDeviceListModal: React.FC<SshDeviceListModalProps> = ({
  show, onClose, skipWrapper = false, clienteIdFilter, tableTitle,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [terminalDevice, setTerminalDevice] = useState<SshDevice | null>(null);

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const { data, isLoading, refetch } = useSshDevices({
    search: tableFilters.debouncedSearch || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection,
    ...(clienteIdFilter != null ? { cliente_id: clienteIdFilter } : {}),
  });

  const deleteMutation = useDeleteSshDevice();
  const testMutation = useTestSshDevice();
  const queueManualBackupMutation = useQueueManualSshDeviceBackup();

  const { handleSelectionChange, clearSelection } = useModalSelect<SshDevice>();

  const modalData = useMemo(() => data?.data ?? [], [data]);
  const pagination = useMemo(() => data?.pagination, [data]);

  const handleDelete = useCallback(async (device: SshDevice) => {
    try {
      await deleteMutation.mutateAsync(device.id);
      clearSelection();
      refetch();
    } catch {
      // erro tratado pelo hook
    }
  }, [deleteMutation, clearSelection, refetch]);

  /**
   * Só regras que o usuário pode ver na tabela (ativo + MikroTik).
   * Túnel/agente: o backend recusa com mensagem clara — evita falso "desabilitado" se agent_id/agent vier diferente na lista.
   */
  const canQueueManualBackup = useCallback((d: SshDevice | undefined) => {
    if (!d) return false;
    const activeFlag = d.is_active as boolean | number;
    const inactive = activeFlag === false || activeFlag === 0;
    if (inactive) return false;
    return String(d.device_type ?? '').toLowerCase() === 'mikrotik';
  }, []);

  const handleTest = useCallback(async (device: SshDevice) => {
    try {
      const result = await testMutation.mutateAsync(device.id);
      if (result.success) {
        success(`Conexão com "${device.name}" bem-sucedida! Latência: ${result.latency}ms`);
      }
    } catch {
      // erro tratado pelo hook
    }
  }, [testMutation, success]);

  const tableColumns: TableConfig<SshDevice>['columns'] = useMemo(() => [
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
      width: '160px',
      render: (item: SshDevice) => <span className="fw-semibold">{item.name}</span>,
    },
    {
      key: 'cliente',
      label: 'Cliente',
      sortable: false,
      width: '160px',
      render: (item: SshDevice) => {
        const c = item.cliente;
        const label = c?.nome_fantasia?.trim() || c?.razao_social?.trim();
        return <span className="small">{label || '—'}</span>;
      },
    },
    {
      key: 'device_type',
      label: 'Tipo',
      sortable: true,
      width: '100px',
      render: (item: SshDevice) => DEVICE_TYPE_LABELS[item.device_type] ?? item.device_type,
    },
    {
      key: 'host',
      label: 'IP Interno',
      sortable: true,
      width: '150px',
      render: (item: SshDevice) => (
        <span className="font-monospace small">{item.host}:{item.port}</span>
      ),
    },
    {
      key: 'agent',
      label: 'Agente Túnel',
      sortable: false,
      width: '160px',
      render: (item: SshDevice) => {
        const agent = item.agent;
        if (!agent) return <span className="text-muted">-</span>;
        return (
          <span>
            <span className={`badge ${agent.online ? 'bg-success' : 'bg-secondary'} me-1`} style={{ fontSize: '0.65rem' }}>
              {agent.online ? 'Online' : 'Offline'}
            </span>
            {agent.name}
          </span>
        );
      },
    },
    {
      key: 'is_active',
      label: 'Situação',
      sortable: true,
      width: '80px',
      render: (item: SshDevice) => (
        <span className={`badge ${item.is_active ? 'bg-success' : 'bg-secondary'}`}>
          {item.is_active ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      key: 'backup_enabled',
      label: t('sshDevice.columnBackup'),
      sortable: true,
      width: '72px',
      render: (item: SshDevice) => (
        <span className={`badge ${item.backup_enabled ? 'bg-primary' : 'bg-light text-dark border'}`}>
          {item.backup_enabled ? t('ui.yes') : t('ui.no')}
        </span>
      ),
    },
    {
      key: 'tags',
      label: 'Tags',
      sortable: false,
      width: '150px',
      render: (item: SshDevice) => {
        const tags = item.tags ?? [];
        if (tags.length === 0) return <span className="text-muted">-</span>;
        return (
          <div className="d-flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="badge bg-light text-dark border" style={{ fontSize: '0.65rem' }}>
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="badge bg-light text-muted border" style={{ fontSize: '0.65rem' }}>
                +{tags.length - 3}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'description',
      label: 'Descrição',
      sortable: false,
      width: '180px',
      render: (item: SshDevice) => item.description ?? '-',
    },
  ], [t]);

  const bulkActions = useMemo(() => [
    {
      label: t('actions.create'),
      variant: 'primary' as const,
      action: () => setShowCreateModal(true),
    },
    {
      label: 'Terminal',
      variant: 'primary' as const,
      disabled: (selectedItems: SshDevice[]) => selectedItems.length !== 1,
      action: (selectedItems: SshDevice[]) => {
        if (selectedItems.length !== 1) return;
        setTerminalDevice(selectedItems[0]);
      },
    },
    {
      label: 'Testar',
      variant: 'primary' as const,
      disabled: (selectedItems: SshDevice[]) => selectedItems.length !== 1,
      action: (selectedItems: SshDevice[]) => {
        if (selectedItems.length !== 1) return;
        handleTest(selectedItems[0]);
      },
    },
    {
      label: t('sshDevice.manualBackup'),
      variant: 'primary' as const,
      disabled: (selectedItems: SshDevice[]) =>
        selectedItems.length !== 1 ||
        !canQueueManualBackup(selectedItems[0]) ||
        queueManualBackupMutation.isPending,
      action: async (selectedItems: SshDevice[]) => {
        if (selectedItems.length !== 1) return;
        await queueManualBackupMutation.mutateAsync(selectedItems[0].id);
      },
    },
    {
      label: t('actions.edit'),
      variant: 'primary' as const,
      disabled: (selectedItems: SshDevice[]) => selectedItems.length !== 1,
      action: (selectedItems: SshDevice[]) => {
        if (selectedItems.length !== 1) return;
        setSelectedDeviceId(selectedItems[0].id);
        setShowEditModal(true);
      },
    },
    {
      label: t('actions.delete'),
      variant: 'primary' as const,
      disabled: (selectedItems: SshDevice[]) => selectedItems.length === 0,
      action: async (selectedItems: SshDevice[]) => {
        if (selectedItems.length === 0) return;
        const d = selectedItems[0];
        if (!window.confirm(`Remover o device "${d.name}"?`)) return;
        await handleDelete(d);
        queryClient.invalidateQueries({ queryKey: ['ssh-devices'] });
      },
    },
  ], [t, handleTest, handleDelete, queryClient, canQueueManualBackup, queueManualBackupMutation]);

  const modalContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table
          title={tableTitle ?? 'Devices SSH'}
          config={{
            columns: tableColumns,
            data: modalData,
            loading: isLoading,
            searchable: true,
            searchPlaceholder: 'Buscar por nome, host, tipo...',
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
            emptyMessage: 'Nenhum device SSH cadastrado',
            pagination: pagination,
          }}
          tableId="ssh-devices-list"
          syncWithHeader={false}
          onRefresh={refetch}
          onSelectionChange={(items) => handleSelectionChange(items)}
          onPageChange={(page) => setTimeout(() => tableFilters.setPage(page), 0)}
          onPageSizeChange={(limit) => setTimeout(() => tableFilters.setLimit(limit), 0)}
          onSort={(col, dir) => setTimeout(() => tableFilters.setSort(col, dir), 0)}
          onSearch={(search) => tableFilters.setSearch(search)}
          search={tableFilters.search}
        />
      </div>
    </div>
  );

  const subModals = (
    <>
      <SshDeviceModal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedDeviceId(null);
        }}
        deviceId={showEditModal ? selectedDeviceId : null}
        defaultClienteId={clienteIdFilter}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['ssh-devices'] });
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedDeviceId(null);
          clearSelection();
        }}
      />
      {terminalDevice && (
        <SshTerminalModal
          show={!!terminalDevice}
          onClose={() => setTerminalDevice(null)}
          device={terminalDevice}
        />
      )}
    </>
  );

  if (skipWrapper) return <>{modalContent}{subModals}</>;

  return (
    <>
      <DraggableModal
        show={show}
        onClose={() => { clearSelection(); onClose(); }}
        title="Devices SSH"
        size="xl"
        modalId="ssh-devices-list-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>
      {subModals}
    </>
  );
};

export default SshDeviceListModal;
