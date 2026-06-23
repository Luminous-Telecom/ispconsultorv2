import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useI18n } from 'contexts/I18nContext';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import ImprimirModal from 'components/common/ImprimirModal';
import { saasBancoService, type SaasBanco, type SaasConfigListResponse } from 'services/saas/saasConfigService';
import SaasBancoFormModal from './SaasBancoFormModal';

interface Props {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onSelectBanco?: (banco: SaasBanco) => void;
  title?: string;
}

const SaasBancosModal: React.FC<Props> = ({ show, onClose, skipWrapper = false, onSelectBanco, title }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { showApiError } = useApiError();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const list = useEntityListModal<SaasBanco>({ onClose, onSelect: onSelectBanco });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saas-bancos', list.tableFilters.page, list.tableFilters.limit, list.tableFilters.debouncedSearch, list.tableFilters.sortColumn, list.tableFilters.sortDirection],
    queryFn: () =>
      saasBancoService.list({
        page: list.tableFilters.page,
        limit: list.tableFilters.limit,
        search: list.tableFilters.debouncedSearch || undefined,
        sortColumn: list.tableFilters.sortColumn,
        sortDirection: list.tableFilters.sortDirection,
      }),
    enabled: show,
    staleTime: 0,
  });

  const listData = data?.data as SaasConfigListResponse<SaasBanco> | undefined;
  const items: SaasBanco[] = listData?.data || [];

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await saasBancoService.delete(id);
        queryClient.invalidateQueries({ queryKey: ['saas-bancos'] });
        refetch();
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.BANCO_DELETE_ERROR);
      }
    },
    [queryClient, refetch, showApiError]
  );

  const columns = useMemo((): ListModalConfig<SaasBanco>['columns'] => {
    const tipoBancoLabels: Record<string, string> = {
      efi: 'EFI',
      asaas: 'Asaas',
      bancario: 'Bancário',
      outros: 'Outros',
    };
    return [
      { key: 'id', label: t('table.id'), sortable: true, width: '42px', render: (i) => <span>{i.id}</span> },
      { key: 'nome', label: t('form.name'), sortable: true, width: '180px', render: (i) => i.nome || i.banco },
      { key: 'banco', label: t('menu.banks'), sortable: true, width: '120px', render: (i) => i.banco },
      {
        key: 'tipo_banco',
        label: t('table.bankType'),
        sortable: true,
        width: '100px',
        render: (i) => <span className="badge bg-info">{tipoBancoLabels[i.tipo_banco || ''] || '—'}</span>,
      },
      { key: 'agencia', label: 'Agência', sortable: true, width: '90px', render: (i) => i.agencia || '—' },
      { key: 'conta', label: 'Conta', sortable: true, width: '110px', render: (i) => i.conta || '—' },
      { key: 'tipo_conta', label: t('form.type'), sortable: true, width: '100px', render: (i) => i.tipo_conta },
      {
        key: 'pix_chave',
        label: 'PIX',
        sortable: true,
        sortValue: (i) => (i.pix_chave ? `${i.pix_tipo ?? ''} ${i.pix_chave}` : ''),
        render: (i) =>
          i.pix_chave ? <span>{i.pix_tipo?.toUpperCase()}: {i.pix_chave}</span> : <span className="text-muted">—</span>,
      },
      {
        key: 'ativo',
        label: t('table.status'),
        sortable: true,
        width: '80px',
        render: (i) => (
          <span className={`badge bg-${i.ativo ? 'success' : 'secondary'}`}>
            {i.ativo ? t('status.active') : t('status.inactive')}
          </span>
        ),
      },
    ];
  }, [t]);

  const searchFields = useMemo(
    () => [
      { key: 'id', label: t('table.id') },
      { key: 'nome', label: t('form.name') },
      { key: 'banco', label: t('menu.banks') },
      { key: 'tipo_banco', label: t('table.bankType') },
      { key: 'ativo', label: t('table.status') },
    ],
    [t]
  );

  const bulkActions = useMemo(() => {
    if (onSelectBanco) return list.buildSelectBulkActions();
    return list.buildCrudBulkActions({
      onNew: () => setShowCreate(true),
      onEdit: (item) => {
        setSelectedId(item.id);
        setShowEdit(true);
      },
      onDelete: handleDelete,
    });
  }, [onSelectBanco, list, handleDelete]);

  const defaultTitle = title ?? (onSelectBanco ? t('ui.selectBank') : t('modal.banks'));

  const handleRowSelect = useCallback(
    (item: SaasBanco) => {
      onSelectBanco?.(item);
      onClose();
    },
    [onSelectBanco, onClose]
  );

  const listModal = (
    <ListModal<SaasBanco>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchFields,
        emptyMessage: 'Nenhum banco encontrado',
      }}
      data={items}
      loading={isLoading}
      search={list.tableFilters.search}
      onSearchChange={list.handleSearchChange}
      sortColumn={list.tableFilters.sortColumn}
      sortDirection={list.tableFilters.sortDirection}
      onSortChange={list.tableFilters.setSort}
      pagination={list.buildPagination(listData?.pagination)}
      onPageChange={list.tableFilters.setPage}
      onLimitChange={list.tableFilters.setLimit}
      onRefresh={refetch}
      bulkActions={bulkActions}
      onSelectionChange={list.handleSelectionChange}
      onRowDoubleClick={
        onSelectBanco
          ? handleRowSelect
          : (item) => {
              setSelectedId(item.id);
              setShowEdit(true);
            }
      }
      onAudit={(i) => list.auditoria.handleAudit('SaasBanco', i.id)}
      auditEntity="SaasBanco"
      tableId="saas-bancos-list"
      modalId="saas-bancos-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <SaasBancoFormModal
        show={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['saas-bancos'] });
          refetch();
        }}
      />
      <SaasBancoFormModal
        show={showEdit}
        onClose={() => {
          setShowEdit(false);
          setSelectedId(null);
        }}
        itemId={showEdit ? selectedId : null}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['saas-bancos'] });
          refetch();
        }}
      />
      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('modal.auditLogs')}
        modalId="audit-saas-banco"
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

export default SaasBancosModal;
