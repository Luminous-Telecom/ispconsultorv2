import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDominios, useDeleteDominio } from 'hooks/useDominios';
import { DominioService } from 'services/dominioService';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { Dominio } from 'types';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime, formatDate } from 'utils/formatters';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import DominioModal from './DominioModal';
import DominioBulkEditModal from './DominioBulkEditModal';
import ImprimirModal from 'components/common/ImprimirModal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';

interface DominioListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectDominio?: (dominio: Dominio) => void;
  title?: string;
  skipWrapper?: boolean;
}

const DominioListModal: React.FC<DominioListModalProps> = ({
  show,
  onClose,
  onSelectDominio,
  title,
  skipWrapper = false,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [selectedDominioId, setSelectedDominioId] = useState<number | null>(null);
  const [dominiosToBulkEdit, setDominiosToBulkEdit] = useState<Dominio[]>([]);
  const [isSyncingSei, setIsSyncingSei] = useState(false);

  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const list = useEntityListModal<Dominio>({
    onClose,
    onSelect: onSelectDominio,
  });

  const defaultTitle = title || (onSelectDominio ? t('blockdomi.selectDomain') : t('blockdomi.domains'));

  const resolveItems = useCallback(
    (selectedItems: Dominio[]) => {
      if (selectedItems.length > 0) return selectedItems;
      return list.selectedItem ? [list.selectedItem] : [];
    },
    [list.selectedItem]
  );

  const columns = useMemo(
    (): ListModalConfig<Dominio>['columns'] => [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '42px',
        render: (item) => <span>{item.id}</span>,
      },
      {
        key: 'dominio',
        label: t('blockdomi.domain'),
        sortable: true,
        width: '200px',
        render: (item) => item.dominio,
      },
      {
        key: 'versao',
        label: t('blockdomi.versao'),
        sortable: true,
        width: '100px',
        render: (item) => item.versao || '-',
      },
      {
        key: 'numero_sei_anatel',
        label: t('blockdomi.numeroSeiAnatel'),
        sortable: true,
        width: '110px',
        render: (item) => item.numero_sei_anatel?.trim() || '-',
      },
      {
        key: 'nome_oficio',
        label: t('blockdomi.nomeOficio'),
        sortable: true,
        width: '220px',
        render: (item) => item.nome_oficio || '-',
      },
      {
        key: 'data_inicio_bloqueio',
        label: t('blockdomi.dataInicioBloqueio'),
        sortable: true,
        width: '130px',
        render: (item) => formatDate(item.data_inicio_bloqueio),
      },
      {
        key: 'data_fim_bloqueio',
        label: t('blockdomi.dataFimBloqueio'),
        sortable: true,
        width: '130px',
        render: (item) => formatDate(item.data_fim_bloqueio),
      },
      {
        key: 'oficio_anatel',
        label: t('blockdomi.oficioAnatel'),
        sortable: true,
        width: '100px',
        sortValue: (item) => (item.link_oficio_anatel?.trim() ? 1 : 0),
        render: (item) => (item.link_oficio_anatel?.trim() ? t('ui.yes') : t('ui.no')),
      },
      {
        key: 'oficio_justica',
        label: t('blockdomi.oficioJustica'),
        sortable: true,
        width: '100px',
        sortValue: (item) => (item.link_oficio_justica?.trim() ? 1 : 0),
        render: (item) => (item.link_oficio_justica?.trim() ? t('ui.yes') : t('ui.no')),
      },
      {
        key: 'planilha_dominios',
        label: t('blockdomi.planilhaDominios'),
        sortable: true,
        sortValue: (item) => (item.link_planilha_dominios?.trim() ? 1 : 0),
        width: '100px',
        render: (item) => (item.link_planilha_dominios?.trim() ? t('ui.yes') : t('ui.no')),
      },
      {
        key: 'ativo',
        label: t('table.status'),
        sortable: true,
        width: '80px',
        badgeLabels: [t('status.active'), t('status.inactive')],
        render: (item) => (
          <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
            {item.ativo ? t('status.active') : t('status.inactive')}
          </span>
        ),
      },
      {
        key: 'descricao',
        label: t('form.description'),
        sortable: true,
        width: '250px',
        render: (item) => item.descricao || '-',
      },
      {
        key: 'created_at',
        label: t('table.createdAt'),
        sortable: true,
        width: '130px',
        render: (item) => {
          const row = item as Dominio & { created_at_formatada?: string | null; created_at?: string };
          if (row.created_at_formatada) return row.created_at_formatada;
          return row.created_at ? formatDateTime(row.created_at) : '-';
        },
      },
      {
        key: 'updated_at',
        label: t('table.updatedAt'),
        sortable: true,
        width: '130px',
        render: (item) => (item.updated_at ? formatDateTime(item.updated_at) : '-'),
      },
    ],
    [t]
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: t('table.id') },
      { key: 'dominio', label: t('blockdomi.domain') },
      { key: 'descricao', label: t('form.description') },
      { key: 'nome_oficio', label: t('blockdomi.nomeOficio') },
      { key: 'numero_sei_anatel', label: t('blockdomi.numeroSeiAnatel') },
    ],
    [t]
  );

  const { data: dominiosData, isLoading, refetch } = useDominios({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
  });

  const deleteDominioMutation = useDeleteDominio();

  const handleDelete = useCallback(
    async (dominioId: number) => {
      try {
        await deleteDominioMutation.mutateAsync(dominioId);
        list.clearSelection();
        refetch();
      } catch {
        // Erro tratado pelo useNotificationContext
      }
    },
    [deleteDominioMutation, list, refetch]
  );

  const handleBulkDelete = useCallback(
    async (ids: number[]) => {
      try {
        const { deleted, versao } = await DominioService.bulkDelete(ids);
        list.clearSelection();
        refetch();
        queryClient.invalidateQueries({ queryKey: ['dominios'] });
        success(`Excluído(s) ${deleted} domínio(s). Versão da operação: ${versao}.`);
      } catch (err: unknown) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_DOMAIN_DELETE_ERROR);
      }
    },
    [list, refetch, queryClient, success, showApiError]
  );

  const handleAudit = useCallback(
    (dominio: Dominio) => {
      list.auditoria.handleAudit('Dominio', dominio.id);
    },
    [list.auditoria]
  );

  const handleSincronizarSeiAnatel = useCallback(async () => {
    if (!window.confirm(t('blockdomi.syncSeiAnatelConfirm'))) {
      return;
    }
    setIsSyncingSei(true);
    try {
      const data = await DominioService.sincronizarSeiAnatel();
      const comErro = data.resultados.filter((r) => r.erro).length;
      const base = t('blockdomi.syncSeiAnatelDone', {
        atualizados: String(data.dominiosAtualizados),
        pdfs: String(data.pdfsDistintos),
        candidatos: String(data.dominiosCandidatos),
      });
      success(
        comErro > 0
          ? `${base} ${t('blockdomi.syncSeiAnatelPartial', { n: String(comErro) })}`
          : base
      );
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dominios'] });
    } catch (e) {
      showApiError(e, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_SEI_SYNC_ERROR);
    } finally {
      setIsSyncingSei(false);
    }
  }, [t, success, showApiError, refetch, queryClient]);

  const bulkActions = useMemo(() => {
    if (onSelectDominio) {
      return list.buildSelectBulkActions();
    }
    return [
      {
        label: list.bulkBtn.novo.label,
        variant: list.bulkBtn.novo.variant,
        action: () => setShowCreateModal(true),
      },
      {
        label: list.bulkBtn.editar.label,
        variant: list.bulkBtn.editar.variant,
        disabled: (selectedItems: Dominio[]) => resolveItems(selectedItems).length === 0,
        action: (selectedItems: Dominio[]) => {
          const items = resolveItems(selectedItems);
          if (items.length === 0) return;
          if (items.length === 1) {
            setSelectedDominioId(items[0].id);
            setShowEditModal(true);
          } else {
            setDominiosToBulkEdit(items);
            setShowBulkEditModal(true);
          }
        },
      },
      {
        label: list.bulkBtn.deletar.label,
        variant: list.bulkBtn.deletar.variant,
        disabled: (selectedItems: Dominio[]) => list.isNothingSelected(selectedItems),
        action: async (selectedItems: Dominio[]) => {
          const items = resolveItems(selectedItems);
          if (items.length === 0) return;

          const msg =
            items.length === 1
              ? t('messages.confirmDelete')
              : `Tem certeza que deseja excluir ${items.length} domínio(s)?`;
          if (!window.confirm(msg)) return;

          if (items.length === 1) {
            await handleDelete(items[0].id);
          } else {
            await handleBulkDelete(items.map((i) => i.id));
          }
        },
      },
      {
        label: t('blockdomi.anatel'),
        variant: 'primary' as const,
        disabled: (selectedItems: Dominio[]) => {
          const items = resolveItems(selectedItems);
          return items.length === 0 || !items.some((i) => i.link_oficio_anatel?.trim());
        },
        action: (selectedItems: Dominio[]) => {
          resolveItems(selectedItems)
            .filter((i) => i.link_oficio_anatel?.trim())
            .forEach((i) => window.open(i.link_oficio_anatel!, '_blank', 'noopener,noreferrer'));
        },
      },
      {
        label: t('blockdomi.justica'),
        variant: 'primary' as const,
        disabled: (selectedItems: Dominio[]) => {
          const items = resolveItems(selectedItems);
          return items.length === 0 || !items.some((i) => i.link_oficio_justica?.trim());
        },
        action: (selectedItems: Dominio[]) => {
          resolveItems(selectedItems)
            .filter((i) => i.link_oficio_justica?.trim())
            .forEach((i) => {
              const urls = i
                .link_oficio_justica!.split(',')
                .map((url) => url.trim())
                .filter((url) => url);
              urls.forEach((url, index) => {
                setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), index * 150);
              });
            });
        },
      },
      {
        label: t('blockdomi.planilhaDominios'),
        variant: 'primary' as const,
        disabled: (selectedItems: Dominio[]) => {
          const items = resolveItems(selectedItems);
          return items.length === 0 || !items.some((i) => i.link_planilha_dominios?.trim());
        },
        action: (selectedItems: Dominio[]) => {
          resolveItems(selectedItems)
            .filter((i) => i.link_planilha_dominios?.trim())
            .forEach((i) => window.open(i.link_planilha_dominios!, '_blank', 'noopener,noreferrer'));
        },
      },
      {
        label: list.bulkBtn.sincronizar.label,
        variant: list.bulkBtn.sincronizar.variant,
        requiresSelection: false,
        disabled: () => isSyncingSei,
        action: () => {
          void handleSincronizarSeiAnatel();
        },
      },
    ];
  }, [
    onSelectDominio,
    list,
    resolveItems,
    handleDelete,
    handleBulkDelete,
    handleSincronizarSeiAnatel,
    isSyncingSei,
    t,
  ]);

  const pagination = useMemo(
    () => list.buildPagination(dominiosData?.pagination),
    [list, dominiosData?.pagination]
  );

  const modalData = useMemo(() => dominiosData?.data || [], [dominiosData?.data]);

  const handleSelectAllPages = useCallback(async (): Promise<Dominio[]> => {
    const res = await DominioService.list({
      search: list.tableFilters.debouncedSearch || undefined,
      searchField: list.tableFilters.searchField || undefined,
      page: 1,
      limit: 99999,
      sortColumn: list.tableFilters.sortColumn,
      sortDirection: list.tableFilters.sortDirection,
    });
    return res?.data ?? [];
  }, [
    list.tableFilters.debouncedSearch,
    list.tableFilters.searchField,
    list.tableFilters.sortColumn,
    list.tableFilters.sortDirection,
  ]);

  const handleRowSelect = useCallback(
    (item: Dominio) => {
      onSelectDominio?.(item);
      onClose();
    },
    [onSelectDominio, onClose]
  );

  const listModal = (
    <ListModal<Dominio>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchFields,
        emptyMessage: 'Nenhum domínio encontrado',
        multiSelect: true,
      }}
      data={modalData}
      loading={isLoading || isSyncingSei}
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
      onRowClick={onSelectDominio ? handleRowSelect : undefined}
      onRowDoubleClick={onSelectDominio ? handleRowSelect : undefined}
      onAudit={handleAudit}
      auditEntity="Dominio"
      onSelectAllPages={handleSelectAllPages}
      tableId="dominios-list-modal"
      modalId="dominios-list-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <DominioModal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedDominioId(null);
        }}
        dominioId={showEditModal ? selectedDominioId : null}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['dominios'] });
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedDominioId(null);
        }}
      />

      <DominioBulkEditModal
        show={showBulkEditModal}
        onClose={() => {
          setShowBulkEditModal(false);
          setDominiosToBulkEdit([]);
        }}
        dominios={dominiosToBulkEdit}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['dominios'] });
          setShowBulkEditModal(false);
          setDominiosToBulkEdit([]);
        }}
      />

      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-dominio-modal"
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

export default DominioListModal;
