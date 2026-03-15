import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useModalSelect } from 'hooks/useModalSelect';
import { useAuditoria } from 'hooks/useAuditoria';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import ImprimirModal from 'components/common/ImprimirModal';
import { TableConfig } from 'components/tables/types';
import { saasPlanoService, type SaasPlano } from 'services/saas/saasPlanoService';
import SaasPlanoFormModal from './SaasPlanoFormModal';

interface Props {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

const SaasPlanoListModal: React.FC<Props> = ({ show, onClose, skipWrapper = false }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { error } = useNotificationContext();
  const auditoria = useAuditoria();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState<number | null>(null);

  const { selectedItem, handleSelectionChange, clearSelection } = useModalSelect<SaasPlano>();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saas-planos'],
    queryFn: () => saasPlanoService.list(),
    enabled: show,
    staleTime: 0,
  });

  const planos: SaasPlano[] = (data?.data as SaasPlano[] | undefined) || [];

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const handleAudit = useCallback((plano: SaasPlano) => {
    auditoria.handleAudit('SaasPlano', plano.id);
  }, [auditoria]);

  const handleEdit = useCallback((selectedItems?: SaasPlano[]) => {
    const item = (selectedItems && selectedItems.length > 0) ? selectedItems[0] : selectedItem;
    if (item) {
      setSelectedPlanoId(item.id);
      setShowEditModal(true);
    }
  }, [selectedItem]);

  const handleDelete = useCallback(async (selectedItems?: SaasPlano[]) => {
    const item = (selectedItems && selectedItems.length > 0) ? selectedItems[0] : selectedItem;
    if (!item) return;
    if (!window.confirm(t('messages.confirmDelete'))) return;
    try {
      await saasPlanoService.delete(item.id);
      queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
      refetch();
    } catch {
      error(t('messages.error'));
    }
  }, [selectedItem, queryClient, refetch, error, t]);

  const columns: TableConfig<SaasPlano>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '42px',
      render: (item) => <span>{item.id}</span>,
    },
    {
      key: 'nome',
      label: t('table.planName'),
      sortable: true,
      render: (item) => (
        <div>
          <div className="fw-semibold">{item.nome}</div>
          {item.descricao && <small className="text-muted">{item.descricao}</small>}
        </div>
      ),
    },
    {
      key: 'valor_mensal',
      label: t('table.monthlyValue'),
      sortable: true,
      width: '120px',
      render: (item) => <span className="text-success fw-semibold">{formatCurrency(item.valor_mensal)}</span>,
    },
    {
      key: 'valor_anual',
      label: 'Valor Anual',
      sortable: true,
      width: '120px',
      render: (item) => item.valor_anual
        ? <span className="text-success">{formatCurrency(item.valor_anual)}</span>
        : <span className="text-muted">—</span>,
    },
    {
      key: 'limite_usuarios',
      label: t('form.usersQuantity'),
      sortable: true,
      width: '80px',
      render: (item) => item.limite_usuarios,
    },
    {
      key: 'ativo',
      label: t('table.status'),
      sortable: true,
      badgeLabels: [t('status.active'), t('status.inactive')],
      render: (item) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? t('status.active') : t('status.inactive')}
        </span>
      ),
    },
  ], [t]);

  const bulkActions = useMemo(() => [
    {
      label: t('actions.create'),
      variant: 'primary' as const,
      action: () => setShowCreateModal(true),
    },
    {
      label: t('actions.edit'),
      variant: 'primary' as const,
      disabled: (items: SaasPlano[]) => items.length === 0 && !selectedItem,
      action: handleEdit,
    },
    {
      label: t('actions.delete'),
      disabled: (items: SaasPlano[]) => items.length === 0 && !selectedItem,
      action: handleDelete,
    },
  ], [selectedItem, handleEdit, handleDelete, t]);

  const modalContent = (
    <>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            title={t('modal.plans')}
            config={{
              columns,
              data: planos,
              loading: isLoading,
              searchable: true,
              searchPlaceholder: t('layout.searchPlaceholder'),
              sortable: true,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              bulkActions: bulkActions.map(a => ({
                key: a.label.toLowerCase().replace(/\s+/g, '-'),
                label: a.label,
                onClick: (items: SaasPlano[]) => {
                  const itemsToUse = items.length > 0 ? items : (selectedItem ? [selectedItem] : []);
                  a.action(itemsToUse);
                },
                disabled: a.disabled,
                variant: a.variant,
              })),
              emptyMessage: t('messages.noData'),
            }}
            tableId="saas-planos-list"
            syncWithHeader={false}
            onSelectionChange={handleSelectionChange}
            onRowDoubleClick={(item) => { setSelectedPlanoId(item.id); setShowEditModal(true); }}
            onRefresh={refetch}
            onAudit={handleAudit}
            auditEntity="SaasPlano"
          />
        </div>
      </div>
    </>
  );

  const auxiliaryModals = (
    <>
      <SaasPlanoFormModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
        }}
      />
      <SaasPlanoFormModal
        show={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedPlanoId(null); }}
        planoId={showEditModal ? selectedPlanoId : null}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
        }}
      />
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('modal.auditLogs')}
        modalId="auditoria-saas-plano-modal"
      />
    </>
  );

  if (skipWrapper) {
    return <>{modalContent}{auxiliaryModals}</>;
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={() => { clearSelection(); onClose(); }}
        title={t('modal.plans')}
        size="lg"
        modalId="saas-planos-list-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>
      {auxiliaryModals}
    </>
  );
};

export default SaasPlanoListModal;
