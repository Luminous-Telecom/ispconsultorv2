import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { SchedulerService, RotinaAgendada } from '@/services/schedulerService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { formatDateTime } from '@/utils/formatters';
import ListModal from '@/components/common/ListModal';
import RotinaAgendadaModal from './RotinaAgendadaModal';
import { useAuditoria } from '@/hooks/useAuditoria';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { useI18n } from '@/contexts/I18nContext';

interface AgendadorTarefasModalProps {
  show: boolean;
  onClose: () => void;
}

const AgendadorTarefasModal: React.FC<AgendadorTarefasModalProps> = ({ 
  show, 
  onClose
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotificationContext();
  const auditoria = useAuditoria();
  const { confirm, modalProps } = useConfirmModal();

  // Hook unificado para filtros, busca e paginação
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

  const handleSearchChange = useCallback((search: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearch(search);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearch]);

  const {
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<RotinaAgendada>();

  const modal = useListModal({
    title: t('scheduler.title'),
    columns: [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '42px',
        render: (item: RotinaAgendada) => <span>{item.id}</span>
      },
      {
        key: 'tipo',
        label: t('scheduler.type'),
        sortable: true,
        render: (item: RotinaAgendada) => {
          const labels: Record<string, string> = {
            geracao_titulos: 'Geração de Títulos',
            envio_boletos: 'Envio de Boletos',
            remessa_bancaria: 'Remessa Bancária',
            verificar_vencimentos: 'Verificar Vencimentos',
            desbloquear_blockdomi: 'Desbloquear domínios',
            outros: 'Outros'
          };
          return (
            <span className="badge bg-info">{labels[item.tipo] ?? item.tipo.replace(/_/g, ' ')}</span>
          );
        }
      },
      {
        key: 'frequencia',
        label: t('scheduler.frequency'),
        sortable: true,
        render: (item: RotinaAgendada) => item.frequencia
      },
      {
        key: 'hora_execucao',
        label: t('scheduler.schedule'),
        sortable: true,
        render: (item: RotinaAgendada) => item.hora_execucao || '-'
      },
      {
        key: 'proxima_execucao',
        label: t('scheduler.nextRun'),
        render: (item: RotinaAgendada) => item.proxima_execucao ? formatDateTime(item.proxima_execucao) : '-'
      },
      {
        key: 'ultima_execucao',
        label: t('scheduler.lastRun'),
        sortable: true,
        render: (item: RotinaAgendada & { ultima_execucao_formatada?: string | null }) => {
          // Usar ultima_execucao_formatada se disponível (vem do backend já formatada)
          if (item.ultima_execucao_formatada) {
            return item.ultima_execucao_formatada;
          }
          // Fallback para formatDateTime se não tiver formato do backend
          return item.ultima_execucao ? formatDateTime(item.ultima_execucao) : '-';
        }
      },
      {
        key: 'ativo',
        label: t('table.status'),
        sortable: true,
        render: (item: RotinaAgendada) => (
          <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
            {item.ativo ? t('status.active') : t('status.inactive')}
          </span>
        )
      },
      {
        key: 'total_execucoes',
        label: t('scheduler.executions'),
        sortable: true,
        render: (item: RotinaAgendada) => item.total_execucoes
      },
      {
        key: 'execucoes_com_erro',
        label: t('scheduler.errors'),
        sortable: true,
        render: (item: RotinaAgendada) => item.execucoes_com_erro
      },
      {
        key: 'created_at',
        label: t('table.createdAt'),
        sortable: true,
        render: (item: RotinaAgendada & { created_at?: string; created_at_formatada?: string | null }) => {
          // Usar created_at_formatada se disponível (vem do backend já formatada)
          if (item.created_at_formatada) {
            return item.created_at_formatada;
          }
          // Fallback para formatDateTime se não tiver formato do backend
          return item.created_at ? formatDateTime(item.created_at) : '-';
        }
      }
    ],
    searchPlaceholder: '',
    searchFields: [
      { key: 'id', label: t('table.id') },
      { key: 'tipo', label: t('scheduler.type') },
      { key: 'descricao', label: t('table.description') },
      { key: 'frequencia', label: t('scheduler.frequency') },
      { key: 'hora_execucao', label: t('scheduler.schedule') }
    ],
    multiSelect: false
  });

  const { data: rotinasData, isLoading, refetch } = useQuery({
    queryKey: ['agendador-tarefas', tableFilters.page, tableFilters.limit, tableFilters.search, tableFilters.sortColumn, tableFilters.sortDirection],
    queryFn: () => SchedulerService.getRotinas({ 
      page: tableFilters.page, 
      limit: tableFilters.limit,
      search: tableFilters.search,
      sort: tableFilters.sortColumn,
      direction: tableFilters.sortDirection
    }),
    enabled: show,
  });

  // Não precisamos filtrar no front se o backend já filtra
  const filteredRotinas = useMemo(() => {
    return rotinasData?.data || [];
  }, [rotinasData]);

  // Não precisamos paginar no front se o backend já pagina
  const paginatedRotinas = filteredRotinas;

  const pagination = useMemo(() => {
    if (rotinasData?.pagination) {
      return {
        from: (rotinasData.pagination.page - 1) * rotinasData.pagination.limit + 1,
        to: Math.min(rotinasData.pagination.page * rotinasData.pagination.limit, rotinasData.pagination.total),
        total: rotinasData.pagination.total,
        current_page: rotinasData.pagination.page,
        last_page: rotinasData.pagination.pages || Math.ceil(rotinasData.pagination.total / rotinasData.pagination.limit),
        per_page: rotinasData.pagination.limit
      };
    }
    return {
      from: 0,
      to: 0,
      total: 0,
      current_page: 1,
      last_page: 1,
      per_page: 15
    };
  }, [rotinasData?.pagination]);

  const handleToggle = async (rotina: RotinaAgendada) => {
    try {
      await SchedulerService.toggleRotina(rotina.id, !rotina.ativo);
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        showError(`Erro ao atualizar status: ${axiosError.response?.data?.message || 'Erro desconhecido'}`);
      } else {
        showError('Erro ao atualizar status: Erro desconhecido');
      }
    }
  };

  const handleExecute = async (rotina: RotinaAgendada) => {
    const confirmed = await confirm({
      message: t('scheduler.confirmExecute'),
      variant: 'info',
      title: t('scheduler.executeRoutine'),
      confirmText: t('scheduler.execute'),
      cancelText: t('actions.cancel'),
    });
    
    if (!confirmed) return;
    
    try {
      await SchedulerService.executeRotina(rotina.id);
      success(t('scheduler.routineStarted'));
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        showError(`${t('messages.error')}: ${axiosError.response?.data?.message || t('messages.noData')}`);
      } else {
        showError(`${t('messages.error')}: ${t('messages.noData')}`);
      }
    }
  };

  const handleDelete = async (rotina: RotinaAgendada) => {
    const confirmed = await confirm({
      message: t('scheduler.confirmDelete'),
      variant: 'danger',
      title: t('scheduler.deleteRoutine'),
      confirmText: t('actions.delete'),
      cancelText: t('actions.cancel'),
    });
    
    if (!confirmed) return;
    
    try {
      await SchedulerService.deleteRotina(rotina.id);
      success(t('scheduler.successDelete'));
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        showError(`${t('messages.error')}: ${axiosError.response?.data?.message || t('messages.noData')}`);
      } else {
        showError(`${t('messages.error')}: ${t('messages.noData')}`);
      }
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRotinaId, setSelectedRotinaId] = useState<number | null>(null);

  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleEdit = (selectedItems: RotinaAgendada[]) => {
    const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      setSelectedRotinaId(item.id);
      setShowEditModal(true);
    }
  };

  const handleSuccess = async () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedRotinaId(null);
    clearSelection();
    await queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
    await refetch();
  };

  const bulkActions = [
    {
      label: t('actions.new'),
      variant: 'primary' as const,
      action: handleCreate
    },
    {
      label: t('actions.edit'),
      variant: 'primary' as const,
      disabled: (selectedItems: RotinaAgendada[]) => selectedItems.length === 0 && !selectedItem,
      action: handleEdit
    },
    {
      label: t('scheduler.execute'),
      variant: 'primary' as const,
      disabled: (selectedItems: RotinaAgendada[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: RotinaAgendada[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          handleExecute(item);
        }
      }
    },
    {
      label: t('scheduler.deactivate'),
      variant: 'secondary' as const,
      disabled: (selectedItems: RotinaAgendada[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        return !item || !item.ativo;
      },
      action: (selectedItems: RotinaAgendada[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          handleToggle(item);
        }
      }
    },
    {
      label: t('actions.delete'),
      disabled: (selectedItems: RotinaAgendada[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: RotinaAgendada[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          handleDelete(item);
        }
      }
    }
  ];

  return (
    <>
      <ListModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        config={modal.config}
        data={paginatedRotinas}
        loading={isLoading}
        selectedItems={selectedItem ? [selectedItem] : []}
        onSelectionChange={handleSelectionChange}
        search={tableFilters.search}
        onSearchChange={handleSearchChange}
        pagination={pagination}
        onPageChange={tableFilters.setPage}
        onPageSizeChange={tableFilters.setLimit}
        onLimitChange={tableFilters.setLimit}
        sortColumn={tableFilters.sortColumn}
        sortDirection={tableFilters.sortDirection}
        onSortChange={tableFilters.setSort}
        refreshQueryKeys={['agendador-tarefas']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
        onAudit={handleAudit}
        auditEntity="ScheduledRoutine"
        tableId="agendador-tarefas"
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
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId="auditoria-scheduled-routine-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default AgendadorTarefasModal;
