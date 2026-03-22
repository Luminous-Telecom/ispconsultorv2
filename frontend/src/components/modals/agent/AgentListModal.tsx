import React, { useState, useCallback, useMemo } from 'react';
import { useAgents, useDeleteAgent, useTestAgent, useUpdateAgent } from 'hooks/useAgents';
import { useModalSelect } from 'hooks/useModalSelect';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useI18n } from 'contexts/I18nContext';
import { Agent } from 'types';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import AgentModal from './AgentModal';
import AgentTerminalModal from './AgentTerminalModal';
import { formatDateTime } from 'utils/formatters';

interface AgentListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  clienteIdFilter?: number;
  tableTitle?: string;
  /** Título da janela. */
  modalTitle?: string;
  /** Modo seletor: clique na linha ou botão Selecionar. */
  onSelectAgent?: (agent: Agent) => void;
}

const AgentListModal: React.FC<AgentListModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  clienteIdFilter,
  tableTitle,
  modalTitle,
  onSelectAgent,
}) => {
  const { t } = useI18n();
  const { success } = useNotificationContext();

  const agentListFilters = useMemo(() => {
    if (clienteIdFilter != null) return { cliente_id: clienteIdFilter };
    return undefined;
  }, [clienteIdFilter]);

  const { data: agents = [], isLoading, refetch } = useAgents(agentListFilters);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTerminalModal, setShowTerminalModal] = useState(false);

  const deleteMutation = useDeleteAgent();
  const updateMutation = useUpdateAgent();
  const testMutation = useTestAgent();

  const { selectedItem, handleSelectionChange, clearSelection } = useModalSelect<Agent>(
    onSelectAgent
      ? (agent) => {
          onSelectAgent(agent);
          onClose();
        }
      : undefined
  );

  const handleConfirmSelect = useCallback(
    (selectedItems?: Agent[]) => {
      const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
      if (item && onSelectAgent) {
        clearSelection();
        onSelectAgent(item);
        onClose();
      }
    },
    [selectedItem, clearSelection, onSelectAgent, onClose]
  );

  const tableData = useMemo(() => agents.map((a) => ({ ...a })), [agents]);

  const handleDelete = useCallback(async (agent: Agent) => {
    if (!window.confirm(`Remover o agente "${agent.name}"? O token será invalidado.`)) return;
    try {
      await deleteMutation.mutateAsync(agent.id);
      clearSelection();
      success('Agente removido.');
    } catch { /* hook notifica */ }
  }, [deleteMutation, clearSelection, success]);

  const handleSetAgentActive = useCallback(async (agent: Agent, isActive: boolean) => {
    if (agent.is_active === isActive) return;
    try {
      await updateMutation.mutateAsync({ id: agent.id, data: { is_active: isActive } });
    } catch { /* hook notifica */ }
  }, [updateMutation]);

  const handleTest = useCallback(async (agent: Agent) => {
    try {
      const result = await testMutation.mutateAsync(agent.id);
      if (result.success && result.latency != null) {
        success(`Agente "${agent.name}" respondeu. Latência: ${result.latency}ms`);
      } else if (result.success) {
        success(`Agente "${agent.name}" respondeu.`);
      }
    } catch { /* hook notifica */ }
  }, [testMutation, success]);

  const tableColumns: TableConfig<Agent>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: 'ID',
      sortable: false,
      width: '70px',
      render: (item: Agent) => <span className="font-monospace small">{item.id}</span>,
    },
    {
      key: 'online',
      label: 'Status',
      width: '90px',
      render: (item: Agent) => (
        <span className={`badge ${item.online ? 'bg-success' : 'bg-secondary'}`}>
          {item.online ? 'Online' : 'Offline'}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
      render: (item: Agent) => <span className="fw-semibold">{item.name}</span>,
    },
    {
      key: 'cliente',
      label: 'Cliente',
      sortable: false,
      width: '160px',
      render: (item: Agent) => {
        const c = item.cliente;
        const label = c?.nome_fantasia?.trim() || c?.razao_social?.trim();
        return <span className="small">{label || '—'}</span>;
      },
    },
    {
      key: 'hostname',
      label: 'Host',
      render: (item: Agent) => (
        <span className="text-muted small">{item.hostname ?? '—'}</span>
      ),
    },
    {
      key: 'ip_address',
      label: 'IP',
      width: '130px',
      render: (item: Agent) => (
        <span className="text-muted small font-monospace">{item.ip_address ?? '—'}</span>
      ),
    },
    {
      key: 'os_info',
      label: 'OS',
      render: (item: Agent) => (
        <span className="text-muted small">{item.os_info ?? '—'}</span>
      ),
    },
    {
      key: 'last_seen_at',
      label: 'Última conexão',
      render: (item: Agent) => (
        <span className="small">{item.last_seen_at ? formatDateTime(item.last_seen_at) : '—'}</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Ativo',
      width: '70px',
      render: (item: Agent) => (
        <span className={`badge ${item.is_active ? 'bg-success' : 'bg-secondary'}`}>
          {item.is_active ? 'Sim' : 'Não'}
        </span>
      ),
    },
  ], []);

  const bulkActions = useMemo(() => {
    if (onSelectAgent) {
      return [
        {
          label: t('actions.cancel'),
          variant: 'primary' as const,
          requiresSelection: false,
          onClick: () => {
            clearSelection();
            onClose();
          },
        },
        {
          label: t('buttons.select'),
          variant: 'primary' as const,
          disabled: (items: Agent[]) => items.length === 0 && !selectedItem,
          onClick: (items: Agent[]) => handleConfirmSelect(items),
        },
      ];
    }
    return [
    {
      label: 'Novo',
      variant: 'primary' as const,
      requiresSelection: false,
      onClick: () => setShowCreateModal(true),
    },
    {
      label: 'Editar',
      variant: 'primary' as const,
      disabled: (items: Agent[]) => items.length !== 1,
      onClick: (items: Agent[]) => {
        if (items.length !== 1) return;
        handleSelectionChange(items);
        setShowEditModal(true);
      },
    },
    {
      label: 'Deletar',
      variant: 'primary' as const,
      disabled: (items: Agent[]) => items.length !== 1,
      onClick: async (items: Agent[]) => {
        if (items.length !== 1) return;
        await handleDelete(items[0]);
      },
    },
    {
      label: 'Terminal',
      variant: 'primary' as const,
      disabled: (items: Agent[]) => items.length !== 1 || !items[0]?.online,
      onClick: (items: Agent[]) => {
        if (items.length !== 1 || !items[0].online) return;
        handleSelectionChange(items);
        setShowTerminalModal(true);
      },
    },
    {
      label: 'Testar',
      variant: 'primary' as const,
      disabled: (items: Agent[]) => items.length !== 1,
      onClick: (items: Agent[]) => {
        if (items.length !== 1) return;
        handleTest(items[0]);
      },
    },
    {
      label: 'Status',
      variant: 'primary' as const,
      disabled: (items: Agent[]) => items.length !== 1,
      dropdown: [
        {
          label: 'Ativar',
          disabled: (items: Agent[]) => items.length !== 1 || !!items[0]?.is_active,
          action: (items?: Agent[]) => {
            if (!items || items.length !== 1) return;
            handleSetAgentActive(items[0], true);
          },
        },
        {
          label: 'Desativar',
          disabled: (items: Agent[]) => items.length !== 1 || !items[0]?.is_active,
          action: (items?: Agent[]) => {
            if (!items || items.length !== 1) return;
            handleSetAgentActive(items[0], false);
          },
        },
      ],
    },
  ];
  }, [
    onSelectAgent,
    t,
    clearSelection,
    onClose,
    selectedItem,
    handleConfirmSelect,
    handleDelete,
    handleTest,
    handleSetAgentActive,
    handleSelectionChange,
  ]);

  const content = (
    <>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table<Agent>
            title={tableTitle ?? 'Agentes Backnet'}
            config={{
              columns: tableColumns,
              data: tableData,
              loading: isLoading,
              sortable: true,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              emptyMessage: 'Nenhum agente cadastrado',
              bulkActions: bulkActions.map((a) => ({
                key: a.label.toLowerCase().replace(/\s+/g, '-'),
                label: a.label,
                ...('onClick' in a && a.onClick ? { onClick: a.onClick } : {}),
                ...('dropdown' in a && a.dropdown ? { dropdown: a.dropdown } : {}),
                disabled: 'disabled' in a ? a.disabled : undefined,
                variant: a.variant,
                requiresSelection: 'requiresSelection' in a ? a.requiresSelection : undefined,
              })),
            }}
            tableId="agents-list"
            syncWithHeader={false}
            onRefresh={refetch}
            onSelectionChange={(items) => handleSelectionChange(items)}
            onRowClick={
              onSelectAgent
                ? (item) => {
                    onSelectAgent(item);
                    onClose();
                  }
                : undefined
            }
            onRowDoubleClick={
              onSelectAgent
                ? (item) => {
                    onSelectAgent(item);
                    onClose();
                  }
                : undefined
            }
          />
        </div>
      </div>

      {!onSelectAgent && (
        <>
          <AgentModal
            show={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              refetch();
            }}
            clienteId={clienteIdFilter}
          />

          {selectedItem && (
            <AgentModal
              show={showEditModal}
              onClose={() => setShowEditModal(false)}
              onSuccess={() => {
                setShowEditModal(false);
                refetch();
              }}
              agentData={selectedItem}
            />
          )}

          {selectedItem && (
            <AgentTerminalModal
              show={showTerminalModal}
              onClose={() => setShowTerminalModal(false)}
              agent={selectedItem}
            />
          )}
        </>
      )}

    </>
  );

  if (skipWrapper) return <>{content}</>;

  return (
    <DraggableModal
      show={show}
      onClose={() => {
        clearSelection();
        onClose();
      }}
      title={modalTitle ?? 'Agentes Backnet'}
      size="xl"
    >
      {content}
    </DraggableModal>
  );
};

export default AgentListModal;
