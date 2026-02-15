import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useIPv4s, useDeleteIPv4 } from '@/hooks/useIPv4';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useTableFilters } from '@/hooks/useTableFilters';
import { IPv4 } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { formatDateTime, formatDate } from '@/utils/formatters';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { TableConfig } from '@/components/tables/types';
import IPv4Modal from './IPv4Modal';
import { useAuditoria } from '@/hooks/useAuditoria';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { IPv4Service } from '@/services/ipv4Service';
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

  const tableColumns: TableConfig<IPv4 & { created_at?: string; created_at_formatada?: string | null }>['columns'] = useMemo(() => [
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
      key: 'versao',
      label: t('blockdomi.versao'),
      sortable: true,
      width: '100px',
      render: (item: IPv4) => item.versao || '-'
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
      key: 'planilha_dominios',
      label: t('blockdomi.planilhaDominios'),
      sortable: false,
      width: '100px',
      render: (item: IPv4) => item.link_planilha_dominios?.trim() ? t('ui.yes') : t('ui.no')
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
  
  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'ip', label: 'IPv4' },
    { key: 'descricao', label: t('form.description') },
    { key: 'nome_oficio', label: t('blockdomi.nomeOficio') }
  ];

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

  const { success, error } = useNotificationContext();

  const handleDelete = useCallback(async (ipv4Id: number) => {
    try {
      await deleteIPv4Mutation.mutateAsync(ipv4Id);
      clearSelection();
      refetch();
    } catch {
      // Erro tratado pelo useNotificationContext
    }
  }, [deleteIPv4Mutation, clearSelection, refetch]);

  const handleBulkDelete = useCallback(async (ids: number[]) => {
    try {
      const { deleted, versao } = await IPv4Service.bulkDelete(ids);
      clearSelection();
      refetch();
      queryClient.invalidateQueries({ queryKey: ['ipv4'] });
      success(`Excluído(s) ${deleted} IPv4. Versão da operação: ${versao}.`);
    } catch (err: unknown) {
      error((err as Error)?.message ?? 'Erro ao excluir IPv4.');
    }
  }, [clearSelection, refetch, queryClient, success, error]);

  const handleAudit = useCallback((ipv4: IPv4) => {
    auditoria.handleAudit('IPv4', ipv4.id);
  }, [auditoria]);

  const bulkActions = useMemo(() => onSelectIPv4 ? [
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
      variant: 'primary' as const,
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
      variant: 'primary' as const,
      disabled: (selectedItems: IPv4[]) => {
        const items = selectedItems.length > 0 ? selectedItems : (selectedItem ? [selectedItem] : []);
        return items.length === 0 || !items.some((i) => i.link_oficio_justica?.trim());
      },
      action: (selectedItems: IPv4[]) => {
        const items = selectedItems.length > 0 ? selectedItems : (selectedItem ? [selectedItem] : []);
        items.filter((i) => i.link_oficio_justica?.trim()).forEach((i) => {
          const urls = i.link_oficio_justica!.split(',').map(url => url.trim()).filter(url => url);
          urls.forEach((url, index) => {
            setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), index * 150);
          });
        });
      }
    },
    {
      label: t('blockdomi.planilhaDominios'),
      variant: 'primary' as const,
      disabled: (selectedItems: IPv4[]) => {
        const items = selectedItems.length > 0 ? selectedItems : (selectedItem ? [selectedItem] : []);
        return items.length === 0 || !items.some((i) => i.link_planilha_dominios?.trim());
      },
      action: (selectedItems: IPv4[]) => {
        const items = selectedItems.length > 0 ? selectedItems : (selectedItem ? [selectedItem] : []);
        items.filter((i) => i.link_planilha_dominios?.trim()).forEach((i) => window.open(i.link_planilha_dominios!, '_blank', 'noopener,noreferrer'));
      }
    },
    {
      label: t('actions.delete'),
      disabled: (selectedItems: IPv4[]) => selectedItems.length === 0 && !selectedItem,
      action: async (selectedItems: IPv4[]) => {
        const items = selectedItems.length > 0 ? selectedItems : (selectedItem ? [selectedItem] : []);
        if (items.length === 0) return;

        const msg = items.length === 1
          ? t('messages.confirmDelete')
          : `Tem certeza que deseja excluir ${items.length} IPv4?`;
        const confirmed = await confirm({
          message: msg,
          variant: 'danger',
          title: t('blockdomi.deleteIPv4'),
          confirmText: t('actions.delete'),
          cancelText: t('actions.cancel'),
        });

        if (confirmed) {
          if (items.length === 1) {
            handleDelete(items[0].id);
          } else {
            handleBulkDelete(items.map((i) => i.id));
          }
        }
      }
    }
  ], [onSelectIPv4, selectedItem, clearSelection, onClose, handleSelect, handleDelete, handleBulkDelete, confirm, t]);

  const modalData = useMemo(() => ipv4sData?.data || [], [ipv4sData?.data]);

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
              emptyMessage: 'Nenhum IPv4 encontrado',
              pagination: pagination
            }}
            tableId="ipv4-list-modal"
            onSelectionChange={(items) => {
              handleSelectionChange(items);
            }}
            onRowClick={onSelectIPv4 ? (item) => {
              onSelectIPv4(item);
              onClose();
            } : undefined}
            onRowDoubleClick={(ipv4) => {
              if (onSelectIPv4) {
                onSelectIPv4(ipv4);
                onClose();
              }
            }}
            onRefresh={refetch}
            onAudit={handleAudit}
            auditEntity="IPv4"
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
        modalId="ipv4-list-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>

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
