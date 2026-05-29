import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useIPv4s, useDeleteIPv4 } from 'hooks/useIPv4';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { IPv4 } from 'types';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime, formatDate } from 'utils/formatters';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import IPv4Modal from './IPv4Modal';
import ImprimirModal from 'components/common/ImprimirModal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { IPv4Service } from 'services/ipv4Service';

interface IPv4ListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectIPv4?: (ipv4: IPv4) => void;
  title?: string;
  skipWrapper?: boolean;
}

const IPv4ListModal: React.FC<IPv4ListModalProps> = ({
  show,
  onClose,
  onSelectIPv4,
  title,
  skipWrapper = false,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIPv4Id, setSelectedIPv4Id] = useState<number | null>(null);

  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const list = useEntityListModal<IPv4>({
    onClose,
    onSelect: onSelectIPv4,
  });

  const defaultTitle = title || (onSelectIPv4 ? t('blockdomi.selectIPv4') : 'IPv4');

  const resolveItems = useCallback(
    (selectedItems: IPv4[]) => {
      if (selectedItems.length > 0) return selectedItems;
      return list.selectedItem ? [list.selectedItem] : [];
    },
    [list.selectedItem]
  );

  const columns = useMemo(
    (): ListModalConfig<IPv4>['columns'] => [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '42px',
        render: (item) => <span>{item.id}</span>,
      },
      {
        key: 'ip',
        label: 'IPv4',
        sortable: true,
        width: '150px',
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
          const row = item as IPv4 & { created_at_formatada?: string | null; created_at?: string };
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
      { key: 'ip', label: 'IPv4' },
      { key: 'descricao', label: t('form.description') },
      { key: 'nome_oficio', label: t('blockdomi.nomeOficio') },
      { key: 'numero_sei_anatel', label: t('blockdomi.numeroSeiAnatel') },
    ],
    [t]
  );

  const { data: ipv4sData, isLoading, refetch } = useIPv4s({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
  });

  const deleteIPv4Mutation = useDeleteIPv4();

  const handleDelete = useCallback(
    async (ipv4Id: number) => {
      try {
        await deleteIPv4Mutation.mutateAsync(ipv4Id);
        list.clearSelection();
        refetch();
      } catch {
        // Erro tratado pelo useNotificationContext
      }
    },
    [deleteIPv4Mutation, list, refetch]
  );

  const handleBulkDelete = useCallback(
    async (ids: number[]) => {
      try {
        const { deleted, versao } = await IPv4Service.bulkDelete(ids);
        list.clearSelection();
        refetch();
        queryClient.invalidateQueries({ queryKey: ['ipv4'] });
        success(`Excluído(s) ${deleted} IPv4. Versão da operação: ${versao}.`);
      } catch (err: unknown) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_IPV4_DELETE_ERROR);
      }
    },
    [list, refetch, queryClient, success, showApiError]
  );

  const handleAudit = useCallback(
    (ipv4: IPv4) => {
      list.auditoria.handleAudit('IPv4', ipv4.id);
    },
    [list.auditoria]
  );

  const bulkActions = useMemo(() => {
    if (onSelectIPv4) {
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
        disabled: (selectedItems: IPv4[]) => list.isNothingSelected(selectedItems),
        action: (selectedItems: IPv4[]) => {
          const item = list.resolveItem(selectedItems);
          if (item) {
            setSelectedIPv4Id(item.id);
            setShowEditModal(true);
          }
        },
      },
      {
        label: list.bulkBtn.deletar.label,
        variant: list.bulkBtn.deletar.variant,
        disabled: (selectedItems: IPv4[]) => list.isNothingSelected(selectedItems),
        action: async (selectedItems: IPv4[]) => {
          const items = resolveItems(selectedItems);
          if (items.length === 0) return;

          const msg =
            items.length === 1
              ? t('messages.confirmDelete')
              : `Tem certeza que deseja excluir ${items.length} IPv4?`;
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
        disabled: (selectedItems: IPv4[]) => {
          const items = resolveItems(selectedItems);
          return items.length === 0 || !items.some((i) => i.link_oficio_anatel?.trim());
        },
        action: (selectedItems: IPv4[]) => {
          resolveItems(selectedItems)
            .filter((i) => i.link_oficio_anatel?.trim())
            .forEach((i) => window.open(i.link_oficio_anatel!, '_blank', 'noopener,noreferrer'));
        },
      },
      {
        label: t('blockdomi.justica'),
        variant: 'primary' as const,
        disabled: (selectedItems: IPv4[]) => {
          const items = resolveItems(selectedItems);
          return items.length === 0 || !items.some((i) => i.link_oficio_justica?.trim());
        },
        action: (selectedItems: IPv4[]) => {
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
        disabled: (selectedItems: IPv4[]) => {
          const items = resolveItems(selectedItems);
          return items.length === 0 || !items.some((i) => i.link_planilha_dominios?.trim());
        },
        action: (selectedItems: IPv4[]) => {
          resolveItems(selectedItems)
            .filter((i) => i.link_planilha_dominios?.trim())
            .forEach((i) => window.open(i.link_planilha_dominios!, '_blank', 'noopener,noreferrer'));
        },
      },
    ];
  }, [onSelectIPv4, list, resolveItems, handleDelete, handleBulkDelete, t]);

  const pagination = useMemo(
    () => list.buildPagination(ipv4sData?.pagination),
    [list, ipv4sData?.pagination]
  );

  const modalData = useMemo(() => ipv4sData?.data || [], [ipv4sData?.data]);

  const handleSelectAllPages = useCallback(async (): Promise<IPv4[]> => {
    const res = await IPv4Service.list({
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
    (item: IPv4) => {
      onSelectIPv4?.(item);
      onClose();
    },
    [onSelectIPv4, onClose]
  );

  const listModal = (
    <ListModal<IPv4>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchFields,
        emptyMessage: 'Nenhum IPv4 encontrado',
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
      onRowClick={onSelectIPv4 ? handleRowSelect : undefined}
      onRowDoubleClick={onSelectIPv4 ? handleRowSelect : undefined}
      onAudit={handleAudit}
      auditEntity="IPv4"
      onSelectAllPages={handleSelectAllPages}
      tableId="ipv4-list-modal"
      modalId="ipv4-list-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <IPv4Modal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedIPv4Id(null);
        }}
        ipv4Id={showEditModal ? selectedIPv4Id : null}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['ipv4'] });
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedIPv4Id(null);
        }}
      />

      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-ipv4-modal"
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

export default IPv4ListModal;
