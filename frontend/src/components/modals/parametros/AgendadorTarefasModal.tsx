import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import { SaasSchedulerService, type RotinaAgendada } from 'services/saas/saasSchedulerService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import RotinaAgendadaModal from './RotinaAgendadaModal';
import { useAuditoria } from 'hooks/useAuditoria';
import ImprimirModal from 'components/common/ImprimirModal';
import { useConfirmModal } from 'hooks/useConfirmModal';
import ConfirmModal from 'components/modals/ConfirmModal';
import { useI18n } from 'contexts/I18nContext';
import { getSystemButtonBulkPropsByKey } from 'components/ui';
import { extractApiErrorMessageSync } from 'utils/apiErrorHelper';
import { getCronDisplayFromRotina } from 'utils/schedulerCronDisplay';
import { formatDateTime } from 'utils/formatters';

function displayProximaUltima(iso: string | undefined): string {
  if (iso == null || iso === '') return '—';
  const d = formatDateTime(iso);
  return d === '-' ? '—' : d;
}

const QUERY_KEY = 'saas-agendador-tarefas';
const MODAL_ID = 'saas-agendador-tarefas-modal';
const TABLE_ID = 'saas-agendador-tarefas';
const AUDITORIA_MODAL_ID = 'saas-auditoria-scheduled-routine-modal';

interface AgendadorTarefasModalProps {
  show: boolean;
  onClose: () => void;
}

