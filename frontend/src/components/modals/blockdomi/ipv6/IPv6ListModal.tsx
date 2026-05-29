import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useIPv6s, useDeleteIPv6 } from 'hooks/useIPv6';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { IPv6 } from 'types';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime, formatDate } from 'utils/formatters';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import { IPv6Modal } from './index';
import ImprimirModal from 'components/common/ImprimirModal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { IPv6Service } from 'services/ipv6Service';

interface IPv6ListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectIPv6?: (ipv6: IPv6) => void;
  title?: string;
  skipWrapper?: boolean;
}

const IPv6ListModal: React.FC<IPv6ListModalProps> = ({
  show,
  onClose,
  onSelectIPv6,
  title,
  skipWrapper = false,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIPv6Id, setSelectedIPv6Id] = useState<number | null>(null);

  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const list = useEntityListModal<IPv6>({
    onClose,
    onSelect: onSelectIPv6,
  });

  const defaultTitle = title || (onSelectIPv6 ? t('blockdomi.selectIPv6') : 'IPv6');

  const resolveItems = useCallback(
    (selectedItems: IPv6[]) => {
      if (selectedItems.length > 0) return selectedItems;
      return list.selectedItem ? [list.selectedItem] : [];
    },
    [list.selectedItem]
  );

  const columns = useMemo(
    (): ListModalConfig<IPv6>['columns'] => [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '42px',
        render: (item) => <span>{item.id}</span>,
      },
      {
        key: 'ip',
        label: 'IPv6',
        sortable: true,
        width: '200px',
        render: (item) => item.ip,
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
        width: '100px',
        sortValue: (item) => (item.link_planilha_dominios?.trim() ? 1 : 0),
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
          const row = item as IPv6 & { created_at_formatada?: string | null; created_at?: string };
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
      { key: 'ip', label: 'IPv6' },
      { key: 'descricao', label: t('form.description') },
      { key: 'nome_oficio', label: t('blockdomi.nomeOficio') },
      { key: 'numero_sei_anatel', label: t('blockdomi.numeroSeiAnatel') },
    ],
    [t]
  );

  const { data: ipv6sData, isLoading, refetch } = useIPv6s({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
  });

  const deleteIPv6Mutation = useDeleteIPv6();

  const handleDelete = useCallback(
    async (ipv6Id: number) => {
      try {
        await deleteIPv6Mutation.mutateAsync(ipv6Id);
        list.clearSelection();
        refetch();
      } catch {
        // Erro tratado pelo useNotificationContext
      }
    },
    [deleteIPv6Mutation, list, refetch]
  );

  const handleBulkDelete = useCallback(
    async (ids: number[]) => {
      try {
        const { deleted, versao } = await IPv6Service.bulkDelete(ids);
        list.clearSelection();
        refetch();
        queryClient.invalidateQueries({ queryKey: ['ipv6'] });
        success(`Excluído(s) ${deleted} IPv6. Versão da operação: ${versao}.`);
      } catch (err: unknown) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_IPV6_DELETE_ERROR);
      }
    },
    [list, refetch, queryClient, success, showApiError]
  );

  const handleAudit = useCallback(
    (ipv6: IPv6) => {
      list.auditoria.handleAudit('IPv6', ipv6.id);
    },
    [list.auditoria]
  );

  const bulkActions = useMemo(() => {
    if (onSelectIPv6) {
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
        disabled: (selectedItems: IPv6[]) => list.isNothingSelected(selectedItems),
        action: (selectedItems: IPv6[]) => {
          const item = list.resolveItem(selectedItems);
          if (item) {
            setSelectedIPv6Id(item.id);
            setShowEditModal(true);
          }
        },
      },
      {
        label: list.bulkBtn.deletar.label,
        variant: list.bulkBtn.deletar.variant,
        disabled: (selectedItems: IPv6[]) => list.isNothingSelected(selectedItems),
        action: async (selectedItems: IPv6[]) => {
          const items = resolveItems(selectedItems);
          if (items.length === 0) return;

          const msg =
            items.length === 1
              ? t('messages.confirmDelete')
              : `Tem certeza que deseja excluir ${items.length} IPv6?`;
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
        disabled: (selectedItems: IPv6[]) => {
          const items = resolveItems(selectedItems);
          return items.length === 0 || !items.some((i) => i.link_oficio_anatel?.trim());
        },
        action: (selectedItems: IPv6[]) => {
          resolveItems(selectedItems)
            .filter((i) => i.link_oficio_anatel?.trim())
            .forEach((i) => window.open(i.link_oficio_anatel!, '_blank', 'noopener,noreferrer'));
        },
      },
      {
        label: t('blockdomi.justica'),
        variant: 'primary' as const,
        disabled: (selectedItems: IPv6[]) => {
          const items = resolveItems(selectedItems);
          return items.length === 0 || !items.some((i) => i.link_oficio_justica?.trim());
        },
        action: (selectedItems: IPv6[]) => {
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
        disabled: (selectedItems: IPv6[]) => {
          const items = resolveItems(selectedItems);
          return items.length === 0 || !items.some((i) => i.link_planilha_dominios?.trim());
        },
        action: (selectedItems: IPv6[]) => {
          resolveItems(selectedItems)
            .filter((i) => i.link_planilha_dominios?.trim())
            .forEach((i) => window.open(i.link_planilha_dominios!, '_blank', 'noopener,noreferrer'));
        },
      },
    ];
  }, [onSelectIPv6, list, resolveItems, handleDelete, handleBulkDelete, t]);

  const pagination = useMemo(
    () => list.buildPagination(ipv6sData?.pagination),
    [list, ipv6sData?.pagination]
  );

  const modalData = useMemo(() => ipv6sData?.data || [], [ipv6sData?.data]);

  const handleSelectAllPages = useCallback(async (): Promise<IPv6[]> => {
    const res = await IPv6Service.list({
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
    (item: IPv6) => {
      onSelectIPv6?.(item);
      onClose();
    },
    [onSelectIPv6, onClose]
  );

  const listModal = (
    <ListModal<IPv6>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchFields,
        emptyMessage: 'Nenhum IPv6 encontrado',
        multiSelect: true,
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
      onRowClick={onSelectIPv6 ? handleRowSelect : undefined}
      onRowDoubleClick={onSelectIPv6 ? handleRowSelect : undefined}
      onAudit={handleAudit}
      auditEntity="IPv6"
      onSelectAllPages={handleSelectAllPages}
      tableId="ipv6-list-modal"
      modalId="ipv6-list-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <IPv6Modal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedIPv6Id(null);
        }}
        ipv6Id={showEditModal ? selectedIPv6Id : null}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['ipv6'] });
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedIPv6Id(null);
        }}
      />

      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-ipv6-modal"
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

export default IPv6ListModal;
