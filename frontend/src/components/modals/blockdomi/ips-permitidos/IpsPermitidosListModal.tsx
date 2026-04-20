import React, { useState, useCallback, useMemo, useLayoutEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useIpsPermitidos, useDeleteIpPermitido } from 'hooks/useIpsPermitidos';
import { useTableFilters } from 'hooks/useTableFilters';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import IpsPermitidoModal from './IpsPermitidoModal';
import { useAuditoria } from 'hooks/useAuditoria';
import { useConfirmModal } from 'hooks/useConfirmModal';
import ImprimirModal from 'components/common/ImprimirModal';
import ConfirmModal from 'components/modals/ConfirmModal';
import { Button } from 'components/ui';
import type { IpPermitido } from 'services/ipsPermitidosService';

interface IpsPermitidosListModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

const IpsPermitidosListModal: React.FC<IpsPermitidosListModalProps> = ({
  show,
  onClose,
  title,
  skipWrapper = false,
  onHeaderActionsReady
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<IpPermitido[]>([]);
  const selectedItemsRef = useRef<IpPermitido[]>([]);
  selectedItemsRef.current = selectedItems;
  const auditoria = useAuditoria();
  const { modalProps } = useConfirmModal();

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true
  });

  const { data: ipsData, isLoading, refetch } = useIpsPermitidos({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  });

  const deleteMutation = useDeleteIpPermitido();

  const defaultTitle = title || t('blockdomi.ipsPermitidos');

  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'cliente_nome', label: t('blockdomi.cliente') },
    { key: 'faixa_ips', label: t('blockdomi.faixaIps') }
  ];

  const tableColumns: TableConfig<IpPermitido>['columns'] = useMemo(() => [
    { key: 'id', label: t('table.id'), sortable: true, width: '60px', render: (item) => item.id },
    {
      key: 'cliente_nome',
      label: t('blockdomi.cliente'),
      sortable: true,
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

  const handleCreate = useCallback(() => {
    setSelectedId(null);
    setShowEditModal(false);
    setShowCreateModal(true);
  }, []);

  const handleEdit = useCallback(() => {
    const item = selectedItemsRef.current[0];
    if (item) {
      setSelectedId(item.id);
      setShowCreateModal(false);
      setShowEditModal(true);
    }
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const items = selectedItemsRef.current;
    if (items.length === 0) return;
    const msg = items.length === 1
      ? t('messages.confirmDelete')
      : `Tem certeza que deseja excluir ${items.length} registro(s)?`;
    const confirmed = window.confirm(msg);
    if (confirmed) {
      for (const item of items) {
        await handleDelete(item.id);
      }
      refetch();
    }
  }, [handleDelete, refetch, t]);

  const headerActionsContent = useMemo(() => (
    <div className="d-flex gap-2 modal-header-actions">
      <Button type="button" variant="primary" size="sm" onClick={handleCreate}>
        {t('actions.create')}
      </Button>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={handleEdit}
        disabled={selectedItems.length === 0}
      >
        {t('actions.edit')}
      </Button>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={handleBulkDelete}
        disabled={selectedItems.length === 0}
      >
        {t('actions.delete')}
      </Button>
    </div>
  ), [handleCreate, handleEdit, handleBulkDelete, selectedItems.length, t]);

  const headerActionsRef = useRef(headerActionsContent);
  headerActionsRef.current = headerActionsContent;

  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      onHeaderActionsReady(headerActionsRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipWrapper, onHeaderActionsReady, selectedItems.length]);

  const modalData = useMemo(() => ipsData?.data || [], [ipsData?.data]);

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
              bulkActions: [],
              emptyMessage: t('blockdomi.noIpsPermitidos'),
              pagination
            }}
            tableId="ips-permitidos-list"
            syncWithHeader={false}
            onSelectionChange={(items) => {
              const next = items || [];
              setSelectedItems(prev => {
                if (prev.length !== next.length) return next;
                if (prev.length === 0) return prev;
                const prevIds = prev.map(i => i.id).sort().join(',');
                const nextIds = next.map(i => i.id).sort().join(',');
                return prevIds === nextIds ? prev : next;
              });
            }}
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
            onSearchFieldChange={(field) => {
              setTimeout(() => tableFilters.setSearchField(field), 0);
            }}
            search={tableFilters.search}
            onRowDoubleClick={(item) => {
              setSelectedId(item.id);
              setShowCreateModal(false);
              setShowEditModal(true);
            }}
          />
        </div>
      </div>
    </>
  );

  const handleSuccess = useCallback((createdOrUpdated?: IpPermitido) => {
    if (createdOrUpdated?.id != null && showCreateModal) {
      setSelectedId(createdOrUpdated.id);
      setShowCreateModal(false);
      setShowEditModal(true);
    }
    refetch();
    queryClient.invalidateQueries({ queryKey: ['ips-permitidos'] });
  }, [refetch, queryClient, showCreateModal]);

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
        headerActions={headerActionsContent}
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
