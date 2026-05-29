import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePlanos, useDeletePlano } from 'hooks/usePlanos';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { Plano, PlanoFilters } from 'types';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import PlanoModal from './PlanoModal';
import ImprimirModal from 'components/common/ImprimirModal';

interface PlanoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectPlano?: (plano: Plano) => void;
  title?: string;
  skipWrapper?: boolean;
  initialFilters?: Partial<PlanoFilters>;
}

const PlanoListModal: React.FC<PlanoListModalProps> = ({
  show,
  onClose,
  onSelectPlano,
  title,
  skipWrapper = false,
  initialFilters,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showPlanoModal, setShowPlanoModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const list = useEntityListModal<Plano>({
    onClose,
    onSelect: onSelectPlano,
  });

  const getStatusBadgeClass = useCallback((status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-success';
      case 'inativo':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  }, []);

  const getTipoServicoLabel = useCallback(
    (tipo: string) => {
      const tipos: Record<string, string> = {
        infraestrutura: t('form.serviceTypeInfrastructure'),
        consultoria: t('form.serviceTypeConsulting'),
        blockdomi: t('form.serviceTypeBlockdomi'),
      };
      return tipos[tipo] || tipo;
    },
    [t]
  );

  const filterTitleSuffix = initialFilters?.status
    ? ` - ${initialFilters.status === 'ativo' ? t('status.active') : t('status.inactive')}`
    : initialFilters?.tipo_servico
      ? ` - ${getTipoServicoLabel(initialFilters.tipo_servico)}`
      : '';
  const defaultTitle =
    (title || (onSelectPlano ? t('ui.selectPlan') : t('menu.plans'))) + filterTitleSuffix;

  const { data: planosData, isLoading, refetch } = usePlanos({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
    ...(initialFilters && Object.keys(initialFilters).length > 0 ? initialFilters : {}),
  });

  const deletePlanoMutation = useDeletePlano();

  const handleDelete = useCallback(
    async (planoId: number) => {
      try {
        await deletePlanoMutation.mutateAsync(planoId);
        refetch();
      } catch {
        // Erro tratado pelo useNotificationContext
      }
    },
    [deletePlanoMutation, refetch]
  );

  const handleAudit = useCallback(
    (plano: Plano) => {
      list.auditoria.handleAudit('Plano', plano.id);
    },
    [list.auditoria]
  );

  const columns = useMemo(
    (): ListModalConfig<Plano>['columns'] => [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '42px',
        render: (item) => <span>{item.id}</span>,
      },
      {
        key: 'nome_plano',
        label: t('table.planName'),
        sortable: true,
        width: '180px',
        render: (item) => item.nome_plano,
      },
      {
        key: 'descricao',
        label: t('form.description'),
        sortable: true,
        width: '200px',
        render: (item) => item.descricao || '-',
      },
      {
        key: 'tipo_servico',
        label: t('table.serviceType'),
        sortable: true,
        render: (item) => (
          <span className="badge bg-info">{getTipoServicoLabel(item.tipo_servico)}</span>
        ),
      },
      {
        key: 'valor_mensal',
        label: t('table.monthlyValue'),
        sortable: true,
        width: '120px',
        render: (item) => (
          <span className="text-success">
            R$ {Number(item.valor_mensal || 0).toFixed(2).replace('.', ',')}
          </span>
        ),
      },
      {
        key: 'quantidade_usuarios',
        label: t('form.usersQuantity'),
        sortable: true,
        width: '100px',
        render: (item) => <span>{item.quantidade_usuarios || '-'}</span>,
      },
      {
        key: 'quantidade_clientes',
        label: t('table.clients'),
        sortable: true,
        render: (item) => (
          <span className="badge bg-primary">
            {item.quantidade_clientes ?? (item.clientes ? item.clientes.length : 0)}
          </span>
        ),
      },
      {
        key: 'status',
        label: t('table.status'),
        sortable: true,
        render: (item) => {
          const statusMap: Record<string, string> = {
            ativo: t('status.active'),
            inativo: t('status.inactive'),
          };
          return (
            <span className={`badge ${getStatusBadgeClass(item.status)}`}>
              {statusMap[item.status] || item.status}
            </span>
          );
        },
      },
      {
        key: 'created_at',
        label: t('table.createdAt'),
        sortable: true,
        width: '145px',
        render: (item) => {
          const row = item as Plano & { created_at_formatada?: string | null; created_at?: string };
          if (row.created_at_formatada) return row.created_at_formatada;
          return row.created_at ? formatDateTime(row.created_at) : '-';
        },
      },
    ],
    [getStatusBadgeClass, getTipoServicoLabel, t]
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: t('table.id') },
      { key: 'nome_plano', label: t('table.planName') },
      { key: 'descricao', label: t('form.description') },
      { key: 'tipo_servico', label: t('table.serviceType') },
      { key: 'valor_mensal', label: t('table.monthlyValue') },
      { key: 'quantidade_usuarios', label: t('form.usersQuantity') },
      { key: 'status', label: t('table.status') },
    ],
    [t]
  );

  const bulkActions = useMemo(() => {
    if (onSelectPlano) {
      return list.buildSelectBulkActions();
    }
    return list.buildCrudBulkActions({
      onNew: () => {
        list.setSelectedEntityId(null);
        setIsEditMode(false);
        setShowPlanoModal(true);
      },
      onEdit: (item) => {
        list.setSelectedEntityId(item.id);
        setIsEditMode(true);
        setShowPlanoModal(true);
      },
      onDelete: handleDelete,
    });
  }, [onSelectPlano, list, handleDelete]);

  const pagination = useMemo(
    () => list.buildPagination(planosData?.pagination),
    [list, planosData?.pagination]
  );

  const modalData = useMemo(() => planosData?.data || [], [planosData?.data]);

  const handleRowSelect = useCallback(
    (item: Plano) => {
      onSelectPlano?.(item);
      onClose();
    },
    [onSelectPlano, onClose]
  );

  const listModal = (
    <ListModal<Plano>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchFields,
        emptyMessage: 'Nenhum plano encontrado',
      }}
      data={modalData}
      loading={isLoading}
      search={list.tableFilters.search}
      onSearchChange={list.handleSearchChange}
      sortColumn={list.tableFilters.sortColumn}
      sortDirection={list.tableFilters.sortDirection}
      onSortChange={list.tableFilters.setSort}
      pagination={pagination}
      onPageChange={list.tableFilters.setPage}
      onLimitChange={list.tableFilters.setLimit}
      onRefresh={refetch}
      bulkActions={bulkActions}
      onSelectionChange={list.handleSelectionChange}
      onRowClick={onSelectPlano ? handleRowSelect : undefined}
      onRowDoubleClick={onSelectPlano ? handleRowSelect : undefined}
      onAudit={handleAudit}
      auditEntity="Plano"
      tableId="planos-list-modal"
      modalId="planos-list-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <PlanoModal
        show={showPlanoModal}
        onClose={() => {
          setShowPlanoModal(false);
          setIsEditMode(false);
          list.setSelectedEntityId(null);
        }}
        planoId={isEditMode ? list.selectedEntityId : null}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['planos'] });
          setShowPlanoModal(false);
          setIsEditMode(false);
          list.setSelectedEntityId(null);
        }}
      />

      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-plano-modal"
      />
    </>
  );

  if (skipWrapper) {
    return (
      <>
        {listModal}
        {auxiliaryModals}
      </>
    );
  }

  return (
    <>
      {listModal}
      {auxiliaryModals}
    </>
  );
};

export default PlanoListModal;
