import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import { SchedulerService, type RotinaAgendada } from 'services/schedulerService';
import { SaasSchedulerService } from 'services/saas/saasSchedulerService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { formatDateTime } from 'utils/formatters';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import RotinaAgendadaModal from './RotinaAgendadaModal';
import { useAuditoria } from 'hooks/useAuditoria';
import ImprimirModal from 'components/common/ImprimirModal';
import { useConfirmModal } from 'hooks/useConfirmModal';
import ConfirmModal from 'components/modals/ConfirmModal';
import { useI18n } from 'contexts/I18nContext';

const TIPO_LABELS_ERP: Record<string, string> = {
  geracao_titulos: 'Geração de Títulos',
  envio_boletos: 'Envio de Boletos',
  remessa_bancaria: 'Remessa Bancária',
  verificar_vencimentos: 'Verificar Vencimentos',
  desbloquear_blockdomi: 'Desbloquear domínios',
  backup_equipamentos_ssh: 'Backup equipamentos SSH',
  outros: 'Outros',
};

const TIPO_LABELS_SAAS: Record<string, string> = {
  geracao_titulos: 'Geração de Títulos',
  envio_boletos: 'Envio de Boletos',
  remessa_bancaria: 'Remessa Bancária',
};

interface AgendadorTarefasModalProps {
  show: boolean;
  onClose: () => void;
  variant?: 'erp' | 'saas';
}

