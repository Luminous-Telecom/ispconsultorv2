import React, { useCallback, useMemo, useState } from 'react';
import {
  useOrdensServico,
  useDeleteOrdemServico,
} from 'hooks/useOrdensServico';
import { useEntityListModal } from 'hooks/useEntityListModal';
import ListModal from 'components/common/ListModal';
import type { OrdemServico } from 'services/ordemServicoService';
import OrdemServicoModal from './OrdemServicoModal';
import OrdemServicoAcaoModal from './OrdemServicoAcaoModal';
import { ORDEM_SERVICO_ACOES, isOrdemServicoExcluivel, isOrdemServicoLocal, resolveOrdemServicoId, type OrdemServicoAcao } from './ordemServicoAcoes';
import {
  getOrdemServicoListColumns,
  ORDEM_SERVICO_LIST_SEARCH_FIELDS,
} from './ordemServicoListColumns';
import { useBulkBtn } from 'components/ui';

interface OrdemServicoListModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  skipWrapper?: boolean;
}

const OrdemServicoListModal: React.FC<OrdemServicoListModalProps> = ({
  show,
  onClose,
  title,
  skipWrapper = false,
}) => {
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [acaoModal, setAcaoModal] = useState<{
    acao: OrdemServicoAcao;
    ordem: OrdemServico;
  } | null>(null);

  const list = useEntityListModal<OrdemServico>({
    onClose,
    initialSearchField: 'cliente_nome',
  });

  const { data: ordensData, isLoading, refetch } = useOrdensServico(
    {
      search: list.tableFilters.debouncedSearch || undefined,
      searchField: list.tableFilters.searchField || undefined,
      page: list.tableFilters.page,
      limit: list.tableFilters.limit,
      sortColumn: list.tableFilters.sortColumn,
      sortDirection: list.tableFilters.sortDirection,
    },
    show
  );

  const deleteMutation = useDeleteOrdemServico();
  const bulkBtn = useBulkBtn();

  const handleAcao = useCallback((ordem: OrdemServico, acao: OrdemServicoAcao) => {
    if (isOrdemServicoLocal(ordem) && acao !== 'registrar_mensagem' && acao !== 'finalizar') {
      return;
    }
    setAcaoModal({ acao, ordem });
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteMutation.mutateAsync(id);
      } catch {
        // Erro tratado pelo hook
      }
    },
    [deleteMutation]
  );

  const columns = useMemo(() => getOrdemServicoListColumns(), []);

  const searchFields = useMemo(() => [...ORDEM_SERVICO_LIST_SEARCH_FIELDS], []);

  const acoesDropdown = useMemo(() => {
    const acoes = list.selectedItem && isOrdemServicoLocal(list.selectedItem)
      ? ORDEM_SERVICO_ACOES.filter(
          (acao) => acao.key === 'registrar_mensagem' || acao.key === 'finalizar'
        )
      : ORDEM_SERVICO_ACOES;

    return acoes.map((acao) => ({
      label: acao.label,
      action: (selectedItems?: OrdemServico[]) => {
        const ordem = list.resolveItem(selectedItems ?? []);
        if (ordem) {
          void handleAcao(ordem, acao.key);
        }
      },
    }));
  }, [list, handleAcao]);

  const bulkActions = useMemo(() => {
    const crudActions = list.buildCrudBulkActions({
      onNew: () => {
        list.setSelectedEntityId(null);
        setIsEditMode(false);
        setShowFormModal(true);
      },
      onEdit: (item) => {
        list.setSelectedEntityId(Number(resolveOrdemServicoId(item)));
        setIsEditMode(true);
        setShowFormModal(true);
      },
      onDelete: handleDelete,
    });

    const deleteAction = crudActions.find((action) => action.label === bulkBtn.deletar.label);
    if (deleteAction) {
      deleteAction.disabled = (selectedItems: OrdemServico[]) =>
        selectedItems.length === 0 || selectedItems.some((item) => !isOrdemServicoExcluivel(item));
    }

    return [
      ...crudActions,
      {
        label: 'Ações',
        variant: 'primary' as const,
        disabled: (selectedItems: OrdemServico[]) => selectedItems.length !== 1,
        dropdown: acoesDropdown,
      },
    ];
  }, [list, handleDelete, acoesDropdown, bulkBtn.deletar.label]);

  const pagination = useMemo(
    () => list.buildPagination(ordensData?.pagination),
    [list, ordensData?.pagination]
  );

  const modalData = useMemo(() => ordensData?.data || [], [ordensData?.data]);

  return (
    <>
      <ListModal<OrdemServico>
        show={show}
        onClose={list.handleModalClose}
        skipWrapper={skipWrapper}
        config={{
          title: title || 'Ordens de Serviço',
          columns,
          searchPlaceholder: 'Buscar ordens de serviço...',
          searchField: 'cliente_nome',
          searchFields,
          emptyMessage: 'Nenhuma ordem de serviço encontrada',
        }}
        data={modalData}
        loading={isLoading}
        search={list.tableFilters.search}
        onSearchChange={list.handleSearchChange}
        onSearchFieldChange={list.handleSearchFieldChange}
        sortColumn={list.tableFilters.sortColumn}
        sortDirection={list.tableFilters.sortDirection}
        onSortChange={list.tableFilters.setSort}
        pagination={pagination}
        onPageChange={list.tableFilters.setPage}
        onLimitChange={list.tableFilters.setLimit}
        onRefresh={refetch}
        bulkActions={bulkActions}
        onSelectionChange={list.handleSelectionChange}
        tableId="ordens-servico-list-modal"
        modalId="ordens-servico-list-modal"
      />

      <OrdemServicoModal
        show={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setIsEditMode(false);
          list.setSelectedEntityId(null);
        }}
        ordemServicoId={isEditMode ? list.selectedEntityId : null}
        onSuccess={() => {
          setShowFormModal(false);
          setIsEditMode(false);
          list.setSelectedEntityId(null);
        }}
      />

      <OrdemServicoAcaoModal
        show={!!acaoModal}
        onClose={() => setAcaoModal(null)}
        ordemServico={acaoModal?.ordem ?? null}
        acao={acaoModal?.acao ?? null}
        onSuccess={() => {
          setAcaoModal(null);
        }}
      />
    </>
  );
};

export default OrdemServicoListModal;
