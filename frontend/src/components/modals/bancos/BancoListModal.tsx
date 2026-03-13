import React, { useState, useCallback, useMemo } from 'react';
import { useBancos, useDeleteBanco } from '@/hooks/useBancos';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useTableFilters } from '@/hooks/useTableFilters';
import { Banco } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { formatDateTime } from '@/utils/formatters';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { TableConfig } from '@/components/tables/types';
import BancoModal from './BancoModal';
import { useAuditoria } from '@/hooks/useAuditoria';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
interface BancoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectBanco?: (banco: Banco) => void;
  title?: string;
  skipWrapper?: boolean;
}

const BancoListModal: React.FC<BancoListModalProps> = ({
  show,
  onClose,
  onSelectBanco,
  title,
  skipWrapper = false
}) => {
  const { t } = useI18n();
  const defaultTitle = title || (onSelectBanco ? t('ui.selectBank') : t('menu.banks'));
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [selectedBancoId, setSelectedBancoId] = useState<number | null>(null);
  
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
    selectedItem: selectedBanco,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<Banco>(
    onSelectBanco ? (banco) => {
      onSelectBanco(banco);
      onClose();
    } : undefined
  );

  // Configurar colunas memoizadas para Table
  const tableColumns: TableConfig<Banco & { created_at?: string; created_at_formatada?: string | null }>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '42px',
      render: (item: Banco) => <span>{item.id}</span>
    },
    {
      key: 'nome',
      label: t('form.name'),
      sortable: true,
      width: '180px',
      render: (item: Banco) => item.nome
    },
    {
      key: 'descricao',
      label: t('form.description'),
      sortable: true,
      width: '200px',
      render: (item: Banco) => item.descricao || '-'
    },
    {
      key: 'tipo_banco',
      label: t('table.bankType'),
      sortable: true,
      badgeLabels: ['EFI', 'Asaas', 'Bancário', 'Outros'],
      render: (item: Banco) => {
        const tipos: Record<string, string> = {
          'efi': 'EFI',
          'asaas': 'Asaas',
          'bancario': 'Bancário',
          'outros': 'Outros'
        };
        return (
          <span className="badge bg-info">
            {tipos[item.tipo_banco] || 'N/A'}
          </span>
        );
      }
    },
    {
      key: 'sandbox',
      label: t('table.sandbox'),
      sortable: true,
      badgeLabels: [t('ui.yes'), t('ui.no')],
      render: (item: Banco) => (
        <span className={`badge ${item.sandbox ? 'bg-warning' : 'bg-primary'}`}>
          {item.sandbox ? t('ui.yes') : t('ui.no')}
        </span>
      )
    },
    {
      key: 'ativo',
      label: t('table.status'),
      sortable: true,
      badgeLabels: [t('status.active'), t('status.inactive')],
      render: (item: Banco) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? t('status.active') : t('status.inactive')}
        </span>
      )
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      width: '130px',
      render: (item: Banco & { created_at?: string; created_at_formatada?: string | null }) => {
        // Usar created_at_formatada se disponível (vem do backend já formatada)
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        // Fallback para formatDateTime se não tiver formato do backend
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ], [t]);

  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'nome', label: t('form.name') },
    { key: 'descricao', label: t('form.description') },
    { key: 'tipo_banco', label: t('table.bankType') },
    { key: 'sandbox', label: t('table.sandbox') },
    { key: 'ativo', label: t('table.status') }
  ];

  // Hook para buscar bancos usando parâmetros do useTableFilters
  const { data: bancosData, isLoading, refetch } = useBancos({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    tipo_banco: undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  });

  const deleteBancoMutation = useDeleteBanco();

  // Paginação do backend - usar valores do backend quando disponíveis
  const pagination = useMemo(() => {
    if (bancosData?.pagination && typeof bancosData.pagination === 'object') {
      const pag = bancosData.pagination;
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
  }, [bancosData?.pagination, tableFilters.page, tableFilters.limit]);

  const handleSelect = useCallback((selectedItems?: Banco[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedBanco;
    if (item) {
      clearSelection();
      if (onSelectBanco) {
        onSelectBanco(item);
        onClose();
      }
    }
  }, [selectedBanco, clearSelection, onSelectBanco, onClose]);

  const handleDelete = useCallback(async (bancoId: number) => {
    try {
      await deleteBancoMutation.mutateAsync(bancoId);
      refetch();
    } catch (error) {
      // Erro tratado pelo useNotificationContext
    }
  }, [deleteBancoMutation, refetch]);

  const handleAudit = useCallback((banco: Banco) => {
    auditoria.handleAudit('Banco', banco.id);
  }, [auditoria]);

  // Bulk actions memoizados
  const bulkActions = useMemo(() => onSelectBanco ? [
    {
        label: t('buttons.cancel'),
        variant: 'primary' as const,
        action: () => {
          clearSelection();
          onClose();
        }
      },
      {
        label: t('buttons.select'),
        variant: 'primary' as const,
        disabled: (selectedItems: Banco[]) => selectedItems.length === 0 && !selectedBanco,
        action: (selectedItems: Banco[]) => handleSelect(selectedItems)
      }
    ] : [
      {
        label: t('actions.create'),
        variant: 'primary' as const,
        action: () => {
          setSelectedBancoId(null);
          setShowBancoModal(true);
        }
      },
      {
        label: t('actions.edit'),
        variant: 'primary' as const,
        disabled: (selectedItems: Banco[]) => selectedItems.length === 0 && !selectedBanco,
        action: (selectedItems: Banco[]) => {
          const item = selectedItems.length > 0 ? selectedItems[0] : selectedBanco;
          if (item) {
            setSelectedBancoId(item.id);
            setShowBancoModal(true);
          }
        }
      },
      {
        label: t('actions.delete'),
        disabled: (selectedItems: Banco[]) => selectedItems.length === 0 && !selectedBanco,
        action: async (selectedItems: Banco[]) => {
          const item = selectedItems.length > 0 ? selectedItems[0] : selectedBanco;
          if (!item) return;
          
          const confirmed = window.confirm(t('messages.confirmDelete'));
        if (confirmed) {
          handleDelete(item.id);
        }
      }
    }
  ], [onSelectBanco, selectedBanco, clearSelection, onClose, handleSelect, handleDelete, t]);

  const modalData = useMemo(() => bancosData?.data || [], [bancosData?.data]);

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
              emptyMessage: 'Nenhum banco encontrado',
              pagination: pagination
            }}
            tableId="bancos-list-modal"
            syncWithHeader={false}
            onSelectionChange={(items) => {
              handleSelectionChange(items);
            }}
            onRowClick={onSelectBanco ? (item) => {
              onSelectBanco(item);
              onClose();
            } : undefined}
            onRowDoubleClick={(banco) => {
              if (onSelectBanco) {
                onSelectBanco(banco);
                onClose();
              }
            }}
            onRefresh={refetch}
            onAudit={handleAudit}
            auditEntity="Banco"
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
      {/* Modal Unificado (Criação e Edição) */}
      <BancoModal
        show={showBancoModal}
        onClose={() => {
          setShowBancoModal(false);
          setSelectedBancoId(null);
        }}
        bancoId={selectedBancoId}
        onSuccess={(banco) => {
          refetch();
          setSelectedBancoId(banco.id);
        }}
      />

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-banco-modal"
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
        modalId="bancos-list-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>
      {auxiliaryModals}
    </>
  );
};

export default BancoListModal;
