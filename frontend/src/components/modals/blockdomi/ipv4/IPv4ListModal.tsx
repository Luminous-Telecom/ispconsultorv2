import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useIPv4s, useDeleteIPv4 } from '@/hooks/useIPv4';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { IPv4 } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { formatDateTime, formatDate } from '@/utils/formatters';
import ListModal from '@/components/common/ListModal';
import IPv4Modal from './IPv4Modal';
import { useAuditoria } from '@/hooks/useAuditoria';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

interface IPv4ListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectIPv4?: (ipv4: IPv4) => void;
  title?: string;
  skipWrapper?: boolean;
}

const IPv4ListModal: React.FC<IPv4ListModalProps> = ({ 
  show, 
  onClose, 
  onSelectIPv4,
  title,
  skipWrapper = false
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIPv4Id, setSelectedIPv4Id] = useState<number | null>(null);
  
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
  } = useModalSelect<IPv4>(
    onSelectIPv4 ? (ipv4) => {
      onSelectIPv4(ipv4);
      onClose();
    } : undefined
  );

  const columns = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '42px',
      render: (item: IPv4) => <span>{item.id}</span>
    },
    {
      key: 'ip',
      label: 'IPv4',
      sortable: true,
      width: '150px',
      render: (item: IPv4) => item.ip
    },
    {
      key: 'descricao',
      label: t('form.description'),
      sortable: true,
      width: '250px',
      render: (item: IPv4) => item.descricao || '-'
    },
    {
      key: 'nome_oficio',
      label: t('blockdomi.nomeOficio'),
      sortable: true,
      width: '220px',
      render: (item: IPv4) => item.nome_oficio || '-'
    },
    {
      key: 'data_inicio_bloqueio',
      label: t('blockdomi.dataInicioBloqueio'),
      sortable: true,
      width: '130px',
      render: (item: IPv4) => formatDate(item.data_inicio_bloqueio)
    },
    {
      key: 'data_fim_bloqueio',
      label: t('blockdomi.dataFimBloqueio'),
      sortable: true,
      width: '130px',
      render: (item: IPv4) => formatDate(item.data_fim_bloqueio)
    },
    {
      key: 'oficio_anatel',
      label: t('blockdomi.oficioAnatel'),
      sortable: false,
      width: '100px',
      render: (item: IPv4) => item.link_oficio_anatel?.trim() ? t('ui.yes') : t('ui.no')
    },
    {
      key: 'oficio_justica',
      label: t('blockdomi.oficioJustica'),
      sortable: false,
      width: '100px',
      render: (item: IPv4) => item.link_oficio_justica?.trim() ? t('ui.yes') : t('ui.no')
    },
    {
      key: 'ativo',
      label: t('table.status'),
      sortable: true,
      width: '80px',
      render: (item: IPv4) => (
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
      render: (item: IPv4 & { created_at?: string; created_at_formatada?: string | null }) => {
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ], [t]);

  const defaultTitle = title || (onSelectIPv4 ? t('blockdomi.selectIPv4') : 'IPv4');
  const modal = useListModal({
    title: defaultTitle,
    columns,
    searchPlaceholder: t('layout.searchPlaceholder'),
    searchFields: [
      { key: 'id', label: t('table.id') },
      { key: 'ip', label: 'IPv4' },
      { key: 'descricao', label: t('form.description') },
      { key: 'nome_oficio', label: t('blockdomi.nomeOficio') }
    ],
    multiSelect: false
  });

  const { data: ipv4sData, isLoading, refetch } = useIPv4s({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  });

  const deleteIPv4Mutation = useDeleteIPv4();

  const pagination = useMemo(() => {
    if (ipv4sData?.pagination && typeof ipv4sData.pagination === 'object') {
      const pag = ipv4sData.pagination;
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
  }, [ipv4sData?.pagination, tableFilters.page, tableFilters.limit]);

  const handleSelect = useCallback((selectedItems?: IPv4[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      if (onSelectIPv4) {
        onSelectIPv4(item);
        onClose();
      }
    }
  }, [selectedItem, clearSelection, onSelectIPv4, onClose]);

  const handleDelete = useCallback(async (ipv4Id: number) => {
    try {
      await deleteIPv4Mutation.mutateAsync(ipv4Id);
      refetch();
    } catch (error: unknown) {
      // Erro tratado pelo useNotificationContext
    }
  }, [deleteIPv4Mutation, refetch]);

  const handleAudit = useCallback((ipv4: IPv4) => {
    auditoria.handleAudit('IPv4', ipv4.id);
  }, [auditoria]);

  const bulkActions = useMemo(() => onSelectIPv4 ? [
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
      disabled: (selectedItems: IPv4[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: IPv4[]) => handleSelect(selectedItems)
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
      disabled: (selectedItems: IPv4[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: IPv4[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          setSelectedIPv4Id(item.id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: t('blockdomi.anatel'),
      variant: 'secondary' as const,
      disabled: (selectedItems: IPv4[]) => {
        const items = selectedItems.length > 0 ? selectedItems : (selectedItem ? [selectedItem] : []);
        return items.length === 0 || !items.some((i) => i.link_oficio_anatel?.trim());
      },
      action: (selectedItems: IPv4[]) => {
        const items = selectedItems.length > 0 ? selectedItems : (selectedItem ? [selectedItem] : []);
        items.filter((i) => i.link_oficio_anatel?.trim()).forEach((i) => window.open(i.link_oficio_anatel!, '_blank', 'noopener,noreferrer'));
      }
    },
    {
      label: t('blockdomi.justica'),
      variant: 'secondary' as const,
      disabled: (selectedItems: IPv4[]) => {
        const items = selectedItems.length > 0 ? selectedItems : (selectedItem ? [selectedItem] : []);
        return items.length === 0 || !items.some((i) => i.link_oficio_justica?.trim());
      },
      action: (selectedItems: IPv4[]) => {
        const items = selectedItems.length > 0 ? selectedItems : (selectedItem ? [selectedItem] : []);
        items.filter((i) => i.link_oficio_justica?.trim()).forEach((i) => window.open(i.link_oficio_justica!, '_blank', 'noopener,noreferrer'));
      }
    },
    {
      label: t('actions.delete'),
      disabled: (selectedItems: IPv4[]) => selectedItems.length === 0 && !selectedItem,
      action: async (selectedItems: IPv4[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (!item) return;
        
        const confirmed = await confirm({
          message: t('messages.confirmDelete'),
          variant: 'danger',
          title: t('blockdomi.deleteIPv4'),
          confirmText: t('actions.delete'),
          cancelText: t('actions.cancel'),
        });
      
        if (confirmed) {
          handleDelete(item.id);
        }
      }
    }
  ], [onSelectIPv4, selectedItem, clearSelection, onClose, handleSelect, handleDelete, confirm, t]);

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

  const modalData = useMemo(() => ipv4sData?.data || [], [ipv4sData?.data]);

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
        onRowDoubleClick={(ipv4) => {
          if (onSelectIPv4) {
            onSelectIPv4(ipv4);
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
        refreshQueryKeys={['ipv4']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
        onAudit={handleAudit}
        auditEntity="IPv4"
        skipWrapper={skipWrapper}
      />

      <IPv4Modal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedIPv4Id(null);
        }}
        ipv4Id={showEditModal ? selectedIPv4Id : null}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['ipv4'] });
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedIPv4Id(null);
        }}
      />

      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-ipv4-modal"
      />

      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default IPv4ListModal;
