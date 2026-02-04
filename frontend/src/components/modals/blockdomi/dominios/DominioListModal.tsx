import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDominios, useDeleteDominio } from '@/hooks/useDominios';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useTableFilters } from '@/hooks/useTableFilters';
import { Dominio } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { formatDateTime, formatDate } from '@/utils/formatters';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { TableConfig } from '@/components/tables/types';
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

  const tableColumns: TableConfig<Dominio & { created_at?: string; created_at_formatada?: string | null }>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '42px',
      render: (item: Dominio) => <span>{item.id}</span>
    },
    {
      key: 'dominio',
      label: t('blockdomi.domain'),
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
      key: 'nome_oficio',
      label: t('blockdomi.nomeOficio'),
      sortable: true,
      width: '220px',
      render: (item: Dominio) => item.nome_oficio || '-'
    },
    {
      key: 'data_inicio_bloqueio',
      label: t('blockdomi.dataInicioBloqueio'),
      sortable: true,
      width: '130px',
      render: (item: Dominio) => formatDate(item.data_inicio_bloqueio)
    },
    {
      key: 'data_fim_bloqueio',
      label: t('blockdomi.dataFimBloqueio'),
      sortable: true,
      width: '130px',
      render: (item: Dominio) => formatDate(item.data_fim_bloqueio)
    },
    {
      key: 'oficio_anatel',
      label: t('blockdomi.oficioAnatel'),
      sortable: false,
      width: '100px',
      render: (item: Dominio) => item.link_oficio_anatel?.trim() ? t('ui.yes') : t('ui.no')
    },
    {
      key: 'oficio_justica',
      label: t('blockdomi.oficioJustica'),
      sortable: false,
      width: '100px',
      render: (item: Dominio) => item.link_oficio_justica?.trim() ? t('ui.yes') : t('ui.no')
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

  const defaultTitle = title || (onSelectDominio ? t('blockdomi.selectDomain') : t('blockdomi.domains'));
  
  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'dominio', label: t('blockdomi.domain') },
    { key: 'descricao', label: t('form.description') },
    { key: 'nome_oficio', label: t('blockdomi.nomeOficio') }
  ];

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
      label: t('blockdomi.anatel'),
      variant: 'primary' as const,
      disabled: (selectedItems: Dominio[]) => {
        const items = selectedItems.length > 0 ? selectedItems : (selectedItem ? [selectedItem] : []);
        return items.length === 0 || !items.some((i) => i.link_oficio_anatel?.trim());
      },
      action: (selectedItems: Dominio[]) => {
        const items = selectedItems.length > 0 ? selectedItems : (selectedItem ? [selectedItem] : []);
        items.filter((i) => i.link_oficio_anatel?.trim()).forEach((i) => window.open(i.link_oficio_anatel!, '_blank', 'noopener,noreferrer'));
      }
    },
    {
      label: t('blockdomi.justica'),
      variant: 'primary' as const,
      disabled: (selectedItems: Dominio[]) => {
        const items = selectedItems.length > 0 ? selectedItems : (selectedItem ? [selectedItem] : []);
        return items.length === 0 || !items.some((i) => i.link_oficio_justica?.trim());
      },
      action: (selectedItems: Dominio[]) => {
        const items = selectedItems.length > 0 ? selectedItems : (selectedItem ? [selectedItem] : []);
        items.filter((i) => i.link_oficio_justica?.trim()).forEach((i) => window.open(i.link_oficio_justica!, '_blank', 'noopener,noreferrer'));
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
          title: t('blockdomi.deleteDomain'),
          confirmText: t('actions.delete'),
          cancelText: t('actions.cancel'),
        });
      
        if (confirmed) {
          handleDelete(item.id);
        }
      }
    }
  ], [onSelectDominio, selectedItem, clearSelection, onClose, handleSelect, handleDelete, confirm, t]);

  const modalData = useMemo(() => dominiosData?.data || [], [dominiosData?.data]);

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
              emptyMessage: 'Nenhum domínio encontrado',
              pagination: pagination
            }}
            tableId="dominios-list-modal"
            onSelectionChange={(items) => {
              handleSelectionChange(items);
            }}
            onRowClick={onSelectDominio ? (item) => {
              onSelectDominio(item);
              onClose();
            } : undefined}
            onRowDoubleClick={(dominio) => {
              if (onSelectDominio) {
                onSelectDominio(dominio);
                onClose();
              }
            }}
            onRefresh={refetch}
            onAudit={handleAudit}
            auditEntity="Dominio"
            onPageChange={(page) => {
              setTimeout(() => {
                tableFilters.setPage(page);
              }, 0);
            }}
            onPageSizeChange={(limit) => {
              setTimeout(() => {
                tableFilters.setLimit(limit);
              }, 0);
            }}
            onSort={(column, direction) => {
              setTimeout(() => {
                tableFilters.setSort(column, direction);
              }, 0);
            }}
            onSearch={(search, field) => handleSearchChange(search, field)}
            search={tableFilters.search}
          />
        </div>
      </div>
    </>
  );

  if (skipWrapper) {
    return (
      <>
        {modalContent}
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
        modalId="dominios-list-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>

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