const AgendadorTarefasModal: React.FC<AgendadorTarefasModalProps> = ({ show, onClose }) => {
  const { t } = useI18n();
  const bulkBtn = useMemo(
    () => ({
      novo: getSystemButtonBulkPropsByKey('actions.new', t),
      editar: getSystemButtonBulkPropsByKey('actions.edit', t),
      deletar: getSystemButtonBulkPropsByKey('actions.delete', t),
    }),
    [t]
  );
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotificationContext();
  const auditoria = useAuditoria();
  const { modalProps } = useConfirmModal();

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const handleAudit = (rotina: RotinaAgendada) => {
    auditoria.handleAudit('SaasScheduledRoutine', rotina.id);
  };

  const { selectedItem, handleSelectionChange, clearSelection } = useModalSelect<RotinaAgendada>();

  const tableColumns: TableConfig<RotinaAgendada>['columns'] = useMemo(
    () => [
      {
        key: 'nome',
        label: t('scheduler.task'),
        sortable: true,
        minWidth: 220,
        render: (item: RotinaAgendada) => <span title={item.nome}>{item.nome}</span>,
      },
      {
        key: 'cron_minuto',
        label: t('scheduler.cronMinute'),
        sortable: true,
        minWidth: 96,
        render: (item: RotinaAgendada) => getCronDisplayFromRotina(item).minuto,
      },
      {
        key: 'cron_hora',
        label: t('scheduler.cronHour'),
        sortable: true,
        minWidth: 88,
        render: (item: RotinaAgendada) => getCronDisplayFromRotina(item).hora,
      },
      {
        key: 'cron_dia_mes',
        label: t('scheduler.cronDayOfMonth'),
        sortable: true,
        minWidth: 100,
        render: (item: RotinaAgendada) => getCronDisplayFromRotina(item).diaMes,
      },
      {
        key: 'cron_mes',
        label: t('scheduler.cronMonth'),
        sortable: true,
        minWidth: 88,
        render: (item: RotinaAgendada) => getCronDisplayFromRotina(item).mes,
      },
      {
        key: 'cron_dia_semana',
        label: t('scheduler.cronDayOfWeek'),
        sortable: true,
        minWidth: 112,
        render: (item: RotinaAgendada) => getCronDisplayFromRotina(item).diaSemana,
      },
      {
        key: 'execucoes_com_erro',
        label: t('scheduler.execWithError'),
        sortable: true,
        minWidth: 112,
        render: (item: RotinaAgendada) => (
          <span className="text-nowrap">{item.execucoes_com_erro ?? '—'}</span>
        ),
      },
      {
        key: 'total_execucoes',
        label: t('scheduler.execTotal'),
        sortable: true,
        minWidth: 72,
        render: (item: RotinaAgendada) => (
          <span className="text-nowrap">{item.total_execucoes ?? '—'}</span>
        ),
      },
      {
        key: 'execucoes_com_sucesso',
        label: t('scheduler.execSuccess'),
        sortable: true,
        minWidth: 96,
        render: (item: RotinaAgendada) => (
          <span className="text-nowrap">{item.execucoes_com_sucesso ?? '—'}</span>
        ),
      },
      {
        key: 'proxima_execucao',
        label: t('scheduler.nextRun'),
        sortable: true,
        minWidth: 152,
        render: (item: RotinaAgendada) => (
          <span className="text-nowrap">{displayProximaUltima(item.proxima_execucao)}</span>
        ),
      },
      {
        key: 'ultima_execucao',
        label: t('scheduler.lastRun'),
        sortable: true,
        minWidth: 152,
        render: (item: RotinaAgendada) => (
          <span className="text-nowrap">
            {item.ultima_execucao_formatada ?? displayProximaUltima(item.ultima_execucao)}
          </span>
        ),
      },
      {
        key: 'ativo',
        label: t('table.status'),
        sortable: true,
        badgeLabels: [t('status.active'), t('status.inactive')],
        render: (item: RotinaAgendada) => (
          <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
            {item.ativo ? t('status.active') : t('status.inactive')}
          </span>
        ),
      },
    ],
    [t]
  );

  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'tipo', label: t('scheduler.type') },
    { key: 'alvo', label: t('scheduler.scope') },
    { key: 'minuto', label: t('scheduler.cronMinute') },
  ];

  const { data: rotinasData, isLoading, refetch } = useQuery({
    queryKey: [
      QUERY_KEY,
      tableFilters.page,
      tableFilters.limit,
      tableFilters.debouncedSearch,
      tableFilters.searchField,
      tableFilters.sortColumn,
      tableFilters.sortDirection,
    ],
    queryFn: () =>
      SaasSchedulerService.getRotinas({
        page: tableFilters.page,
        limit: tableFilters.limit,
        search: tableFilters.debouncedSearch,
        searchField: tableFilters.searchField || undefined,
        sort: tableFilters.sortColumn,
        direction: tableFilters.sortDirection,
      }),
    enabled: show,
  });

  const paginatedRotinas = useMemo(() => rotinasData?.data || [], [rotinasData]);

  const pagination = useMemo(() => {
    if (rotinasData?.pagination) {
      return {
        from: (rotinasData.pagination.page - 1) * rotinasData.pagination.limit + 1,
        to: Math.min(rotinasData.pagination.page * rotinasData.pagination.limit, rotinasData.pagination.total),
        total: rotinasData.pagination.total,
        current_page: rotinasData.pagination.page,
        last_page: rotinasData.pagination.pages || Math.ceil(rotinasData.pagination.total / rotinasData.pagination.limit),
        per_page: rotinasData.pagination.limit,
      };
    }
    return {
      from: 0,
      to: 0,
      total: 0,
      current_page: 1,
      last_page: 1,
      per_page: 15,
    };
  }, [rotinasData?.pagination]);

  const handleExecute = useCallback(
    async (rotina: RotinaAgendada) => {
      const confirmed = window.confirm(t('scheduler.confirmExecute'));
      if (!confirmed) return;
      try {
        await SaasSchedulerService.executeRotina?.(rotina.id);
        success(t('scheduler.routineStarted'));
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      } catch (error: unknown) {
        showError(`${t('messages.error')}: ${extractApiErrorMessageSync(error)}`);
      }
    },
    [t, success, queryClient, showError]
  );

  const toggleAtivoMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) => SaasSchedulerService.updateRotina(id, { ativo }),
    onSuccess: (_data, vars) => {
      success(vars.ativo ? t('scheduler.routineActivatedSuccess') : t('scheduler.routineDeactivatedSuccess'));
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error: unknown) => {
      showError(`${t('messages.error')}: ${extractApiErrorMessageSync(error)}`);
    },
  });

  const handleDelete = useCallback(
    async (rotina: RotinaAgendada) => {
      const confirmed = window.confirm(t('scheduler.confirmDelete'));
      if (!confirmed) return;
      try {
        await SaasSchedulerService.deleteRotina(rotina.id);
        success(t('scheduler.successDelete'));
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      } catch (error: unknown) {
        showError(`${t('messages.error')}: ${extractApiErrorMessageSync(error)}`);
      }
    },
    [t, success, queryClient, showError]
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRotinaId, setSelectedRotinaId] = useState<number | null>(null);

  const handleCreate = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleEdit = useCallback(
    (selectedItems: RotinaAgendada[]) => {
      const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
      if (item) {
        setSelectedRotinaId(item.id);
        setShowEditModal(true);
      }
    },
    [selectedItem]
  );

  const handleSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    await refetch();
  };

  const bulkActions = useMemo(
    () => [
      {
        key: 'new',
        label: bulkBtn.novo.label,
        variant: bulkBtn.novo.variant,
        requiresSelection: false as const,
        action: handleCreate,
      },
      {
        key: 'edit',
        label: bulkBtn.editar.label,
        variant: bulkBtn.editar.variant,
        disabled: (selectedItems: RotinaAgendada[]) => selectedItems.length === 0 && !selectedItem,
        action: handleEdit,
      },
      {
        key: 'delete',
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (selectedItems: RotinaAgendada[]) => selectedItems.length === 0 && !selectedItem,
        action: (selectedItems: RotinaAgendada[]) => {
          const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
          if (item) void handleDelete(item);
        },
      },
      {
        key: 'scheduler-ativo',
        label: t('table.status'),
        variant: 'primary' as const,
        disabled: (selectedItems: RotinaAgendada[]) =>
          toggleAtivoMutation.isPending || (selectedItems.length === 0 && !selectedItem),
        dropdown: [
          {
            label: t('scheduler.activate'),
            disabled: (selectedItems: RotinaAgendada[]) => {
              if (toggleAtivoMutation.isPending) return true;
              const r = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
              return !r || r.ativo;
            },
            action: (selectedItems?: RotinaAgendada[]) => {
              const r = selectedItems?.length ? selectedItems[0] : selectedItem;
              if (r && !r.ativo) toggleAtivoMutation.mutate({ id: r.id, ativo: true });
            },
          },
          {
            label: t('scheduler.deactivate'),
            disabled: (selectedItems: RotinaAgendada[]) => {
              if (toggleAtivoMutation.isPending) return true;
              const r = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
              return !r || !r.ativo;
            },
            action: (selectedItems?: RotinaAgendada[]) => {
              const r = selectedItems?.length ? selectedItems[0] : selectedItem;
              if (r && r.ativo) toggleAtivoMutation.mutate({ id: r.id, ativo: false });
            },
          },
        ],
      },
      {
        key: 'execute',
        label: t('scheduler.execute'),
        variant: 'primary' as const,
        disabled: (selectedItems: RotinaAgendada[]) => selectedItems.length === 0 && !selectedItem,
        action: (selectedItems: RotinaAgendada[]) => {
          const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
          if (item) void handleExecute(item);
        },
      },
    ],
    [bulkBtn, t, selectedItem, handleCreate, handleEdit, handleExecute, handleDelete, toggleAtivoMutation]
  );

  const handleSearchChange = useCallback(
    (search: string, field?: string) => {
      setTimeout(() => {
        tableFilters.setSearch(search);
        if (field) tableFilters.setSearchField(field);
      }, 0);
    },
    [tableFilters]
  );

  return (
    <>
      <DraggableModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        title={t('scheduler.title')}
        size="lg"
        modalId={MODAL_ID}
        className="no-padding"
      >
        <Table
              syncWithHeader={false}
              title={t('scheduler.title')}
              config={{
                columns: tableColumns,
                data: paginatedRotinas,
                loading: isLoading,
                searchable: true,
                searchPlaceholder: t('layout.searchPlaceholder'),
                searchFields,
                sortable: true,
                sortColumn: tableFilters.sortColumn,
                sortDirection: tableFilters.sortDirection,
                striped: true,
                hover: true,
                responsive: true,
                selectable: true,
                multiSelect: false,
                filters: [],
                bulkActions: bulkActions.map((action) => ({
                  key: action.key ?? action.label.toLowerCase().replace(/\s+/g, '-'),
                  label: action.label,
                  onClick: action.action,
                  disabled: action.disabled,
                  variant: action.variant,
                  ...(action.dropdown ? { dropdown: action.dropdown } : {}),
                  ...(action.requiresSelection === false ? { requiresSelection: false } : {}),
                })),
                emptyMessage: t('messages.noData'),
                pagination,
              }}
              tableId={TABLE_ID}
              onSelectionChange={(items) => handleSelectionChange(items)}
              onRefresh={refetch}
              onAudit={handleAudit}
              auditEntity="SaasScheduledRoutine"
              onPageChange={(page) => {
                setTimeout(() => tableFilters.setPage(page), 0);
              }}
              onPageSizeChange={(limit) => {
                setTimeout(() => tableFilters.setLimit(limit), 0);
              }}
              onSort={(column, direction) => {
                setTimeout(() => tableFilters.setSort(column, direction), 0);
              }}
              onSearch={(search, field) => handleSearchChange(search, field)}
              onSearchFieldChange={(field) => {
                setTimeout(() => tableFilters.setSearchField(field), 0);
              }}
              search={tableFilters.search}
          />
      </DraggableModal>

      <RotinaAgendadaModal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedRotinaId(null);
        }}
        rotinaId={showEditModal ? selectedRotinaId : null}
        onSuccess={handleSuccess}
      />

      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId={AUDITORIA_MODAL_ID}
      />

      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default AgendadorTarefasModal;
