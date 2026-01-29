import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDominios, useDeleteDominio } from '@/hooks/useDominios';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { Dominio } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { formatDateTime } from '@/utils/formatters';
import ListModal from '@/components/common/ListModal';
import DominioModal from './DominioModal';
import { useAuditoria } from '@/hooks/useAuditoria';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

interface DominioListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectDominio?: (dominio: Dominio) => void;
  title?: string;
  skipWrapper?: boolean;
}

const DominioListModal: React.FC<DominioListModalProps> = ({ 
  show, 
  onClose, 
  onSelectDominio,
  title,
  skipWrapper = false
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDominioId, setSelectedDominioId] = useState<number | null>(null);
  
  const auditoria = useAuditoria();
  const { confirm, modalProps } = useConfirmModal();
  
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });
  
  const {
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<Dominio>(
    onSelectDominio ? (dominio) => {
      onSelectDominio(dominio);
      onClose();
    } : undefined
  );

  const columns = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '42px',
      render: (item: Dominio) => <span>{item.id}</span>
    },
    {
      key: 'dominio',
      label: 'Domínio',
      sortable: true,
      width: '200px',
      render: (item: Dominio) => item.dominio
    },
    {
      key: 'descricao',
      label: t('form.description'),
      sortable: true,
      width: '250px',
      render: (item: Dominio) => item.descricao || '-'
    },
    {
      key: 'ativo',
      label: t('table.status'),
      sortable: true,
      width: '80px',
      render: (item: Dominio) => (
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
      render: (item: Dominio & { created_at?: string; created_at_formatada?: string | null }) => {
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ], [t]);

  const defaultTitle = title || (onSelectDominio ? 'Selecionar Domínio' : 'Domínios');
  const modal = useListModal({
    title: defaultTitle,
    columns,
    searchPlaceholder: t('layout.searchPlaceholder'),
    searchFields: [
      { key: 'id', label: t('table.id') },
      { key: 'dominio', label: 'Domínio' },
      { key: 'descricao', label: t('form.description') }
    ],
    multiSelect: false
  });

  const { data: dominiosData, isLoading, refetch } = useDominios({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  });

  const deleteDominioMutation = useDeleteDominio();

  const pagination = useMemo(() => {
    if (dominiosData?.pagination && typeof dominiosData.pagination === 'object') {
      const pag = dominiosData.pagination;
      const total = pag.total ?? 0;
      const perPage = pag.per_page ?? tableFilters.limit;
      const currentPage = pag.current_page ?? tableFilters.page;
      
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
  }, [dominiosData?.pagination, tableFilters.page, tableFilters.limit]);

  const handleSelect = useCallback((selectedItems?: Dominio[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      if (onSelectDominio) {
        onSelectDominio(item);
        onClose();
      }
    }
  }, [selectedItem, clearSelection, onSelectDominio, onClose]);

  const handleDelete = useCallback(async (dominioId: number) => {
    try {
      await deleteDominioMutation.mutateAsync(dominioId);
      refetch();
    } catch (error: unknown) {
      // Erro tratado pelo useNotificationContext
    }
  }, [deleteDominioMutation, refetch]);

  const handleAudit = useCallback((dominio: Dominio) => {
    auditoria.handleAudit('Dominio', dominio.id);
  }, [auditoria]);

  const bulkActions = useMemo(() => onSelectDominio ? [
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
      disabled: (selectedItems: Dominio[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: Dominio[]) => handleSelect(selectedItems)
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
      disabled: (selectedItems: Dominio[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: Dominio[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          setSelectedDominioId(item.id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: t('actions.delete'),
      disabled: (selectedItems: Dominio[]) => selectedItems.length === 0 && !selectedItem,
      action: async (selectedItems: Dominio[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (!item) return;
        
        const confirmed = await confirm({
          message: t('messages.confirmDelete'),
          variant: 'danger',
          title: 'Excluir Domínio',
          confirmText: t('actions.delete'),
          cancelText: t('actions.cancel'),
        });
      
        if (confirmed) {
          handleDelete(item.id);
        }
      }
    }
  ], [onSelectDominio, selectedItem, clearSelection, onClose, handleSelect, handleDelete, confirm, t]);

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

  const modalData = useMemo(() => dominiosData?.data || [], [dominiosData?.data]);

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
        onRowDoubleClick={(dominio) => {
          if (onSelectDominio) {
            onSelectDominio(dominio);
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
        refreshQueryKeys={['dominios']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
        onAudit={handleAudit}
        auditEntity="Dominio"
        skipWrapper={skipWrapper}
      />

      <DominioModal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedDominioId(null);
        }}
        dominioId={showEditModal ? selectedDominioId : null}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['dominios'] });
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedDominioId(null);
        }}
      />

      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-dominio-modal"
      />

      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default DominioListModal;
