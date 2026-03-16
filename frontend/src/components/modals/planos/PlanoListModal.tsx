import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePlanos, useDeletePlano } from 'hooks/usePlanos';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import { Plano, PlanoFilters } from 'types';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import PlanoModal from './PlanoModal';
import { useAuditoria } from 'hooks/useAuditoria';
import ImprimirModal from 'components/common/ImprimirModal';
import { useConfirmModal } from 'hooks/useConfirmModal';
import ConfirmModal from 'components/modals/ConfirmModal';

interface PlanoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectPlano?: (plano: Plano) => void;
  title?: string;
  skipWrapper?: boolean;
  initialFilters?: Partial<PlanoFilters>;
}

const PlanoListModal: React.FC<PlanoListModalProps> = ({
  show,
  onClose,
  onSelectPlano,
  title,
  skipWrapper = false,
  initialFilters
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState<number | null>(null);
  
  const auditoria = useAuditoria();
  const { modalProps } = useConfirmModal();
  
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
      consultoria: t('form.serviceTypeConsulting'),
      blockdomi: t('form.serviceTypeBlockdomi')
    };
    return tipos[tipo] || tipo;
  }, [t]);

  // Configurar colunas memoizadas para Table
  const tableColumns: TableConfig<Plano & { created_at?: string; created_at_formatada?: string | null }>['columns'] = useMemo(() => [
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
      badgeLabels: [t('form.serviceTypeInfrastructure'), t('form.serviceTypeConsulting'), t('form.serviceTypeBlockdomi')],
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
      width: '120px',
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
      width: '100px',
      render: (item: Plano) => (
        <span>{item.quantidade_usuarios || '-'}</span>
      )
    },
    {
      key: 'quantidade_clientes',
      label: t('table.clients'),
      sortable: true,
      badgeLabels: ['9999'],
      render: (item: Plano) => (
        <span className="badge bg-primary">
          {item.quantidade_clientes ?? (item.clientes ? item.clientes.length : 0)}
        </span>
      )
    },
    {
      key: 'status',
      label: t('table.status'),
      sortable: true,
      badgeLabels: [t('status.active'), t('status.inactive')],
      render: (item: Plano) => {
        const statusMap: { [key: string]: string } = {
          'ativo': t('status.active'),
          'inativo': t('status.inactive')
        };
        return (
          <span className={`badge ${getStatusBadgeClass(item.status)}`}>
            {statusMap[item.status] || item.status}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      width: '145px',
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

  const filterTitleSuffix = initialFilters?.status
    ? ` - ${initialFilters.status === 'ativo' ? t('status.active') : t('status.inactive')}`
    : initialFilters?.tipo_servico
      ? ` - ${getTipoServicoLabel(initialFilters.tipo_servico)}`
      : '';
  const defaultTitle = (title || (onSelectPlano ? t('ui.selectPlan') : t('menu.plans'))) + filterTitleSuffix;
  
  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'nome_plano', label: t('table.planName') },
    { key: 'descricao', label: t('form.description') },
    { key: 'tipo_servico', label: t('table.serviceType') },
    { key: 'valor_mensal', label: t('table.monthlyValue') },
    { key: 'quantidade_usuarios', label: t('form.usersQuantity') },
    { key: 'status', label: t('table.status') }
  ];

  const { data: planosData, isLoading, refetch } = usePlanos({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection,
    ...(initialFilters && Object.keys(initialFilters).length > 0 ? initialFilters : {})
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
      variant: 'primary' as const,
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
          
          const confirmed = window.confirm(t('messages.confirmDelete'));
        if (confirmed) {
          handleDelete(item.id);
        }
      }
    }
  ], [onSelectPlano, selectedItem, clearSelection, onClose, handleSelect, handleDelete, t]);

  const modalData = useMemo(() => planosData?.data || [], [planosData?.data]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
  }, [tableFilters]);

  const modalContent = (
    <>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            title={defaultTitle}
            config={{
              columns: tableColumns,
              data: modalData,
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
              bulkActions: bulkActions.map(action => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                onClick: action.action,
                disabled: action.disabled,
                variant: action.variant
              })),
              emptyMessage: 'Nenhum plano encontrado',
              pagination: pagination
            }}
            tableId="planos-list-modal"
            syncWithHeader={false}
            onSelectionChange={(items) => {
              handleSelectionChange(items);
            }}
            onRowClick={onSelectPlano ? (item) => {
              onSelectPlano(item);
              onClose();
            } : undefined}
            onRowDoubleClick={(plano) => {
              if (onSelectPlano) {
                onSelectPlano(plano);
                onClose();
              }
            }}
            onRefresh={refetch}
            onAudit={handleAudit}
            auditEntity="Plano"
            onPageChange={tableFilters.setPage}
            onPageSizeChange={tableFilters.setLimit}
            onSort={(column, direction) => tableFilters.setSort(column, direction)}
            onSearch={(search, field) => handleSearchChange(search, field)}
            search={tableFilters.search}
          />
        </div>
      </div>
    </>
  );

  // Modais auxiliares (sempre renderizados, independente de skipWrapper)
  const auxiliaryModals = (
    <>
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

  if (skipWrapper) {
    return (
      <>
        {modalContent}
        {auxiliaryModals}
      </>
    );
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        title={defaultTitle}
        size="lg"
        modalId="planos-list-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>
      {auxiliaryModals}
    </>
  );
};

export default PlanoListModal;