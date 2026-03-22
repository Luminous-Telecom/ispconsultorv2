import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTableFilters } from 'hooks/useTableFilters';
import { useModalSelect } from 'hooks/useModalSelect';
import { useAuditoria } from 'hooks/useAuditoria';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import ImprimirModal from 'components/common/ImprimirModal';
import { TableConfig } from 'components/tables/types';
import { saasEmpresasService, type SaasEmpresa, type SaasConfigListResponse } from 'services/saas/saasEmpresasService';
import SaasEmpresaFormModal from './SaasEmpresaFormModal';

interface Props { show: boolean; onClose: () => void; skipWrapper?: boolean; onHeaderActionsReady?: (a: React.ReactNode) => void; empresaId?: number; initialFilters?: { created_at_inicio?: string; created_at_fim?: string }; }

const SaasClientesModal: React.FC<Props> = ({ show, onClose, skipWrapper = false, empresaId, initialFilters }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { error } = useNotificationContext();
  const auditoria = useAuditoria();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { selectedItem, handleSelectionChange, clearSelection } = useModalSelect<SaasEmpresa>();

  const tf = useTableFilters({ initialPage: 1, initialLimit: 15, searchDebounceMs: 300, resetPageOnFilterChange: true });

  useEffect(() => {
    if (show && empresaId) {
      setSelectedId(empresaId);
      setShowEdit(true);
    }
  }, [show, empresaId]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saas-empresas', tf.page, tf.limit, tf.debouncedSearch, tf.sortColumn, tf.sortDirection, initialFilters?.created_at_inicio, initialFilters?.created_at_fim],
    queryFn: () => saasEmpresasService.list({
      page: tf.page,
      limit: tf.limit,
      search: tf.debouncedSearch || undefined,
      sortColumn: tf.sortColumn,
      sortDirection: tf.sortDirection,
      ...(initialFilters?.created_at_inicio && { created_at_inicio: initialFilters.created_at_inicio }),
      ...(initialFilters?.created_at_fim && { created_at_fim: initialFilters.created_at_fim }),
    }),
    enabled: show, staleTime: 0,
  });

  const listData = data?.data as SaasConfigListResponse<SaasEmpresa> | undefined;
  const items: SaasEmpresa[] = listData?.data || [];
  const pagination = useMemo(() => {
    const p = listData?.pagination;
    if (!p) return { current_page: 1, last_page: 1, per_page: 15, total: 0, from: 0, to: 0 };
    return { current_page: p.page, last_page: p.totalPages, per_page: p.limit, total: p.total, from: (p.page - 1) * p.limit + 1, to: Math.min(p.page * p.limit, p.total) };
  }, [listData?.pagination]);

  const handleEdit = useCallback((sel?: SaasEmpresa[]) => {
    const item = sel?.length ? sel[0] : selectedItem;
    if (item) { setSelectedId(item.id); setShowEdit(true); }
  }, [selectedItem]);

  const handleDelete = useCallback(async (sel?: SaasEmpresa[]) => {
    const item = sel?.length ? sel[0] : selectedItem;
    if (!item) return;
    if (!window.confirm(t('messages.confirmDelete'))) return;
    try { await saasEmpresasService.delete(item.id); queryClient.invalidateQueries({ queryKey: ['saas-empresas'] }); refetch(); }
    catch { error(t('messages.error')); }
  }, [selectedItem, queryClient, refetch, error, t]);

  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'razao_social', label: t('form.companyName') },
    { key: 'cnpj', label: t('form.cnpj') },
    { key: 'email', label: t('form.email') },
  ];

  const columns: TableConfig<SaasEmpresa>['columns'] = useMemo(() => [
    { key: 'id', label: t('table.id'), sortable: true, width: '42px', render: i => <span>{i.id}</span> },
    { key: 'razao_social', label: t('form.companyName'), sortable: true, render: i => <div><div className="fw-semibold">{i.razao_social}</div><small className="text-muted">{i.nome_fantasia || i.email}</small></div> },
    { key: 'cnpj', label: t('form.cnpj'), sortable: true, width: '130px', render: i => <span>{i.cnpj}</span> },
    { key: 'email', label: t('form.email'), sortable: true, render: i => <span>{i.email}</span> },
    { key: 'total_usuarios', label: t('form.usersQuantity'), sortable: false, width: '80px', render: i => <span className="text-muted">{i.total_usuarios ?? '—'}</span> },
  ], [t]);

  const bulkActions = useMemo(() => [
    { label: t('actions.create'), variant: 'primary' as const, action: () => setShowCreate(true) },
    { label: t('actions.edit'), variant: 'primary' as const, disabled: (s: SaasEmpresa[]) => s.length === 0 && !selectedItem, action: handleEdit },
    { label: t('actions.delete'), disabled: (s: SaasEmpresa[]) => s.length === 0 && !selectedItem, action: handleDelete },
  ], [selectedItem, handleEdit, handleDelete, t]);

  const modalContent = (
    <div className="list-modal-table-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="list-modal-scroll-wrapper" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table title={t('modal.clientsTenants')} config={{
          columns, data: items, loading: isLoading, searchable: true, searchPlaceholder: t('layout.searchPlaceholder'), searchFields, sortable: true, sortColumn: tf.sortColumn, sortDirection: tf.sortDirection, striped: true, hover: true, responsive: true, selectable: true, multiSelect: false,
          bulkActions: bulkActions.map(a => ({ key: a.label.toLowerCase().replace(/\s+/g, '-'), label: a.label, onClick: (s: SaasEmpresa[]) => { const u = s.length > 0 ? s : (selectedItem ? [selectedItem] : []); a.action(u); }, disabled: a.disabled, variant: a.variant })),
          emptyMessage: t('messages.noData'), pagination, className: 'no-padding',
        }}
          tableId="saas-empresas-list" onSelectionChange={handleSelectionChange}
          onRowDoubleClick={i => { setSelectedId(i.id); setShowEdit(true); }}
          onRefresh={refetch} onAudit={i => auditoria.handleAudit('DadosEmpresa', i.id)} auditEntity="DadosEmpresa"
          onPageChange={tf.setPage} onPageSizeChange={tf.setLimit} onSort={(c, d) => tf.setSort(c, d)}
          onSearch={(s, f) => setTimeout(() => { tf.setSearch(s); if (f) tf.setSearchField(f); }, 0)} search={tf.search}
        />
      </div>
    </div>
  );

  const auxiliaryModals = (
    <>
      <SaasEmpresaFormModal show={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['saas-empresas'] }); refetch(); }} />
      <SaasEmpresaFormModal show={showEdit} onClose={() => { setShowEdit(false); setSelectedId(null); }} itemId={showEdit ? selectedId : null} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['saas-empresas'] }); refetch(); }} />
      <ImprimirModal show={auditoria.showPreview} onClose={auditoria.handleClosePreview} pdfUrl={auditoria.pdfUrl} isGenerating={auditoria.isGeneratingPdf} title={t('modal.auditLogs')} modalId="audit-saas-empresa" />
    </>
  );

  if (skipWrapper) return <>{modalContent}{auxiliaryModals}</>;
  return (
    <>
      <DraggableModal show={show} onClose={() => { clearSelection(); onClose(); }} title={t('modal.clientsTenants')} size="lg" modalId="saas-clientes-modal" className="no-padding">
        {modalContent}
      </DraggableModal>
      {auxiliaryModals}
    </>
  );
};

export default SaasClientesModal;
