import React, { useState, useCallback, useMemo } from 'react';
import { useTipoCobrancaContratos, useDeleteTipoCobrancaContrato } from 'hooks/useTipoCobrancaContratos';
import { useTableFilters } from 'hooks/useTableFilters';
import { TipoCobrancaContrato } from 'services/tipoCobrancaContratoService';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import TipoCobrancaContratoModal from './TipoCobrancaContratoModal';
import { useAuditoria } from 'hooks/useAuditoria';
import ImprimirModal from 'components/common/ImprimirModal';
import { useConfirmModal } from 'hooks/useConfirmModal';
import ConfirmModal from 'components/modals/ConfirmModal';

const PERIODICIDADE_LABELS: Record<string, string> = {
  mensal: 'form.periodicityMonthly',
  bimestral: 'form.periodicityBimonthly',
  trimestral: 'form.periodicityQuarterly',
  semestral: 'form.periodicitySemiannual',
  anual: 'form.periodicityAnnual',
  quinzenal: 'form.periodicityBiweekly',
  semanal: 'form.periodicityWeekly'
};

interface TipoCobrancaContratoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectTipo?: (tipo: TipoCobrancaContrato) => void;
  title?: string;
  skipWrapper?: boolean;
}

const TipoCobrancaContratoListModal: React.FC<TipoCobrancaContratoListModalProps> = ({
  show,
  onClose,
  onSelectTipo,
  title,
  skipWrapper = false
}) => {
  const { t } = useI18n();
  const defaultTitle = title || (onSelectTipo ? `Selecionar ${t('modal.billingType')}` : t('menu.billingType'));
  const [showTipoModal, setShowTipoModal] = useState(false);
  const [selectedTipoId, setSelectedTipoId] = useState<number | null>(null);

  const auditoria = useAuditoria();
  const { modalProps } = useConfirmModal();

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const { data: tiposData, isLoading, refetch } = useTipoCobrancaContratos({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  });

  const deleteMutation = useDeleteTipoCobrancaContrato();

  const pagination = useMemo(() => {
    if (tiposData?.pagination) {
      const pag = tiposData.pagination;
      const total = pag.total ?? 0;
      const perPage = pag.per_page ?? tableFilters.limit;
      const currentPage = pag.current_page ?? tableFilters.page;
      const lastPage = pag.last_page ?? Math.max(1, Math.ceil(total / perPage));
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
  }, [tiposData?.pagination, tableFilters.page, tableFilters.limit]);

  const tableColumns: TableConfig<TipoCobrancaContrato & { created_at?: string }>['columns'] = useMemo(() => [
    { key: 'id', label: t('table.id'), sortable: true, width: '42px', render: (item) => <span>{item.id}</span> },
    { key: 'nome', label: t('form.name'), sortable: true, render: (item) => item.nome },
    {
      key: 'quantidade_titulos',
      label: t('form.quantityTitles'),
      sortable: true,
      render: (item) => item.quantidade_titulos
    },
    {
      key: 'periodicidade',
      label: t('table.periodicity'),
      sortable: true,
      render: (item) => t((PERIODICIDADE_LABELS[item.periodicidade] || 'form.periodicityMonthly') as keyof import('contexts/I18nContext').TranslationKeys)
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
      )
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      render: (item) => item.created_at ? formatDateTime(item.created_at) : '-'
    }
  ], [t]);

  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'nome', label: t('form.name') },
    { key: 'quantidade_titulos', label: t('form.quantityTitles') }
  ];

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      refetch();
    } catch {
      // erro tratado pelo hook
    }
  }, [deleteMutation, refetch]);

  const bulkActions = useMemo(() => {
    const base = [
      {
        label: t('actions.create'),
        variant: 'primary' as const,
        action: () => {
          setSelectedTipoId(null);
          setShowTipoModal(true);
        }
      },
      {
        label: t('actions.edit'),
        variant: 'primary' as const,
        disabled: (items: TipoCobrancaContrato[]) => items.length === 0,
        action: (items: TipoCobrancaContrato[]) => {
          const item = items[0];
          if (item) {
            setSelectedTipoId(item.id);
            setShowTipoModal(true);
          }
        }
      },
      {
        label: t('actions.delete'),
        disabled: (items: TipoCobrancaContrato[]) => items.length === 0,
        action: async (items: TipoCobrancaContrato[]) => {
          const item = items[0];
          if (!item) return;
          const ok = window.confirm(t('messages.confirmDelete'));
          if (ok) handleDelete(item.id);
        }
      }
    ];
    return onSelectTipo ? [
      { label: t('buttons.cancel'), variant: 'primary' as const, action: () => onClose() },
      {
        label: t('buttons.select'),
        variant: 'primary' as const,
        disabled: (items: TipoCobrancaContrato[]) => items.length === 0,
        action: (items: TipoCobrancaContrato[]) => {
          const item = items[0];
          if (item) {
            onSelectTipo(item);
            onClose();
          }
        }
      }
    ] : base;
  }, [t, onSelectTipo, onClose, handleDelete]);

  const modalData = useMemo(() => {
    const d = tiposData?.data;
    return Array.isArray(d) ? d : [];
  }, [tiposData?.data]);

  const handleSelectionChange = useCallback((_items: TipoCobrancaContrato[]) => {
    // usado para seleção única
  }, []);

  const modalContent = (
    <>
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
              bulkActions: bulkActions.map(a => ({
                key: a.label.toLowerCase().replace(/\s+/g, '-'),
                label: a.label,
                onClick: a.action,
                disabled: a.disabled,
                variant: a.variant
              })),
              emptyMessage: 'Nenhum tipo de cobrança encontrado',
              pagination
            }}
            tableId="tipos-cobranca-contrato-modal"
            syncWithHeader={false}
            onSelectionChange={handleSelectionChange}
            onRowClick={onSelectTipo ? (item) => { onSelectTipo(item); onClose(); } : undefined}
            onRefresh={refetch}
            auditEntity="TipoCobrancaContrato"
            onPageChange={tableFilters.setPage}
            onPageSizeChange={tableFilters.setLimit}
            onSort={(col, dir) => tableFilters.setSort(col, dir)}
            onSearch={(s, f) => { tableFilters.setSearch(s); if (f) tableFilters.setSearchField(f); }}
            search={tableFilters.search}
          />
    </>
  );

  const auxiliaryModals = (
    <>
      <TipoCobrancaContratoModal
        show={showTipoModal}
        onClose={() => {
          setShowTipoModal(false);
          setSelectedTipoId(null);
        }}
        tipoId={selectedTipoId}
        onSuccess={() => {
          refetch();
          setShowTipoModal(false);
          setSelectedTipoId(null);
        }}
      />
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-tipo-cobranca-modal"
      />
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );

  if (skipWrapper) {
    return (
      <>
        {modalContent}
        {auxiliaryModals}
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
        modalId="tipos-cobranca-contrato-list-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>
      {auxiliaryModals}
    </>
  );
};

export default TipoCobrancaContratoListModal;
