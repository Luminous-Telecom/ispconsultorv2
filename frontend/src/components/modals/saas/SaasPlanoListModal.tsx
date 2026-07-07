import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import ImprimirModal from 'components/common/ImprimirModal';
import { saasPlanoService, type SaasPlano } from 'services/saas/saasPlanoService';
import {
  extractEquipamentosFromSaasPlanoRecursos,
  extractModulosFromSaasPlanoRecursos,
} from 'utils/saasPlanoRecursos';
import SaasPlanoFormModal from './SaasPlanoFormModal';

interface Props {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onSelectPlano?: (plano: SaasPlano) => void;
  title?: string;
}

const SaasPlanoListModal: React.FC<Props> = ({ show, onClose, skipWrapper = false, onSelectPlano, title }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { error } = useNotificationContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState<number | null>(null);

  const list = useEntityListModal<SaasPlano>({ onClose, onSelect: onSelectPlano });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saas-planos'],
    queryFn: () => saasPlanoService.list(),
    enabled: show,
    staleTime: 0,
  });

  const planos: SaasPlano[] = (data?.data as SaasPlano[] | undefined) || [];

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await saasPlanoService.delete(id);
        queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
        refetch();
      } catch {
        error(t('messages.error'));
      }
    },
    [queryClient, refetch, error, t]
  );

  const columns = useMemo(
    (): ListModalConfig<SaasPlano>['columns'] => [
      { key: 'id', label: t('table.id'), sortable: true, width: '42px', render: (item) => <span>{item.id}</span> },
      {
        key: 'nome',
        label: t('table.planName'),
        sortable: true,
        render: (item) => <span className="fw-semibold">{item.nome}</span>,
      },
      {
        key: 'descricao',
        label: t('table.description'),
        sortable: true,
        render: (item) =>
          item.descricao?.trim() ? (
            <span className="text-muted small">{item.descricao}</span>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
      {
        key: 'valor_mensal',
        label: t('table.monthlyValue'),
        sortable: true,
        width: '120px',
        render: (item) => <span>{formatCurrency(item.valor_mensal)}</span>,
      },
      {
        key: 'valor_anual',
        label: 'Valor Anual',
        sortable: true,
        width: '120px',
        render: (item) =>
          item.valor_anual ? (
            <span>{formatCurrency(item.valor_anual)}</span>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
      {
        key: 'limite_usuarios',
        label: t('form.usersQuantity'),
        sortable: true,
        width: '80px',
        render: (item) => item.limite_usuarios,
      },
      {
        key: 'limites_equipamentos',
        label: t('saas.planTableEquipmentLimits'),
        sortable: false,
        width: '140px',
        render: (item) => {
          const modulos = extractModulosFromSaasPlanoRecursos(item.recursos);
          if (!modulos.includes('equipamentos')) {
            return <span className="text-muted">—</span>;
          }
          const limites = extractEquipamentosFromSaasPlanoRecursos(item.recursos);
          return (
            <div className="small lh-sm">
              <div>{t('saas.planLimitEquipamentosShort')}: {limites.limite_equipamentos}</div>
              <div>{t('saas.planLimitTuneisShort')}: {limites.limite_tuneis}</div>
              <div>{t('saas.planLimitBackupsPerDeviceShort')}: {limites.limite_backups}</div>
            </div>
          );
        },
      },
      {
        key: 'ativo',
        label: t('table.status'),
        sortable: true,
        render: (item) => (
          <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
            {item.ativo ? t('status.active') : t('status.inactive')}
          </span>
        ),
      },
    ],
    [t]
  );

  const bulkActions = useMemo(() => {
    if (onSelectPlano) return list.buildSelectBulkActions();
    return list.buildCrudBulkActions({
      onNew: () => setShowCreateModal(true),
      onEdit: (item) => {
        setSelectedPlanoId(item.id);
        setShowEditModal(true);
      },
      onDelete: handleDelete,
    });
  }, [onSelectPlano, list, handleDelete]);

  const defaultTitle = title ?? (onSelectPlano ? t('ui.selectPlan') : t('modal.plans'));

  const handleRowSelect = useCallback(
    (item: SaasPlano) => {
      onSelectPlano?.(item);
      onClose();
    },
    [onSelectPlano, onClose]
  );

  const listModal = (
    <ListModal<SaasPlano>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        emptyMessage: t('messages.noData'),
      }}
      data={planos}
      loading={isLoading}
      bulkActions={bulkActions}
      onSelectionChange={list.handleSelectionChange}
      onRowDoubleClick={
        onSelectPlano
          ? handleRowSelect
          : (item) => {
              setSelectedPlanoId(item.id);
              setShowEditModal(true);
            }
      }
      onAudit={(item) => list.auditoria.handleAudit('SaasPlano', item.id)}
      auditEntity="SaasPlano"
      onRefresh={refetch}
      tableId="saas-planos-list"
      modalId="saas-planos-list-modal"
    />
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
        onClose={() => {
          setShowEditModal(false);
          setSelectedPlanoId(null);
        }}
        planoId={showEditModal ? selectedPlanoId : null}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
        }}
      />
      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('modal.auditLogs')}
        modalId="auditoria-saas-plano-modal"
      />
    </>
  );

  return (
    <>
      {listModal}
      {auxiliaryModals}
    </>
  );
};

export default SaasPlanoListModal;
