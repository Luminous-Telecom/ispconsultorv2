import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useAuditoria } from '@/hooks/useAuditoria';
import { useI18n } from '@/contexts/I18nContext';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import ImprimirModal from '@/components/common/ImprimirModal';
import { TableConfig } from '@/components/tables/types';
import { saasBancoService, type SaasBanco, type SaasConfigListResponse } from '@/services/saas/saasConfigService';
import SaasBancoFormModal from './SaasBancoFormModal';

interface Props { show: boolean; onClose: () => void; skipWrapper?: boolean; onHeaderActionsReady?: (a: React.ReactNode) => void; }

const SaasBancosModal: React.FC<Props> = ({ show, onClose, skipWrapper = false }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { error } = useNotificationContext();
  const auditoria = useAuditoria();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { selectedItem, handleSelectionChange, clearSelection } = useModalSelect<SaasBanco>();

  const tf = useTableFilters({ initialPage: 1, initialLimit: 15, searchDebounceMs: 300, resetPageOnFilterChange: true });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saas-bancos', tf.page, tf.limit, tf.debouncedSearch, tf.sortColumn, tf.sortDirection],
    queryFn: () => saasBancoService.list({ page: tf.page, limit: tf.limit, search: tf.debouncedSearch || undefined, sortColumn: tf.sortColumn, sortDirection: tf.sortDirection }),
    enabled: show, staleTime: 0,
  });

  const listData = data?.data as SaasConfigListResponse<SaasBanco> | undefined;
  const items: SaasBanco[] = listData?.data || [];
  const pagination = useMemo(() => {
    const p = listData?.pagination;
    if (!p) return { current_page: 1, last_page: 1, per_page: 15, total: 0, from: 0, to: 0 };
    return { current_page: p.page, last_page: p.totalPages, per_page: p.limit, total: p.total, from: (p.page - 1) * p.limit + 1, to: Math.min(p.page * p.limit, p.total) };
  }, [listData?.pagination]);

  const handleEdit = useCallback((sel?: SaasBanco[]) => {
    const item = sel?.length ? sel[0] : selectedItem;
    if (item) { setSelectedId(item.id); setShowEdit(true); }
  }, [selectedItem]);

  const handleDelete = useCallback(async (sel?: SaasBanco[]) => {
    const item = sel?.length ? sel[0] : selectedItem;
    if (!item) return;
    if (!window.confirm(t('messages.confirmDelete'))) return;
    try { await saasBancoService.delete(item.id); queryClient.invalidateQueries({ queryKey: ['saas-bancos'] }); refetch(); }
    catch { error(t('messages.error')); }
  }, [selectedItem, queryClient, refetch, error, t]);

  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'nome', label: t('form.name') },
    { key: 'banco', label: t('menu.banks') },
    { key: 'tipo_banco', label: t('table.bankType') },
    { key: 'ativo', label: t('table.status') },
  ];

  const columns: TableConfig<SaasBanco>['columns'] = useMemo(() => {
    const tipoBancoLabels: Record<string, string> = { efi: 'EFI', asaas: 'Asaas', bancario: 'Bancário', outros: 'Outros' };
    return [
    { key: 'id', label: t('table.id'), sortable: true, width: '42px', render: i => <span>{i.id}</span> },
    { key: 'nome', label: t('form.name'), sortable: true, width: '180px', render: i => i.nome || i.banco },
    { key: 'banco', label: t('menu.banks'), sortable: true, width: '120px', render: i => i.banco },
    { key: 'tipo_banco', label: t('table.bankType'), sortable: true, width: '100px', render: i => <span className="badge bg-info">{tipoBancoLabels[i.tipo_banco || ''] || '—'}</span> },
    { key: 'agencia', label: 'Agência', sortable: true, width: '90px', render: i => i.agencia || '—' },
    { key: 'conta', label: 'Conta', sortable: true, width: '110px', render: i => i.conta || '—' },
    { key: 'tipo_conta', label: t('form.type'), sortable: true, width: '100px', render: i => i.tipo_conta },
    { key: 'pix_chave', label: 'PIX', sortable: false, render: i => i.pix_chave ? <span>{i.pix_tipo?.toUpperCase()}: {i.pix_chave}</span> : <span className="text-muted">—</span> },
    { key: 'ativo', label: t('table.status'), sortable: true, width: '80px', render: i => <span className={`badge bg-${i.ativo ? 'success' : 'secondary'}`}>{i.ativo ? t('status.active') : t('status.inactive')}</span> },
  ];
  }, [t]);

  const bulkActions = useMemo(() => [
    { label: t('actions.create'), variant: 'primary' as const, action: () => setShowCreate(true) },
    { label: t('actions.edit'), variant: 'primary' as const, disabled: (s: SaasBanco[]) => s.length === 0 && !selectedItem, action: handleEdit },
    { label: t('actions.delete'), disabled: (s: SaasBanco[]) => s.length === 0 && !selectedItem, action: handleDelete },
  ], [selectedItem, handleEdit, handleDelete, t]);

  const modalContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table title={t('modal.banks')} config={{ columns, data: items, loading: isLoading, searchable: true, searchPlaceholder: t('layout.searchPlaceholder'), searchFields, sortable: true, sortColumn: tf.sortColumn, sortDirection: tf.sortDirection, striped: true, hover: true, responsive: true, selectable: true, multiSelect: false,
          bulkActions: bulkActions.map(a => ({ key: a.label.toLowerCase().replace(/\s+/g, '-'), label: a.label, onClick: (s: SaasBanco[]) => { const u = s.length > 0 ? s : (selectedItem ? [selectedItem] : []); a.action(u); }, disabled: a.disabled, variant: a.variant })),
          emptyMessage: 'Nenhum banco encontrado', pagination,
        }}
          tableId="saas-bancos-list" onSelectionChange={handleSelectionChange}
          onRowDoubleClick={i => { setSelectedId(i.id); setShowEdit(true); }}
          onRefresh={refetch} onAudit={i => auditoria.handleAudit('SaasBanco', i.id)} auditEntity="SaasBanco"
          onPageChange={tf.setPage} onPageSizeChange={tf.setLimit} onSort={(c, d) => tf.setSort(c, d)}
          onSearch={(s, f) => setTimeout(() => { tf.setSearch(s); if (f) tf.setSearchField(f); }, 0)} search={tf.search}
        />
      </div>
    </div>
  );

  const auxiliaryModals = (
    <>
      <SaasBancoFormModal show={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['saas-bancos'] }); refetch(); }} />
      <SaasBancoFormModal show={showEdit} onClose={() => { setShowEdit(false); setSelectedId(null); }} itemId={showEdit ? selectedId : null} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['saas-bancos'] }); refetch(); }} />
      <ImprimirModal show={auditoria.showPreview} onClose={auditoria.handleClosePreview} pdfUrl={auditoria.pdfUrl} isGenerating={auditoria.isGeneratingPdf} title={t('modal.auditLogs')} modalId="audit-saas-banco" />
    </>
  );

  if (skipWrapper) return <>{modalContent}{auxiliaryModals}</>;
  return (
    <>
      <DraggableModal show={show} onClose={() => { clearSelection(); onClose(); }} title={t('modal.banks')} size="lg" modalId="saas-bancos-modal" className="no-padding">
        {modalContent}
      </DraggableModal>
      {auxiliaryModals}
    </>
  );
};

export default SaasBancosModal;