const AgendadorTarefasModal: React.FC<AgendadorTarefasModalProps> = ({ show, onClose, variant = 'erp' }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotificationContext();
  const auditoria = useAuditoria();
  const { modalProps } = useConfirmModal();

  const schedulerService = variant === 'saas' ? SaasSchedulerService : SchedulerService;
  const queryKey = variant === 'saas' ? 'saas-agendador-tarefas' : 'agendador-tarefas';
  const tipoLabels = variant === 'saas' ? TIPO_LABELS_SAAS : TIPO_LABELS_ERP;
  const hasExecute = true;
  const hasToggle = variant === 'erp';
  const modalId = variant === 'saas' ? 'saas-agendador-tarefas-modal' : 'agendador-tarefas-modal';
  const tableId = variant === 'saas' ? 'saas-agendador-tarefas' : 'agendador-tarefas';
  const auditoriaModalId = variant === 'saas' ? 'saas-auditoria-scheduled-routine-modal' : 'auditoria-scheduled-routine-modal';

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const handleAudit = (rotina: RotinaAgendada) => {
    auditoria.handleAudit('ScheduledRoutine', rotina.id);
  };

  const { selectedItem, handleSelectionChange, clearSelection } = useModalSelect<RotinaAgendada>();

  const tableColumns: TableConfig<RotinaAgendada & { ultima_execucao_formatada?: string | null; created_at?: string; created_at_formatada?: string | null }>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '42px',
      render: (item: RotinaAgendada) => <span>{item.id}</span>,
    },
    {
      key: 'tipo',
      label: t('scheduler.type'),
      sortable: true,
      badgeLabels: variant === 'erp' ? ['Geração de Títulos', 'Envio de Boletos', 'Remessa Bancária', 'Verificar Vencimentos', 'Desbloquear domínios', 'Outros'] : undefined,
      render: (item: RotinaAgendada) => (
        <span className="badge bg-info">{tipoLabels[item.tipo] ?? item.tipo.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'frequencia',
      label: t('scheduler.frequency'),
      sortable: true,
      render: (item: RotinaAgendada) => item.frequencia,
    },
    {
      key: 'hora_execucao',
      label: t('scheduler.schedule'),
      sortable: true,
      render: (item: RotinaAgendada) => item.hora_execucao || '-',
    },
    {
      key: 'proxima_execucao',
      label: t('scheduler.nextRun'),
      render: (item: RotinaAgendada) => (item.proxima_execucao ? formatDateTime(item.proxima_execucao) : '-'),
    },
    {
      key: 'ultima_execucao',
      label: t('scheduler.lastRun'),
      sortable: true,
      render: (item: RotinaAgendada & { ultima_execucao_formatada?: string | null }) => {
        if (item.ultima_execucao_formatada) return item.ultima_execucao_formatada;
        return item.ultima_execucao ? formatDateTime(item.ultima_execucao) : '-';
      },
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
    {
      key: 'total_execucoes',
      label: t('scheduler.executions'),
      sortable: true,
      render: (item: RotinaAgendada) => item.total_execucoes,
    },
    {
      key: 'execucoes_com_erro',
      label: t('scheduler.errors'),
      sortable: true,
      render: (item: RotinaAgendada) => item.execucoes_com_erro,
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      render: (item: RotinaAgendada & { created_at?: string; created_at_formatada?: string | null }) => {
        if (item.created_at_formatada) return item.created_at_formatada;
        return item.created_at ? formatDateTime(item.created_at) : '-';
      },
    },
  ], [t, variant, tipoLabels]);

  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'tipo', label: t('scheduler.type') },
    { key: 'descricao', label: t('table.description') },
    { key: 'frequencia', label: t('scheduler.frequency') },
    { key: 'hora_execucao', label: t('scheduler.schedule') },
  ];

  const { data: rotinasData, isLoading, refetch } = useQuery({
    queryKey: [queryKey, tableFilters.page, tableFilters.limit, tableFilters.search, tableFilters.sortColumn, tableFilters.sortDirection],
    queryFn: () =>
      schedulerService.getRotinas({
        page: tableFilters.page,
        limit: tableFilters.limit,
        search: tableFilters.search,
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

  const handleToggle = useCallback(
    async (rotina: RotinaAgendada) => {
      try {
        await (schedulerService as { toggleRotina?: (id: number, ativo: boolean) => Promise<unknown> }).toggleRotina?.(rotina.id, !rotina.ativo);
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      } catch (error: unknown) {
        if (error instanceof Error && 'response' in error) {
          const axiosError = error as AxiosError<{ message?: string }>;
          showError(`Erro ao atualizar status: ${axiosError.response?.data?.message || 'Erro desconhecido'}`);
        } else {
          showError('Erro ao atualizar status: Erro desconhecido');
        }
      }
    },
    [queryClient, showError, schedulerService, queryKey]
  );

  const handleExecute = useCallback(
    async (rotina: RotinaAgendada) => {
      const confirmed = window.confirm(t('scheduler.confirmExecute'));
      if (!confirmed) return;
      try {
        await (schedulerService as { executeRotina?: (id: number) => Promise<unknown> }).executeRotina?.(rotina.id);
        success(t('scheduler.routineStarted'));
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      } catch (error: unknown) {
        if (error instanceof Error && 'response' in error) {
          const axiosError = error as AxiosError<{ message?: string }>;
          showError(`${t('messages.error')}: ${axiosError.response?.data?.message || t('messages.noData')}`);
        } else {
          showError(`${t('messages.error')}: ${t('messages.noData')}`);
        }
      }
    },
    [t, success, queryClient, showError, schedulerService, queryKey]
  );

  const handleDelete = useCallback(
    async (rotina: RotinaAgendada) => {
      const confirmed = window.confirm(t('scheduler.confirmDelete'));
      if (!confirmed) return;
      try {
        await schedulerService.deleteRotina(rotina.id);
        success(t('scheduler.successDelete'));
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      } catch (error: unknown) {
        if (error instanceof Error && 'response' in error) {
          const axiosError = error as AxiosError<{ message?: string }>;
          showError(`${t('messages.error')}: ${axiosError.response?.data?.message || t('messages.noData')}`);
        } else {
          showError(`${t('messages.error')}: ${t('messages.noData')}`);
        }
      }
    },
    [t, success, queryClient, showError, schedulerService, queryKey]
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
    setSelectedRotinaId(null);
    clearSelection();
    await queryClient.invalidateQueries({ queryKey: [queryKey] });
    await refetch();
  };

  const bulkActions = useMemo(() => {
    const actions = [
      {
        label: t('actions.new'),
        variant: 'primary' as const,
        action: handleCreate,
      },
      {
        label: t('actions.edit'),
        variant: 'primary' as const,
        disabled: (selectedItems: RotinaAgendada[]) => selectedItems.length === 0 && !selectedItem,
        action: handleEdit,
      },
      {
        label: t('actions.delete'),
        disabled: (selectedItems: RotinaAgendada[]) => selectedItems.length === 0 && !selectedItem,
        action: (selectedItems: RotinaAgendada[]) => {
          const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
          if (item) handleDelete(item);
        },
      },
      ...(hasExecute
        ? [
            {
              label: t('scheduler.execute'),
              variant: 'primary' as const,
              disabled: (selectedItems: RotinaAgendada[]) => selectedItems.length === 0 && !selectedItem,
              action: (selectedItems: RotinaAgendada[]) => {
                const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
                if (item) handleExecute(item);
              },
            },
          ]
        : []),
      ...(hasToggle
        ? [
            {
              label: t('scheduler.deactivate'),
              variant: 'primary' as const,
              disabled: (selectedItems: RotinaAgendada[]) => {
                const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
                return !item || !item.ativo;
              },
              action: (selectedItems: RotinaAgendada[]) => {
                const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
                if (item) handleToggle(item);
              },
          },
        ]
        : []),
    ];
    return actions;
  }, [t, selectedItem, handleCreate, handleEdit, handleExecute, handleToggle, handleDelete, hasExecute, hasToggle]);

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
        modalId={modalId}
        className="no-padding"
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <Table
              title={t('scheduler.title')}
              config={{
                columns: tableColumns,
                data: paginatedRotinas,
                loading: isLoading,
                searchable: true,
                searchPlaceholder: '',
                searchFields,
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
                emptyMessage: 'Nenhuma rotina encontrada',
                pagination,
              }}
              tableId={tableId}
              onSelectionChange={(items) => handleSelectionChange(items)}
              onRefresh={refetch}
              onAudit={handleAudit}
              auditEntity="ScheduledRoutine"
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
              search={tableFilters.search}
            />
          </div>
        </div>
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
        variant={variant}
      />

      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId={auditoriaModalId}
      />

      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default AgendadorTarefasModal;
