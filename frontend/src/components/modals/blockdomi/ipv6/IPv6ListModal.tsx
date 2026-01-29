import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useIPv6s, useDeleteIPv6 } from '@/hooks/useIPv6';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { IPv6 } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { formatDateTime } from '@/utils/formatters';
import ListModal from '@/components/common/ListModal';
import { IPv6Modal } from './index';
import { useAuditoria } from '@/hooks/useAuditoria';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

interface IPv6ListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectIPv6?: (ipv6: IPv6) => void;
  title?: string;
  skipWrapper?: boolean;
}

const IPv6ListModal: React.FC<IPv6ListModalProps> = ({ 
  show, 
  onClose, 
  onSelectIPv6,
  title,
  skipWrapper = false
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIPv6Id, setSelectedIPv6Id] = useState<number | null>(null);
  
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
  } = useModalSelect<IPv6>(
    onSelectIPv6 ? (ipv6) => {
      onSelectIPv6(ipv6);
      onClose();
    } : undefined
  );

  const columns = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '42px',
      render: (item: IPv6) => <span>{item.id}</span>
    },
    {
      key: 'ip',
      label: 'IPv6',
      sortable: true,
      width: '200px',
      render: (item: IPv6) => item.ip
    },
    {
      key: 'descricao',
      label: t('form.description'),
      sortable: true,
      width: '250px',
      render: (item: IPv6) => item.descricao || '-'
    },
    {
      key: 'ativo',
      label: t('table.status'),
      sortable: true,
      width: '80px',
      render: (item: IPv6) => (
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
      render: (item: IPv6 & { created_at?: string; created_at_formatada?: string | null }) => {
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ], [t]);

  const defaultTitle = title || (onSelectIPv6 ? 'Selecionar IPv6' : 'IPv6');
  const modal = useListModal({
    title: defaultTitle,
    columns,
    searchPlaceholder: t('layout.searchPlaceholder'),
    searchFields: [
      { key: 'id', label: t('table.id') },
      { key: 'ip', label: 'IPv6' },
      { key: 'descricao', label: t('form.description') }
    ],
    multiSelect: false
  });

  const { data: ipv6sData, isLoading, refetch } = useIPv6s({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  });

  const deleteIPv6Mutation = useDeleteIPv6();

  const pagination = useMemo(() => {
    if (ipv6sData?.pagination && typeof ipv6sData.pagination === 'object') {
      const pag = ipv6sData.pagination;
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
  }, [ipv6sData?.pagination, tableFilters.page, tableFilters.limit]);

  const handleSelect = useCallback((selectedItems?: IPv6[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      if (onSelectIPv6) {
        onSelectIPv6(item);
        onClose();
      }
    }
  }, [selectedItem, clearSelection, onSelectIPv6, onClose]);

  const handleDelete = useCallback(async (ipv6Id: number) => {
    try {
      await deleteIPv6Mutation.mutateAsync(ipv6Id);
      refetch();
    } catch (error: unknown) {
      // Erro tratado pelo useNotificationContext
    }
  }, [deleteIPv6Mutation, refetch]);

  const handleAudit = useCallback((ipv6: IPv6) => {
    auditoria.handleAudit('IPv6', ipv6.id);
  }, [auditoria]);

  const bulkActions = useMemo(() => onSelectIPv6 ? [
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
      disabled: (selectedItems: IPv6[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: IPv6[]) => handleSelect(selectedItems)
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
      disabled: (selectedItems: IPv6[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: IPv6[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          setSelectedIPv6Id(item.id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: t('actions.delete'),
      disabled: (selectedItems: IPv6[]) => selectedItems.length === 0 && !selectedItem,
      action: async (selectedItems: IPv6[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (!item) return;
        
        const confirmed = await confirm({
          message: t('messages.confirmDelete'),
          variant: 'danger',
          title: 'Excluir IPv6',
          confirmText: t('actions.delete'),
          cancelText: t('actions.cancel'),
        });
      
        if (confirmed) {
          handleDelete(item.id);
        }
      }
    }
  ], [onSelectIPv6, selectedItem, clearSelection, onClose, handleSelect, handleDelete, confirm, t]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearch, tableFilters.setSearchField]);

  const handleSearchFieldChange = useCallback((field: string) => {
    setTimeout(() => {
      tableFilters.setSearchField(field);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearchField]);

  const modalData = useMemo(() => ipv6sData?.data || [], [ipv6sData?.data]);

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
        onRowDoubleClick={(ipv6) => {
          if (onSelectIPv6) {
            onSelectIPv6(ipv6);
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
        refreshQueryKeys={['ipv6']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
        onAudit={handleAudit}
        auditEntity="IPv6"
        skipWrapper={skipWrapper}
      />

      <IPv6Modal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedIPv6Id(null);
        }}
        ipv6Id={showEditModal ? selectedIPv6Id : null}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['ipv6'] });
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedIPv6Id(null);
        }}
      />

      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-ipv6-modal"
      />

      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default IPv6ListModal;
