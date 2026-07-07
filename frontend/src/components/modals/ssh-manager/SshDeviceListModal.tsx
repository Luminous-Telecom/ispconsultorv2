import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSshDevices,
  useDeleteSshDevice,
  useTestSshDevice,
  useQueueManualSshDeviceBackup,
} from 'hooks/useSshDevices';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useI18n } from 'contexts/I18nContext';
import { SshDevice } from 'types';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import SshDeviceModal from './sshDeviceModal';
import { canQueueManualSshDeviceBackup } from './sshDeviceModal/sshDeviceModalUtils';
import { getClienteRazaoSocialLabel } from 'utils/clienteDisplay';
import SshTerminalModal from './SshTerminalModal';
import ImprimirModal from 'components/common/ImprimirModal';

interface SshDeviceListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  /** Quando definido, lista apenas devices vinculados ao cliente e associa novos cadastros a ele. */
  clienteIdFilter?: number;
  tableTitle?: string;
}

const DEVICE_TYPE_LABELS: Record<string, string> = {
  mikrotik: 'MikroTik (RouterOS)',
  swos: 'MikroTik (SwOS)',
  cisco: 'Cisco (em breve)',
  huawei: 'Huawei NE (VRP)',
};

const SshDeviceListModal: React.FC<SshDeviceListModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  clienteIdFilter,
  tableTitle,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();

  const list = useEntityListModal<SshDevice>({ onClose });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [terminalDevice, setTerminalDevice] = useState<SshDevice | null>(null);

  useEffect(() => {
    if (!list.tableFilters.sortColumn) {
      list.tableFilters.setSort('name', 'asc');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading, refetch } = useSshDevices({
    search: list.tableFilters.debouncedSearch || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
    ...(clienteIdFilter != null ? { cliente_id: clienteIdFilter } : {}),
  });

  const deleteMutation = useDeleteSshDevice();
  const testMutation = useTestSshDevice();
  const queueManualBackupMutation = useQueueManualSshDeviceBackup();

  const rawData = useMemo(() => data?.data ?? [], [data]);
  const modalData = useMemo(() => {
    const term = (list.tableFilters.search || '').toLowerCase().trim();
    if (!term) return rawData;
    const field = list.tableFilters.searchField || 'name';
    return rawData.filter((d: SshDevice) => {
      const val =
        field === 'host'
          ? `${d.host}:${d.port}`
          : String((d as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
      return val.toLowerCase().includes(term);
    });
  }, [rawData, list.tableFilters.search, list.tableFilters.searchField]);

  const pagination = useMemo(() => {
    const pag = data?.pagination;
    if (!pag) return list.buildPagination(null);
    const perPage = list.tableFilters.limit;
    const total = modalData.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const currentPage = Math.min(Math.max(1, list.tableFilters.page), lastPage);
    return {
      ...pag,
      current_page: currentPage,
      per_page: perPage,
      total,
      last_page: lastPage,
      from: total > 0 ? (currentPage - 1) * perPage + 1 : 0,
      to: Math.min(currentPage * perPage, total),
    };
  }, [data?.pagination, modalData.length, list]);

  const handleDelete = useCallback(
    async (device: SshDevice) => {
      try {
        await deleteMutation.mutateAsync(device.id);
        list.clearSelection();
        refetch();
      } catch {
        // erro tratado pelo hook
      }
    },
    [deleteMutation, list, refetch]
  );

  const canQueueManualBackup = useCallback(
    (d: SshDevice | undefined) => canQueueManualSshDeviceBackup(d),
    []
  );

  const isSwos = useCallback(
    (d: SshDevice) => String(d.device_type ?? '').toLowerCase() === 'swos',
    []
  );

  const handleTest = useCallback(
    async (device: SshDevice) => {
      try {
        const result = await testMutation.mutateAsync(device.id);
        if (result.success) {
          success(
            `Conexão com "${device.name}" bem-sucedida! Latência: ${result.latency}ms`
          );
        }
      } catch {
        // erro tratado pelo hook
      }
    },
    [testMutation, success]
  );

  const columns = useMemo(
    (): ListModalConfig<SshDevice>['columns'] => [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '70px',
        render: (item) => <span className="font-monospace small">{item.id}</span>,
      },
      {
        key: 'name',
        label: 'Nome',
        sortable: true,
        width: '160px',
        render: (item) => <span className="fw-semibold">{item.name}</span>,
      },
      {
        key: 'cliente',
        label: 'Cliente',
        sortable: true,
        width: '160px',
        sortValue: (item) => {
          return getClienteRazaoSocialLabel(item.cliente, '');
        },
        render: (item) => {
          const label = getClienteRazaoSocialLabel(item.cliente);
          return <span className="small">{label}</span>;
        },
      },
      {
        key: 'device_type',
        label: 'Tipo',
        sortable: true,
        width: '100px',
        render: (item) => DEVICE_TYPE_LABELS[item.device_type] ?? item.device_type,
      },
      {
        key: 'host',
        label: 'IP Interno',
        sortable: true,
        width: '150px',
        render: (item) => (
          <span className="font-monospace small">
            {item.host}:{item.port}
          </span>
        ),
      },
      {
        key: 'agent',
        label: 'Agente Túnel',
        sortable: true,
        width: '160px',
        sortValue: (item) => item.agent?.name ?? '',
        render: (item) => {
          const agent = item.agent;
          if (!agent) return <span className="text-muted">-</span>;
          return (
            <span>
              <span
                className={`badge ${agent.online ? 'bg-success' : 'bg-secondary'} fs-compact me-1`}
              >
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
        render: (item) => (
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
        render: (item) => (
          <span
            className={`badge ${item.backup_enabled ? 'bg-primary' : 'bg-light text-muted border'}`}
          >
            {item.backup_enabled ? t('ui.yes') : t('ui.no')}
          </span>
        ),
      },
      {
        key: 'description',
        label: 'Descrição',
        sortable: true,
        render: (item) => item.description ?? '-',
      },
    ],
    [t]
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nome' },
      { key: 'host', label: t('audit.ip') },
      { key: 'device_type', label: 'Tipo' },
    ],
    [t]
  );

  const bulkActions = useMemo(
    () => [
      {
        label: list.bulkBtn.novo.label,
        variant: list.bulkBtn.novo.variant,
        action: () => setShowCreateModal(true),
      },
      {
        label: list.bulkBtn.editar.label,
        variant: list.bulkBtn.editar.variant,
        disabled: (selectedItems: SshDevice[]) => selectedItems.length !== 1,
        action: (selectedItems: SshDevice[]) => {
          if (selectedItems.length !== 1) return;
          setSelectedDeviceId(selectedItems[0].id);
          setShowEditModal(true);
        },
      },
      {
        label: list.bulkBtn.deletar.label,
        variant: list.bulkBtn.deletar.variant,
        disabled: (selectedItems: SshDevice[]) => selectedItems.length === 0,
        action: async (selectedItems: SshDevice[]) => {
          if (selectedItems.length === 0) return;
          const d = selectedItems[0];
          if (!window.confirm(`Remover o device "${d.name}"?`)) return;
          await handleDelete(d);
          queryClient.invalidateQueries({ queryKey: ['ssh-devices'] });
        },
      },
      {
        label: 'Terminal',
        variant: 'primary' as const,
        disabled: (selectedItems: SshDevice[]) =>
          selectedItems.length !== 1 || isSwos(selectedItems[0]),
        action: (selectedItems: SshDevice[]) => {
          if (selectedItems.length !== 1) return;
          setTerminalDevice(selectedItems[0]);
        },
      },
      {
        label: 'Testar',
        variant: 'primary' as const,
        disabled: (selectedItems: SshDevice[]) =>
          selectedItems.length !== 1 || isSwos(selectedItems[0]),
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
          try {
            await queueManualBackupMutation.mutateAsync(selectedItems[0].id);
          } catch {
            // Erro já exibido pelo onError do useQueueManualSshDeviceBackup
          }
        },
      },
    ],
    [
      list.bulkBtn,
      handleTest,
      handleDelete,
      queryClient,
      canQueueManualBackup,
      queueManualBackupMutation,
      isSwos,
      t,
    ]
  );

  const defaultTitle = tableTitle ?? 'Equipamentos';

  const listModal = (
    <ListModal<SshDevice>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      showEmbeddedTableTitle={skipWrapper && Boolean(tableTitle)}
      modalSize="xl"
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: '',
        searchFields,
        emptyMessage: 'Nenhum equipamento cadastrado',
      }}
      data={modalData}
      loading={isLoading}
      search={list.tableFilters.search}
      onSearchChange={list.handleSearchChange}
      onSearchFieldChange={list.tableFilters.setSearchField}
      sortColumn={list.tableFilters.sortColumn}
      sortDirection={list.tableFilters.sortDirection}
      onSortChange={list.tableFilters.setSort}
      pagination={pagination}
      onPageChange={list.tableFilters.setPage}
      onLimitChange={list.tableFilters.setLimit}
      onRefresh={refetch}
      bulkActions={bulkActions}
      onSelectionChange={list.handleSelectionChange}
      onAudit={(device) => list.auditoria.handleAudit('SshDevice', device.id)}
      auditEntity="SshDevice"
      tableId="ssh-devices-list"
      modalId="ssh-devices-list-modal"
    />
  );

  const auxiliaryModals = (
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
          list.clearSelection();
        }}
      />
      {terminalDevice && (
        <SshTerminalModal
          show={!!terminalDevice}
          onClose={() => setTerminalDevice(null)}
          device={terminalDevice}
        />
      )}
      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-ssh-device-modal"
      />
    </>
  );

  return (
    <>
      {listModal}
      {auxiliaryModals}
    </>
  );
};

export default SshDeviceListModal;
