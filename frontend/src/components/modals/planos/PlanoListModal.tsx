import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePlanos, useDeletePlano } from '@/hooks/usePlanos';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { Plano } from '@/types';
import { useI18n, TranslationKeys } from '@/contexts/I18nContext';
import { formatDateTime } from '@/utils/formatters';
import ListModal from '@/components/common/ListModal';
import PlanoModal from './PlanoModal';
import { useAuditoria } from '@/hooks/useAuditoria';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

interface PlanoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectPlano?: (plano: Plano) => void;
  title?: string;
  skipWrapper?: boolean;
}

const PlanoListModal: React.FC<PlanoListModalProps> = ({ 
  show, 
  onClose, 
  onSelectPlano,
  title,
  skipWrapper = false
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState<number | null>(null);
  
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
  
  // Usar hook customizado para gerenciar seleção
  const {
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<Plano>(
    onSelectPlano ? (plano) => {
      onSelectPlano(plano);
      onClose();
    } : undefined
  );

  const getStatusBadgeClass = useCallback((status: string) => {
    switch (status) {
      case 'ativo': return 'bg-success';
      case 'inativo': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }, []);

  const getTipoServicoLabel = useCallback((tipo: string) => {
    const tipos: { [key: string]: string } = {
      infraestrutura: t('form.serviceTypeInfrastructure'),
      consultoria: t('form.serviceTypeConsulting')
    };
    return tipos[tipo] || tipo;
  }, [t]);

  // Configurar colunas memoizadas
  const columns = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '42px',
      render: (item: Plano) => <span>{item.id}</span>
    },
    {
      key: 'nome_plano',
      label: t('table.planName'),
      sortable: true,
      width: '180px',
      render: (item: Plano) => item.nome_plano
    },
    {
      key: 'descricao',
      label: t('form.description'),
      sortable: true,
      width: '200px',
      render: (item: Plano) => item.descricao || '-'
    },
    {
      key: 'tipo_servico',
      label: t('table.serviceType'),
      sortable: true,
      width: '130px',
      render: (item: Plano) => (
        <span className="badge bg-info">
          {getTipoServicoLabel(item.tipo_servico)}
        </span>
      )
    },
    {
      key: 'valor_mensal',
      label: t('table.monthlyValue'),
      sortable: true,
      render: (item: Plano) => (
        <span className="text-success">
          R$ {Number(item.valor_mensal || 0).toFixed(2).replace('.', ',')}
        </span>
      )
    },
    {
      key: 'quantidade_usuarios',
      label: t('form.usersQuantity'),
      sortable: true,
      render: (item: Plano) => (
        <span>{item.quantidade_usuarios || '-'}</span>
      )
    },
    {
      key: 'quantidade_clientes',
      label: t('table.clients'),
      sortable: true,
      render: (item: Plano) => (
        <span className="badge bg-primary">
          {item.quantidade_clientes ?? (item.clientes ? item.clientes.length : 0)}
        </span>
      )
    },
    {
      key: 'periodicidade',
      label: t('table.periodicity'),
      sortable: true,
      render: (item: Plano) => {
        const periodicidades: { [key: string]: string } = {
          mensal: t('form.periodicityMonthly'),
          trimestral: t('form.periodicityQuarterly'),
          semestral: t('form.periodicitySemiannual'),
          anual: t('form.periodicityAnnual'),
          bimestral: t('form.periodicityBimonthly'),
          quinzenal: t('form.periodicityBiweekly'),
          semanal: t('form.periodicityWeekly')
        };
        return (
          <span className="text-capitalize">{item.periodicidade ? (periodicidades[item.periodicidade] || item.periodicidade) : '-'}</span>
        );
      }
    },
    {
      key: 'status',
      label: t('table.status'),
      sortable: true,
      render: (item: Plano) => (
        <span className={`badge ${getStatusBadgeClass(item.status)}`}>
          {t(`status.${item.status}` as keyof TranslationKeys)}
        </span>
      )
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      render: (item: Plano & { created_at?: string; created_at_formatada?: string | null }) => {
        // Usar created_at_formatada se disponível (vem do backend já formatada)
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        // Fallback para formatDateTime se não tiver formato do backend
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ], [getTipoServicoLabel, getStatusBadgeClass, t]);

  // Configurar modal centralizado
  const defaultTitle = title || (onSelectPlano ? t('ui.selectPlan') : t('menu.plans'));
  const modal = useListModal({
    title: defaultTitle,
    columns,
    searchPlaceholder: t('layout.searchPlaceholder'),
    searchFields: [
      { key: 'id', label: t('table.id') },
      { key: 'nome_plano', label: t('table.planName') },
      { key: 'descricao', label: t('form.description') },
      { key: 'tipo_servico', label: t('table.serviceType') },
      { key: 'valor_mensal', label: t('table.monthlyValue') },
      { key: 'quantidade_usuarios', label: t('form.usersQuantity') },
      { key: 'periodicidade', label: t('table.periodicity') },
      { key: 'status', label: t('table.status') }
    ],
    multiSelect: false
  });

  // Hook para buscar planos usando parâmetros do useTableFilters
  const { data: planosData, isLoading, refetch } = usePlanos({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  });

  const deletePlanoMutation = useDeletePlano();

  // Paginação do backend - usar valores do backend quando disponíveis
  const pagination = useMemo(() => {
    if (planosData?.pagination && typeof planosData.pagination === 'object') {
      const pag = planosData.pagination;
      const total = pag.total ?? 0;
      const perPage = pag.per_page ?? tableFilters.limit;
      const currentPage = pag.current_page ?? tableFilters.page;
      
      // Calcular last_page se não estiver definido
      let lastPage = pag.last_page;
      if (!lastPage && total > 0) {
        lastPage = Math.max(1, Math.ceil(total / perPage));
      } else if (!lastPage) {
        lastPage = 1;
      }
      
      return {
        current_page: currentPage,
        last_page: lastPage,
        per_page: perPage,
        total: total,
        from: pag.from ?? ((currentPage - 1) * perPage) + 1,
        to: pag.to ?? Math.min(currentPage * perPage, total)
      };
    }
    return {
      current_page: tableFilters.page,
      last_page: 1,
      per_page: tableFilters.limit,
      total: 0,
      from: 0,
      to: 0
    };
  }, [planosData?.pagination, tableFilters.page, tableFilters.limit]);

  const handleSelect = useCallback((selectedItems?: Plano[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      if (onSelectPlano) {
        onSelectPlano(item);
        onClose();
      }
    }
  }, [selectedItem, clearSelection, onSelectPlano, onClose]);

  const handleDelete = useCallback(async (planoId: number) => {
    try {
      await deletePlanoMutation.mutateAsync(planoId);
      refetch();
    } catch (error: unknown) {
      // Erro tratado pelo useNotificationContext
    }
  }, [deletePlanoMutation, refetch]);

  const handleAudit = useCallback((plano: Plano) => {
    auditoria.handleAudit('Plano', plano.id);
  }, [auditoria]);

  // Bulk actions memoizados
  const bulkActions = useMemo(() => onSelectPlano ? [
    {
      label: t('actions.cancel'),
      variant: 'secondary' as const,
      action: () => {
        clearSelection();
        onClose();
      }
    },
    {
      label: t('buttons.select'),
        variant: 'primary' as const,
        disabled: (selectedItems: Plano[]) => selectedItems.length === 0 && !selectedItem,
        action: (selectedItems: Plano[]) => handleSelect(selectedItems)
      }
    ] : [
      {
        label: t('actions.create'),
        variant: 'primary' as const,
        action: () => setShowCreateModal(true)
      },
      {
        label: t('actions.edit'),
        variant: 'primary' as const,
        disabled: (selectedItems: Plano[]) => selectedItems.length === 0 && !selectedItem,
        action: (selectedItems: Plano[]) => {
          const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
          if (item) {
            setSelectedPlanoId(item.id);
            setShowEditModal(true);
          }
        }
      },
      {
        label: t('actions.delete'),
        disabled: (selectedItems: Plano[]) => selectedItems.length === 0 && !selectedItem,
        action: async (selectedItems: Plano[]) => {
          const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
          if (!item) return;
          
          const confirmed = await confirm({
            message: t('messages.confirmDelete'),
            variant: 'danger',
            title: t('modal.deletePlan'),
            confirmText: t('actions.delete'),
            cancelText: t('actions.cancel'),
          });
        
        if (confirmed) {
          handleDelete(item.id);
        }
      }
    }
  ], [onSelectPlano, selectedItem, clearSelection, onClose, handleSelect, handleDelete, confirm, t]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearch, tableFilters.setSearchField]);

  const handleSearchFieldChange = useCallback((field: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearchField(field);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearchField]);

  const modalData = useMemo(() => planosData?.data || [], [planosData?.data]);

  return (
    <>
      <ListModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        config={modal.config}
        data={modalData}
        loading={isLoading}
        selectedItems={selectedItem ? [selectedItem] : []}
        onSelectionChange={handleSelectionChange}
        onRowDoubleClick={(plano) => {
          // Double-click seleciona o item e fecha o modal
          if (onSelectPlano) {
            onSelectPlano(plano);
            onClose();
          }
        }}
        search={tableFilters.search}
        onSearchChange={handleSearchChange}
        onSearchFieldChange={handleSearchFieldChange}
        pagination={pagination}
        onPageChange={tableFilters.setPage}
        onPageSizeChange={tableFilters.setLimit}
        onLimitChange={tableFilters.setLimit}
        sortColumn={tableFilters.sortColumn}
        sortDirection={tableFilters.sortDirection}
        onSortChange={tableFilters.setSort}
        refreshQueryKeys={['planos']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
        onAudit={handleAudit}
        auditEntity="Plano"
        skipWrapper={skipWrapper}
      />

      {/* Modal de Criação/Edição unificado */}
      <PlanoModal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedPlanoId(null);
        }}
        planoId={showEditModal ? selectedPlanoId : null}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['planos'] });
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedPlanoId(null);
        }}
      />

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-plano-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default PlanoListModal;