import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useAuditoria } from '@/hooks/useAuditoria';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { formatDateTime } from '@/utils/formatters';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import ImprimirModal from '@/components/common/ImprimirModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { TableConfig } from '@/components/tables/types';
import { saasUsuariosService, type SaasUsuarioSuper, type SaasUsuarioListResponse } from '@/services/saas/saasUsuariosService';
import SaasUsuarioFormModal from './SaasUsuarioFormModal';

interface Props {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

const NIVEL_LABEL: Record<string, string> = { super: 'Super', admin: 'Admin', suporte: 'Suporte' };
const NIVEL_COLOR: Record<string, string> = { super: 'danger', admin: 'primary', suporte: 'secondary' };

const SaasUsuariosModal: React.FC<Props> = ({ show, onClose, skipWrapper = false }) => {
  const queryClient = useQueryClient();
  const { error } = useNotificationContext();
  const auditoria = useAuditoria();
  const { confirm, modalProps: confirmProps } = useConfirmModal();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null);

  const { selectedItem, handleSelectionChange, clearSelection } = useModalSelect<SaasUsuarioSuper>();

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saas-usuarios', tableFilters.page, tableFilters.limit, tableFilters.debouncedSearch, tableFilters.sortColumn, tableFilters.sortDirection],
    queryFn: () => saasUsuariosService.list({
      page: tableFilters.page,
      limit: tableFilters.limit,
      search: tableFilters.debouncedSearch || undefined,
      sortColumn: tableFilters.sortColumn,
      sortDirection: tableFilters.sortDirection,
    }),
    enabled: show,
    staleTime: 0,
  });

  const listData = data?.data as SaasUsuarioListResponse | undefined;
  const usuarios: SaasUsuarioSuper[] = listData?.data || [];

  const pagination = useMemo(() => {
    const pag = listData?.pagination;
    if (!pag) return { current_page: 1, last_page: 1, per_page: 15, total: 0, from: 0, to: 0 };
    return {
      current_page: pag.page,
      last_page: pag.totalPages,
      per_page: pag.limit,
      total: pag.total,
      from: (pag.page - 1) * pag.limit + 1,
      to: Math.min(pag.page * pag.limit, pag.total),
    };
  }, [listData?.pagination]);

  const handleAudit = useCallback((usuario: SaasUsuarioSuper) => {
    auditoria.handleAudit('SaasUsuarioSuper', usuario.id);
  }, [auditoria]);

  const handleEdit = useCallback((selectedItems?: SaasUsuarioSuper[]) => {
    const item = (selectedItems && selectedItems.length > 0) ? selectedItems[0] : selectedItem;
    if (item) { setSelectedUsuarioId(item.id); setShowEditModal(true); }
  }, [selectedItem]);

  const handleDelete = useCallback(async (selectedItems?: SaasUsuarioSuper[]) => {
    const item = (selectedItems && selectedItems.length > 0) ? selectedItems[0] : selectedItem;
    if (!item) return;
    const confirmed = await confirm({
      message: `Remover o usuário "${item.nome}"? Esta ação não pode ser desfeita.`,
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await saasUsuariosService.delete(item.id);
      queryClient.invalidateQueries({ queryKey: ['saas-usuarios'] });
      refetch();
    } catch {
      error('Erro ao remover usuário');
    }
  }, [selectedItem, confirm, queryClient, refetch, error]);

  const columns: TableConfig<SaasUsuarioSuper>['columns'] = useMemo(() => [
    { key: 'id', label: 'ID', sortable: true, width: '50px', render: (item) => <span>{item.id}</span> },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (item) => (
        <div>
          <div className="fw-semibold">{item.nome}</div>
          <small className="text-muted">{item.email}</small>
        </div>
      ),
    },
    {
      key: 'nivel_acesso',
      label: 'Nível',
      sortable: true,
      width: '90px',
      render: (item) => (
        <span className={`badge bg-${NIVEL_COLOR[item.nivel_acesso] || 'secondary'}`}>
          {NIVEL_LABEL[item.nivel_acesso] || item.nivel_acesso}
        </span>
      ),
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      width: '80px',
      render: (item) => (
        <span className={`badge bg-${item.ativo ? 'success' : 'secondary'}`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      key: 'ultimo_login',
      label: 'Último Login',
      sortable: true,
      width: '150px',
      render: (item) => item.ultimo_login ? formatDateTime(item.ultimo_login) : <span className="text-muted">—</span>,
    },
  ], []);

  const bulkActions = useMemo(() => [
    { label: 'Novo', variant: 'primary' as const, action: () => setShowCreateModal(true) },
    {
      label: 'Editar',
      variant: 'primary' as const,
      disabled: (items: SaasUsuarioSuper[]) => items.length === 0 && !selectedItem,
      action: handleEdit,
    },
    {
      label: 'Deletar',
      disabled: (items: SaasUsuarioSuper[]) => items.length === 0 && !selectedItem,
      action: handleDelete,
    },
  ], [selectedItem, handleEdit, handleDelete]);

  const modalContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table
          title="Usuários SaaS"
          config={{
            columns,
            data: usuarios,
            loading: isLoading,
            searchable: true,
            searchPlaceholder: 'Buscar por nome ou email...',
            searchFields: [
              { key: 'nome', label: 'Nome' },
              { key: 'email', label: 'Email' },
            ],
            sortable: true,
            sortColumn: tableFilters.sortColumn,
            sortDirection: tableFilters.sortDirection,
            striped: true,
            hover: true,
            responsive: true,
            selectable: true,
            multiSelect: false,
            bulkActions: bulkActions.map(a => ({
              key: a.label.toLowerCase(),
              label: a.label,
              onClick: (items: SaasUsuarioSuper[]) => {
                const itemsToUse = items.length > 0 ? items : (selectedItem ? [selectedItem] : []);
                a.action(itemsToUse);
              },
              disabled: a.disabled,
              variant: a.variant,
            })),
            emptyMessage: 'Nenhum usuário cadastrado',
            pagination,
          }}
          tableId="saas-usuarios-list"
          onSelectionChange={handleSelectionChange}
          onRowDoubleClick={(item) => { setSelectedUsuarioId(item.id); setShowEditModal(true); }}
          onRefresh={refetch}
          onAudit={handleAudit}
          auditEntity="SaasUsuarioSuper"
          onPageChange={tableFilters.setPage}
          onPageSizeChange={tableFilters.setLimit}
          onSort={(col, dir) => tableFilters.setSort(col, dir)}
          onSearch={(s, f) => {
            setTimeout(() => {
              tableFilters.setSearch(s);
              if (f) tableFilters.setSearchField(f);
            }, 0);
          }}
          search={tableFilters.search}
        />
      </div>
    </div>
  );

  const auxiliaryModals = (
    <>
      <SaasUsuarioFormModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['saas-usuarios'] }); refetch(); }}
      />
      <SaasUsuarioFormModal
        show={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedUsuarioId(null); }}
        usuarioId={showEditModal ? selectedUsuarioId : null}
        onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['saas-usuarios'] }); refetch(); }}
      />
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Auditoria — Usuário SaaS"
        modalId="auditoria-saas-usuario-modal"
      />
      {confirmProps && <ConfirmModal {...confirmProps} />}
    </>
  );

  if (skipWrapper) return <>{modalContent}{auxiliaryModals}</>;

  return (
    <>
      <DraggableModal
        show={show}
        onClose={() => { clearSelection(); onClose(); }}
        title="Usuários SaaS"
        size="xl"
        modalId="saas-usuarios-list-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>
      {auxiliaryModals}
    </>
  );
};

export default SaasUsuariosModal;
