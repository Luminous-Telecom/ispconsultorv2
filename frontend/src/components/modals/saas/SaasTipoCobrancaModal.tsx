import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTableFilters } from 'hooks/useTableFilters';
import { useModalSelect } from 'hooks/useModalSelect';
import { useAuditoria } from 'hooks/useAuditoria';
import { useI18n } from 'contexts/I18nContext';
import { useBulkBtn } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import ImprimirModal from 'components/common/ImprimirModal';
import { TableConfig } from 'components/tables/types';
import { saasTipoCobrancaService, type SaasTipoCobranca, type SaasConfigListResponse } from 'services/saas/saasCrudService';
import SaasTipoCobrancaFormModal from './SaasTipoCobrancaFormModal';

interface Props { show: boolean; onClose: () => void; skipWrapper?: boolean; onHeaderActionsReady?: (a: React.ReactNode) => void; }

const PERIODICIDADE_LABEL: Record<string, string> = {
  mensal: 'Mensal', bimestral: 'Bimestral', trimestral: 'Trimestral', semestral: 'Semestral',
  anual: 'Anual', quinzenal: 'Quinzenal', semanal: 'Semanal',
};

const SaasTipoCobrancaModal: React.FC<Props> = ({ show, onClose, skipWrapper = false }) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const queryClient = useQueryClient();
  const { error } = useNotificationContext();
  const auditoria = useAuditoria();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { selectedItem, handleSelectionChange, clearSelection } = useModalSelect<SaasTipoCobranca>();

  const tf = useTableFilters({ initialPage: 1, initialLimit: 15, searchDebounceMs: 300, resetPageOnFilterChange: true });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saas-tipos-cobranca', tf.page, tf.limit, tf.debouncedSearch, tf.sortColumn, tf.sortDirection],
    queryFn: () => saasTipoCobrancaService.list({ page: tf.page, limit: tf.limit, search: tf.debouncedSearch || undefined, sortColumn: tf.sortColumn, sortDirection: tf.sortDirection }),
    enabled: show, staleTime: 0,
  });

  const listData = data?.data as SaasConfigListResponse<SaasTipoCobranca> | undefined;
  const items: SaasTipoCobranca[] = listData?.data || [];
  const pagination = useMemo(() => {
    const p = listData?.pagination;
    if (!p) return { current_page: 1, last_page: 1, per_page: 15, total: 0, from: 0, to: 0 };
    return { current_page: p.page, last_page: p.totalPages, per_page: p.limit, total: p.total, from: (p.page - 1) * p.limit + 1, to: Math.min(p.page * p.limit, p.total) };
  }, [listData?.pagination]);

  const handleEdit = useCallback((sel?: SaasTipoCobranca[]) => {
    const item = sel?.length ? sel[0] : selectedItem;
    if (item) { setSelectedId(item.id); setShowEdit(true); }
  }, [selectedItem]);

  const handleDelete = useCallback(async (sel?: SaasTipoCobranca[]) => {
    const item = sel?.length ? sel[0] : selectedItem;
    if (!item) return;
    if (!window.confirm(t('messages.confirmDelete'))) return;
    try { await saasTipoCobrancaService.delete(item.id); queryClient.invalidateQueries({ queryKey: ['saas-tipos-cobranca'] }); refetch(); }
    catch { error(t('messages.error')); }
  }, [selectedItem, queryClient, refetch, error, t]);

  const columns: TableConfig<SaasTipoCobranca>['columns'] = useMemo(() => [
    { key: 'id', label: t('table.id'), sortable: true, width: '42px', render: i => <span>{i.id}</span> },
    { key: 'nome', label: t('form.name'), sortable: true, render: i => <span className="fw-semibold">{i.nome}</span> },
    { key: 'quantidade_titulos', label: 'Qtd. Títulos', sortable: true, width: '100px', render: i => <span>{i.quantidade_titulos}</span> },
    { key: 'periodicidade', label: t('table.periodicity'), sortable: true, width: '120px', render: i => <span>{PERIODICIDADE_LABEL[i.periodicidade] || i.periodicidade}</span> },
    { key: 'ativo', label: t('table.status'), sortable: true, width: '80px', render: i => <span className={`badge bg-${i.ativo ? 'success' : 'secondary'}`}>{i.ativo ? t('status.active') : t('status.inactive')}</span> },
  ], [t]);

  const bulkActions = useMemo(() => [
    { label: bulkBtn.novo.label, variant: bulkBtn.novo.variant, action: () => setShowCreate(true) },
    { label: bulkBtn.editar.label, variant: bulkBtn.editar.variant, disabled: (s: SaasTipoCobranca[]) => s.length === 0 && !selectedItem, action: handleEdit },
    { label: bulkBtn.deletar.label, variant: bulkBtn.deletar.variant, disabled: (s: SaasTipoCobranca[]) => s.length === 0 && !selectedItem, action: handleDelete },
  ], [selectedItem, handleEdit, handleDelete, bulkBtn]);

  const modalContent = (
    <Table title={t('modal.billingType')} config={{
          columns, data: items, loading: isLoading, searchable: true, searchPlaceholder: t('layout.searchPlaceholder'), sortable: true, sortColumn: tf.sortColumn, sortDirection: tf.sortDirection, striped: true, hover: true, responsive: true, selectable: true, multiSelect: false,
          bulkActions: bulkActions.map(a => ({ key: a.label.toLowerCase().replace(/\s+/g, '-'), label: a.label, onClick: (s: SaasTipoCobranca[]) => { const u = s.length > 0 ? s : (selectedItem ? [selectedItem] : []); a.action(u); }, disabled: a.disabled, variant: a.variant })),
          emptyMessage: t('messages.noData'), pagination,
        }}
          syncWithHeader={false}
          tableId="saas-tipos-cobranca-list" onSelectionChange={handleSelectionChange}
          onRowDoubleClick={i => { setSelectedId(i.id); setShowEdit(true); }}
          onRefresh={refetch} onAudit={i => auditoria.handleAudit('SaasTipoCobranca', i.id)} auditEntity="SaasTipoCobranca"
          onPageChange={tf.setPage} onPageSizeChange={tf.setLimit} onSort={(c, d) => tf.setSort(c, d)}
          onSearch={(s, f) => setTimeout(() => { tf.setSearch(s); if (f) tf.setSearchField(f); }, 0)} search={tf.search}
          />
  );

  const auxiliaryModals = (
    <>
      <SaasTipoCobrancaFormModal show={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['saas-tipos-cobranca'] }); refetch(); }} />
      <SaasTipoCobrancaFormModal show={showEdit} onClose={() => { setShowEdit(false); setSelectedId(null); }} itemId={showEdit ? selectedId : null} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['saas-tipos-cobranca'] }); refetch(); }} />
      <ImprimirModal show={auditoria.showPreview} onClose={auditoria.handleClosePreview} pdfUrl={auditoria.pdfUrl} isGenerating={auditoria.isGeneratingPdf} title={t('modal.auditLogs')} modalId="audit-saas-tipo-cobranca" />
    </>
  );

  if (skipWrapper) return <>{modalContent}{auxiliaryModals}</>;
  return (
    <>
      <DraggableModal show={show} onClose={() => { clearSelection(); onClose(); }} title={t('modal.billingType')} size="lg" modalId="saas-tipos-cobranca-modal" className="no-padding">
        {modalContent}
      </DraggableModal>
      {auxiliaryModals}
    </>
  );
};

export default SaasTipoCobrancaModal;
