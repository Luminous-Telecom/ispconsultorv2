import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useIpsPermitidos, useDeleteIpPermitido } from '@/hooks/useIpsPermitidos';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useI18n } from '@/contexts/I18nContext';
import { formatDateTime } from '@/utils/formatters';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { TableConfig } from '@/components/tables/types';
import IpsPermitidoModal from './IpsPermitidoModal';
import { useAuditoria } from '@/hooks/useAuditoria';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import type { IpPermitido } from '@/services/ipsPermitidosService';

interface IpsPermitidosListModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  skipWrapper?: boolean;
}

const IpsPermitidosListModal: React.FC<IpsPermitidosListModalProps> = ({
  show,
  onClose,
  title,
  skipWrapper = false
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const auditoria = useAuditoria();
  const { confirm, modalProps } = useConfirmModal();

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true
  });

  const { data: ipsData, isLoading, refetch } = useIpsPermitidos({
    search: tableFilters.debouncedSearch || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  });

  const deleteMutation = useDeleteIpPermitido();

  const defaultTitle = title || t('blockdomi.ipsPermitidos');

  const searchFields = [
    { key: 'cliente_nome', label: t('blockdomi.cliente') },
    { key: 'faixa_ips', label: t('blockdomi.faixaIps') }
  ];

  const tableColumns: TableConfig<IpPermitido>['columns'] = useMemo(() => [
    { key: 'id', label: t('table.id'), sortable: true, width: '60px', render: (item) => item.id },
    {
      key: 'cliente_nome',
      label: t('blockdomi.cliente'),
      sortable: false,
      width: '220px',
      render: (item) => item.cliente_nome || '-'
    },
    {
      key: 'faixa_ips',
      label: t('blockdomi.faixaIps'),
      sortable: true,
      width: '300px',
      render: (item) => <span className="text-break">{item.faixa_ips}</span>
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      width: '140px',
      render: (item) => (item.created_at ? formatDateTime(item.created_at) : '-')
    }
  ], [t]);

  const pagination = useMemo(() => {
    if (ipsData?.pagination && typeof ipsData.pagination === 'object') {
      const pag = ipsData.pagination;
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
        total,
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
  }, [ipsData?.pagination, tableFilters.page, tableFilters.limit]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      refetch();
    } catch {
      // Erro tratado pelo hook
    }
  }, [deleteMutation, refetch]);

  const handleAudit = useCallback((item: IpPermitido) => {
    auditoria.handleAudit('IpPermitido', item.id);
  }, [auditoria]);

  const bulkActions = useMemo(() => [
    {
      label: t('blockdomi.ipsPermitidosNew'),
      variant: 'primary' as const,
      action: () => setShowCreateModal(true)
    },
    {
      label: t('actions.edit'),
      variant: 'primary' as const,
      disabled: (selectedItems: IpPermitido[]) => selectedItems.length !== 1,
      action: (selectedItems: IpPermitido[]) => {
        if (selectedItems.length === 1) {
          setSelectedId(selectedItems[0].id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: t('actions.delete'),
      disabled: (selectedItems: IpPermitido[]) => selectedItems.length === 0,
      action: async (selectedItems: IpPermitido[]) => {
        if (selectedItems.length === 0) return;

        const msg = selectedItems.length === 1
          ? t('messages.confirmDelete')
          : `Tem certeza que deseja excluir ${selectedItems.length} registro(s)?`;
        const confirmed = await confirm({
          message: msg,
          variant: 'danger',
          title: t('blockdomi.deleteIpsPermitidos'),
          confirmText: t('actions.delete'),
          cancelText: t('actions.cancel')
        });

        if (confirmed) {
          for (const item of selectedItems) {
            await handleDelete(item.id);
          }
          refetch();
        }
      }
    }
  ], [t, confirm, handleDelete, refetch]);

  const modalData = useMemo(() => ipsData?.data || [], [ipsData?.data]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
  }, [tableFilters]);

  const handleBulkActionClick = useCallback((action: { onClick?: (items: IpPermitido[]) => void }, selectedItems: IpPermitido[]) => {
    action.onClick?.(selectedItems);
  }, []);

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
              multiSelect: true,
              bulkActions: bulkActions.map(action => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                onClick: action.action,
                disabled: action.disabled,
                variant: action.variant
              })),
              emptyMessage: t('blockdomi.noIpsPermitidos'),
              pagination
            }}
            tableId="ips-permitidos-list"
            onSelectionChange={() => {}}
            onBulkActionClick={handleBulkActionClick}
            onRefresh={refetch}
            onAudit={handleAudit}
            auditEntity="IpPermitido"
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
            onRowDoubleClick={(item) => {
              setSelectedId(item.id);
              setShowEditModal(true);
            }}
          />
        </div>
      </div>
    </>
  );

  const handleSuccess = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['ips-permitidos'] });
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedId(null);
  }, [refetch, queryClient]);

  if (skipWrapper) {
    return (
      <>
        {modalContent}
        <IpsPermitidoModal
          show={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedId(null);
          }}
          ipPermitidoId={showEditModal ? selectedId : null}
          onSuccess={handleSuccess}
        />
        <ImprimirModal
          show={auditoria.showPreview}
          onClose={auditoria.handleClosePreview}
          pdfUrl={auditoria.pdfUrl}
          isGenerating={auditoria.isGeneratingPdf}
          title={t('financial.executionLogs')}
          modalId="auditoria-ips-permitidos-modal"
        />
        {modalProps && <ConfirmModal {...modalProps} />}
      </>
    );
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={defaultTitle}
        size="lg"
        modalId="ips-permitidos-list-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>
      <IpsPermitidoModal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedId(null);
        }}
        ipPermitidoId={showEditModal ? selectedId : null}
        onSuccess={handleSuccess}
      />
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-ips-permitidos-modal"
      />
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default IpsPermitidosListModal;
