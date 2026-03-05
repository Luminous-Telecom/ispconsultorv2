import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useAuditoria } from '@/hooks/useAuditoria';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import ImprimirModal from '@/components/common/ImprimirModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { TableConfig } from '@/components/tables/types';
import { saasServidorWhatsappService, type SaasServidorWhatsapp, type SaasConfigListResponse } from '@/services/saas/saasConfigService';
import SaasServidorWhatsappFormModal from './SaasServidorWhatsappFormModal';

interface Props { show: boolean; onClose: () => void; skipWrapper?: boolean; onHeaderActionsReady?: (a: React.ReactNode) => void; }

const STATUS_COLOR: Record<string, string> = { ativo: 'success', inativo: 'secondary', erro: 'danger' };

const SaasServidorWhatsappModal: React.FC<Props> = ({ show, onClose, skipWrapper = false }) => {
  const queryClient = useQueryClient();
  const { error } = useNotificationContext();
  const auditoria = useAuditoria();
  const { confirm, modalProps: confirmProps } = useConfirmModal();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { selectedItem, handleSelectionChange, clearSelection } = useModalSelect<SaasServidorWhatsapp>();

  const tf = useTableFilters({ initialPage: 1, initialLimit: 15, searchDebounceMs: 300, resetPageOnFilterChange: true });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saas-servidores-whatsapp', tf.page, tf.limit, tf.debouncedSearch, tf.sortColumn, tf.sortDirection],
    queryFn: () => saasServidorWhatsappService.list({ page: tf.page, limit: tf.limit, search: tf.debouncedSearch || undefined, sortColumn: tf.sortColumn, sortDirection: tf.sortDirection }),
    enabled: show, staleTime: 0,
  });

  const listData = data?.data as SaasConfigListResponse<SaasServidorWhatsapp> | undefined;
  const items: SaasServidorWhatsapp[] = listData?.data || [];
  const pagination = useMemo(() => {
    const p = listData?.pagination;
    if (!p) return { current_page: 1, last_page: 1, per_page: 15, total: 0, from: 0, to: 0 };
    return { current_page: p.page, last_page: p.totalPages, per_page: p.limit, total: p.total, from: (p.page - 1) * p.limit + 1, to: Math.min(p.page * p.limit, p.total) };
  }, [listData?.pagination]);

  const handleEdit = useCallback((sel?: SaasServidorWhatsapp[]) => {
    const item = sel?.length ? sel[0] : selectedItem;
    if (item) { setSelectedId(item.id); setShowEdit(true); }
  }, [selectedItem]);

  const handleDelete = useCallback(async (sel?: SaasServidorWhatsapp[]) => {
    const item = sel?.length ? sel[0] : selectedItem;
    if (!item) return;
    const ok = await confirm({ message: `Remover o servidor "${item.nome}"?`, variant: 'danger' });
    if (!ok) return;
    try { await saasServidorWhatsappService.delete(item.id); queryClient.invalidateQueries({ queryKey: ['saas-servidores-whatsapp'] }); refetch(); }
    catch { error('Erro ao remover servidor'); }
  }, [selectedItem, confirm, queryClient, refetch, error]);

  const columns: TableConfig<SaasServidorWhatsapp>['columns'] = useMemo(() => [
    { key: 'id', label: 'ID', sortable: true, width: '50px', render: i => <span>{i.id}</span> },
    { key: 'nome', label: 'Nome', sortable: true, render: i => <div><div className="fw-semibold">{i.nome}</div><small className="text-muted">{(i.empresa as { nome_empresa?: string })?.nome_empresa}</small></div> },
    { key: 'url_api', label: 'URL API', sortable: false, render: i => <span className="text-truncate" style={{ maxWidth: 200, display: 'block' }}>{i.url_api}</span> },
    { key: 'numero', label: 'Número', sortable: true, width: '130px', render: i => <span>{i.numero || '—'}</span> },
    { key: 'status', label: 'Status', sortable: true, width: '90px', render: i => <span className={`badge bg-${STATUS_COLOR[i.status] || 'secondary'}`}>{i.status}</span> },
  ], []);

  const bulkActions = useMemo(() => [
    { label: 'Novo', variant: 'primary' as const, action: () => setShowCreate(true) },
    { label: 'Editar', variant: 'primary' as const, disabled: (s: SaasServidorWhatsapp[]) => s.length === 0 && !selectedItem, action: handleEdit },
    { label: 'Deletar', disabled: (s: SaasServidorWhatsapp[]) => s.length === 0 && !selectedItem, action: handleDelete },
  ], [selectedItem, handleEdit, handleDelete]);

  const modalContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table title="Servidores WhatsApp" config={{ columns, data: items, loading: isLoading, searchable: true, searchPlaceholder: 'Buscar...', sortable: true, sortColumn: tf.sortColumn, sortDirection: tf.sortDirection, striped: true, hover: true, responsive: true, selectable: true, multiSelect: false,
          bulkActions: bulkActions.map(a => ({ key: a.label.toLowerCase(), label: a.label, onClick: (s: SaasServidorWhatsapp[]) => { const u = s.length > 0 ? s : (selectedItem ? [selectedItem] : []); a.action(u); }, disabled: a.disabled, variant: a.variant })),
          emptyMessage: 'Nenhum servidor cadastrado', pagination,
        }}
          tableId="saas-servidores-whatsapp-list" onSelectionChange={handleSelectionChange}
          onRowDoubleClick={i => { setSelectedId(i.id); setShowEdit(true); }}
          onRefresh={refetch} onAudit={i => auditoria.handleAudit('SaasServidorWhatsapp', i.id)} auditEntity="SaasServidorWhatsapp"
          onPageChange={tf.setPage} onPageSizeChange={tf.setLimit} onSort={(c, d) => tf.setSort(c, d)}
          onSearch={(s, f) => setTimeout(() => { tf.setSearch(s); if (f) tf.setSearchField(f); }, 0)} search={tf.search}
        />
      </div>
    </div>
  );

  const auxiliaryModals = (
    <>
      <SaasServidorWhatsappFormModal show={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['saas-servidores-whatsapp'] }); refetch(); }} />
      <SaasServidorWhatsappFormModal show={showEdit} onClose={() => { setShowEdit(false); setSelectedId(null); }} itemId={showEdit ? selectedId : null} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['saas-servidores-whatsapp'] }); refetch(); }} />
      <ImprimirModal show={auditoria.showPreview} onClose={auditoria.handleClosePreview} pdfUrl={auditoria.pdfUrl} isGenerating={auditoria.isGeneratingPdf} title="Auditoria — Servidor WhatsApp" modalId="audit-saas-whatsapp" />
      {confirmProps && <ConfirmModal {...confirmProps} />}
    </>
  );

  if (skipWrapper) return <>{modalContent}{auxiliaryModals}</>;
  return (
    <>
      <DraggableModal show={show} onClose={() => { clearSelection(); onClose(); }} title="Servidores WhatsApp (SaaS)" size="xl" modalId="saas-servidores-whatsapp-modal" className="no-padding">
        {modalContent}
      </DraggableModal>
      {auxiliaryModals}
    </>
  );
};

export default SaasServidorWhatsappModal;
