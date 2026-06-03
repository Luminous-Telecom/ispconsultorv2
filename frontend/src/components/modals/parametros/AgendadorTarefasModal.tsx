import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { SaasSchedulerService, type RotinaAgendada } from 'services/saas/saasSchedulerService';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import RotinaAgendadaModal from './RotinaAgendadaModal';
import ImprimirModal from 'components/common/ImprimirModal';
import { renderStatusBadge } from 'components/ui/StatusBadge';
import { getAtivoBadgeConfig } from 'utils/tableStatusBadges';
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
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRotinaId, setSelectedRotinaId] = useState<number | null>(null);

  const list = useEntityListModal<RotinaAgendada>({ onClose });

  const { data: rotinasData, isLoading, refetch } = useQuery({
    queryKey: [
      QUERY_KEY,
      list.tableFilters.page,
      list.tableFilters.limit,
      list.tableFilters.debouncedSearch,
      list.tableFilters.searchField,
      list.tableFilters.sortColumn,
      list.tableFilters.sortDirection,
    ],
    queryFn: () =>
      SaasSchedulerService.getRotinas({
        page: list.tableFilters.page,
        limit: list.tableFilters.limit,
        search: list.tableFilters.debouncedSearch,
        searchField: list.tableFilters.searchField || undefined,
        sort: list.tableFilters.sortColumn,
        direction: list.tableFilters.sortDirection,
      }),
    enabled: show,
  });

  const columns = useMemo(
    (): ListModalConfig<RotinaAgendada>['columns'] => [
      {
        key: 'nome',
        label: list.t('scheduler.task'),
        sortable: true,
        render: (item) => <span title={item.nome}>{item.nome}</span>,
      },
      {
        key: 'cron_minuto',
        label: list.t('scheduler.cronMinute'),
        sortable: true,
        render: (item) => getCronDisplayFromRotina(item).minuto,
      },
      {
        key: 'cron_hora',
        label: list.t('scheduler.cronHour'),
        sortable: true,
        render: (item) => getCronDisplayFromRotina(item).hora,
      },
      {
        key: 'cron_dia_mes',
        label: list.t('scheduler.cronDayOfMonth'),
        sortable: true,
        render: (item) => getCronDisplayFromRotina(item).diaMes,
      },
      {
        key: 'cron_mes',
        label: list.t('scheduler.cronMonth'),
        sortable: true,
        render: (item) => getCronDisplayFromRotina(item).mes,
      },
      {
        key: 'cron_dia_semana',
        label: list.t('scheduler.cronDayOfWeek'),
        sortable: true,
        render: (item) => getCronDisplayFromRotina(item).diaSemana,
      },
      {
        key: 'execucoes_com_erro',
        label: list.t('scheduler.execWithError'),
        sortable: true,
        render: (item) => <span className="text-nowrap">{item.execucoes_com_erro ?? '—'}</span>,
      },
      {
        key: 'total_execucoes',
        label: list.t('scheduler.execTotal'),
        sortable: true,
        render: (item) => <span className="text-nowrap">{item.total_execucoes ?? '—'}</span>,
      },
      {
        key: 'execucoes_com_sucesso',
        label: list.t('scheduler.execSuccess'),
        sortable: true,
        render: (item) => <span className="text-nowrap">{item.execucoes_com_sucesso ?? '—'}</span>,
      },
      {
        key: 'proxima_execucao',
        label: list.t('scheduler.nextRun'),
        sortable: true,
        render: (item) => (
          <span className="text-nowrap">{displayProximaUltima(item.proxima_execucao)}</span>
        ),
      },
      {
        key: 'ultima_execucao',
        label: list.t('scheduler.lastRun'),
        sortable: true,
        render: (item) => (
          <span className="text-nowrap">
            {item.ultima_execucao_formatada ?? displayProximaUltima(item.ultima_execucao)}
          </span>
        ),
      },
      {
        key: 'ativo',
        label: list.t('table.status'),
        sortable: true,
        render: (item) => renderStatusBadge(getAtivoBadgeConfig(item.ativo, list.t)),
      },
    ],
    [list]
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: list.t('table.id') },
      { key: 'tipo', label: list.t('scheduler.type') },
      { key: 'alvo', label: list.t('scheduler.scope') },
      { key: 'minuto', label: list.t('scheduler.cronMinute') },
    ],
    [list]
  );

  const pagination = useMemo(() => {
    const pag = rotinasData?.pagination;
    if (!pag) return list.buildPagination(null);
    return list.buildPagination({
      total: pag.total,
      page: pag.page,
      limit: pag.limit,
      totalPages: pag.pages,
    });
  }, [list, rotinasData?.pagination]);

  const toggleAtivoMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) =>
      SaasSchedulerService.updateRotina(id, { ativo }),
    onSuccess: (_data, vars) => {
      success(
        vars.ativo
          ? list.t('scheduler.routineActivatedSuccess')
          : list.t('scheduler.routineDeactivatedSuccess')
      );
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.ROTINA_UPDATE_ERROR),
  });

  const handleExecute = useCallback(
    async (rotina: RotinaAgendada) => {
      if (!window.confirm(list.t('scheduler.confirmExecute'))) return;
      try {
        await SaasSchedulerService.executeRotina?.(rotina.id);
        success(list.t('scheduler.routineStarted'));
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      } catch (err: unknown) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.ROTINA_EXECUTE_ERROR);
      }
    },
    [list, success, queryClient, showApiError]
  );

  const handleDelete = useCallback(
    async (rotina: RotinaAgendada) => {
      if (!window.confirm(list.t('scheduler.confirmDelete'))) return;
      try {
        await SaasSchedulerService.deleteRotina(rotina.id);
        success(list.t('scheduler.successDelete'));
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      } catch (err: unknown) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.ROTINA_DELETE_ERROR);
      }
    },
    [list, success, queryClient, showApiError]
  );

  const handleAudit = useCallback(
    (rotina: RotinaAgendada) => {
      list.auditoria.handleAudit('SaasScheduledRoutine', rotina.id);
    },
    [list.auditoria]
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
        disabled: (selectedItems: RotinaAgendada[]) => list.isNothingSelected(selectedItems),
        action: (selectedItems: RotinaAgendada[]) => {
          const item = list.resolveItem(selectedItems);
          if (item) {
            setSelectedRotinaId(item.id);
            setShowEditModal(true);
          }
        },
      },
      {
        label: list.bulkBtn.deletar.label,
        variant: list.bulkBtn.deletar.variant,
        disabled: (selectedItems: RotinaAgendada[]) => list.isNothingSelected(selectedItems),
        action: (selectedItems: RotinaAgendada[]) => {
          const item = list.resolveItem(selectedItems);
          if (item) void handleDelete(item);
        },
      },
      {
        label: list.t('table.status'),
        variant: 'primary' as const,
        disabled: (selectedItems: RotinaAgendada[]) =>
          toggleAtivoMutation.isPending || list.isNothingSelected(selectedItems),
        dropdown: [
          {
            label: list.t('scheduler.activate'),
            disabled: (selectedItems: RotinaAgendada[]) => {
              if (toggleAtivoMutation.isPending) return true;
              const r = list.resolveItem(selectedItems);
              return !r || r.ativo;
            },
            action: (selectedItems?: RotinaAgendada[]) => {
              const r = list.resolveItem(selectedItems);
              if (r && !r.ativo) toggleAtivoMutation.mutate({ id: r.id, ativo: true });
            },
          },
          {
            label: list.t('scheduler.deactivate'),
            disabled: (selectedItems: RotinaAgendada[]) => {
              if (toggleAtivoMutation.isPending) return true;
              const r = list.resolveItem(selectedItems);
              return !r || !r.ativo;
            },
            action: (selectedItems?: RotinaAgendada[]) => {
              const r = list.resolveItem(selectedItems);
              if (r && r.ativo) toggleAtivoMutation.mutate({ id: r.id, ativo: false });
            },
          },
        ],
      },
      {
        label: list.t('scheduler.execute'),
        variant: 'primary' as const,
        disabled: (selectedItems: RotinaAgendada[]) => list.isNothingSelected(selectedItems),
        action: (selectedItems: RotinaAgendada[]) => {
          const item = list.resolveItem(selectedItems);
          if (item) void handleExecute(item);
        },
      },
    ],
    [list, handleDelete, handleExecute, toggleAtivoMutation]
  );

  const handleSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    await refetch();
  };

  return (
    <>
      <ListModal<RotinaAgendada>
        show={show}
        onClose={list.handleModalClose}
        config={{
          title: list.t('scheduler.title'),
          columns,
          searchPlaceholder: list.t('layout.searchPlaceholder'),
          searchFields,
          emptyMessage: list.t('messages.noData'),
        }}
        data={rotinasData?.data ?? []}
        loading={isLoading}
        search={list.tableFilters.search}
        onSearchChange={list.handleSearchChange}
        sortColumn={list.tableFilters.sortColumn}
        sortDirection={list.tableFilters.sortDirection}
        onSortChange={list.tableFilters.setSort}
        pagination={pagination}
        onPageChange={list.tableFilters.setPage}
        onLimitChange={list.tableFilters.setLimit}
        onRefresh={refetch}
        bulkActions={bulkActions}
        onSelectionChange={list.handleSelectionChange}
        onAudit={handleAudit}
        auditEntity="SaasScheduledRoutine"
        tableId={TABLE_ID}
        modalId={MODAL_ID}
      />

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
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId={AUDITORIA_MODAL_ID}
      />
    </>
  );
};

export default AgendadorTarefasModal;
