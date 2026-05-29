import React, { useState, useCallback, useMemo } from 'react';
import { useAgents, useDeleteAgent, useTestAgent, useUpdateAgent } from 'hooks/useAgents';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useI18n } from 'contexts/I18nContext';
import { useBulkBtn } from 'components/ui';
import { Agent } from 'types';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import AgentModal from './AgentModal';
import AgentTerminalModal from './AgentTerminalModal';
import ImprimirModal from 'components/common/ImprimirModal';
import { formatDateTime } from 'utils/formatters';

interface AgentListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  clienteIdFilter?: number;
  tableTitle?: string;
  modalTitle?: string;
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
  const bulkBtn = useBulkBtn();
  const { success } = useNotificationContext();

  const list = useEntityListModal<Agent>({
    onClose,
    onSelect: onSelectAgent,
  });

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

  const tableData = useMemo(() => agents.map((a) => ({ ...a })), [agents]);

  const handleDelete = useCallback(
    async (agent: Agent) => {
      if (!window.confirm(`Remover o agente "${agent.name}"? O token será invalidado.`)) return;
      try {
        await deleteMutation.mutateAsync(agent.id);
        list.clearSelection();
        success('Agente removido.');
      } catch {
        /* hook notifica */
      }
    },
    [deleteMutation, list, success]
  );

  const handleSetAgentActive = useCallback(
    async (agent: Agent, isActive: boolean) => {
      if (agent.is_active === isActive) return;
      try {
        await updateMutation.mutateAsync({ id: agent.id, data: { is_active: isActive } });
      } catch {
        /* hook notifica */
      }
    },
    [updateMutation]
  );

  const handleAudit = useCallback(
    (agent: Agent) => {
      list.auditoria.handleAudit('Agent', agent.id);
    },
    [list.auditoria]
  );

  const handleTest = useCallback(
    async (agent: Agent) => {
      try {
        const result = await testMutation.mutateAsync(agent.id);
        if (result.success && result.latency != null) {
          success(`Agente "${agent.name}" respondeu. Latência: ${result.latency}ms`);
        } else if (result.success) {
          success(`Agente "${agent.name}" respondeu.`);
        }
      } catch {
        /* hook notifica */
      }
    },
    [testMutation, success]
  );

  const columns = useMemo(
    (): ListModalConfig<Agent>['columns'] => [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '70px',
        render: (item) => <span className="font-monospace small">{item.id}</span>,
      },
      {
        key: 'online',
        label: 'Status',
        sortable: true,
        width: '90px',
        render: (item) => (
          <span className={`badge ${item.online ? 'bg-success' : 'bg-secondary'}`}>
            {item.online ? 'Online' : 'Offline'}
          </span>
        ),
      },
      {
        key: 'name',
        label: 'Nome',
        sortable: true,
        render: (item) => <span className="fw-semibold">{item.name}</span>,
      },
      {
        key: 'cliente',
        label: 'Cliente',
        sortable: true,
        width: '160px',
        render: (item) => {
          const c = item.cliente;
          const label = c?.nome_fantasia?.trim() || c?.razao_social?.trim();
          return <span className="small">{label || '—'}</span>;
        },
      },
      {
        key: 'hostname',
        label: 'Host',
        render: (item) => <span className="text-muted small">{item.hostname ?? '—'}</span>,
      },
      {
        key: 'ip_address',
        label: 'IP',
        width: '130px',
        render: (item) => (
          <span className="text-muted small font-monospace">{item.ip_address ?? '—'}</span>
        ),
      },
      {
        key: 'os_info',
        label: 'OS',
        render: (item) => <span className="text-muted small">{item.os_info ?? '—'}</span>,
      },
      {
        key: 'last_seen_at',
        label: 'Última conexão',
        render: (item) => (
          <span className="small">{item.last_seen_at ? formatDateTime(item.last_seen_at) : '—'}</span>
        ),
      },
      {
        key: 'is_active',
        label: 'Ativo',
        sortable: true,
        width: '70px',
        render: (item) => (
          <span className={`badge ${item.is_active ? 'bg-success' : 'bg-secondary'}`}>
            {item.is_active ? 'Sim' : 'Não'}
          </span>
        ),
      },
    ],
    []
  );

  const bulkActions = useMemo(() => {
    if (onSelectAgent) {
      return list.buildSelectBulkActions();
    }
    return [
      {
        label: bulkBtn.novo.label,
        variant: bulkBtn.novo.variant,
        requiresSelection: false,
        action: () => setShowCreateModal(true),
      },
      {
        label: bulkBtn.editar.label,
        variant: bulkBtn.editar.variant,
        disabled: (items: Agent[]) => items.length !== 1,
        action: (items: Agent[]) => {
          if (items.length !== 1) return;
          list.handleSelectionChange(items);
          setShowEditModal(true);
        },
      },
      {
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (items: Agent[]) => items.length !== 1,
        action: async (items: Agent[]) => {
          if (items.length !== 1) return;
          await handleDelete(items[0]);
        },
      },
      {
        label: 'Terminal',
        variant: 'primary' as const,
        disabled: (items: Agent[]) => items.length !== 1 || !items[0]?.online,
        action: (items: Agent[]) => {
          if (items.length !== 1 || !items[0].online) return;
          list.handleSelectionChange(items);
          setShowTerminalModal(true);
        },
      },
      {
        label: 'Testar',
        variant: 'primary' as const,
        disabled: (items: Agent[]) => items.length !== 1,
        action: (items: Agent[]) => {
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
    bulkBtn,
    onSelectAgent,
    list,
    handleDelete,
    handleTest,
    handleSetAgentActive,
  ]);

  const handleRowSelect = useCallback(
    (item: Agent) => {
      onSelectAgent?.(item);
      onClose();
    },
    [onSelectAgent, onClose]
  );

  const listModal = (
    <ListModal<Agent>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      modalSize="xl"
      wrapperTitle={modalTitle}
      config={{
        title: tableTitle ?? modalTitle ?? 'Agentes Backnet',
        columns,
        emptyMessage: 'Nenhum agente cadastrado',
      }}
      data={tableData}
      loading={isLoading}
      onRefresh={refetch}
      bulkActions={bulkActions}
      onSelectionChange={list.handleSelectionChange}
      onRowClick={onSelectAgent ? handleRowSelect : undefined}
      onRowDoubleClick={onSelectAgent ? handleRowSelect : undefined}
      onAudit={!onSelectAgent ? handleAudit : undefined}
      auditEntity={!onSelectAgent ? 'Agent' : undefined}
      tableId="agents-list"
      modalId="agents-list-modal"
    />
  );

  const auxiliaryModals = !onSelectAgent ? (
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

      {list.selectedItem && (
        <AgentModal
          show={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            refetch();
          }}
          agentData={list.selectedItem}
        />
      )}

      {list.selectedItem && (
        <AgentTerminalModal
          show={showTerminalModal}
          onClose={() => setShowTerminalModal(false)}
          agent={list.selectedItem}
        />
      )}

      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-agent-modal"
      />
    </>
  ) : null;

  if (skipWrapper) {
    return (
      <>
        {listModal}
        {auxiliaryModals}
      </>
    );
  }

  return (
    <>
      {listModal}
      {auxiliaryModals}
    </>
  );
};

export default AgentListModal;
