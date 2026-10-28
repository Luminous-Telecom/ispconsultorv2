import React, { useCallback, useMemo, useState } from 'react';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { useBulkBtn } from 'components/ui';
import { getOrdemServicoListColumns } from 'components/modals/ordens-servico/ordemServicoListColumns';
import OrdemServicoAcaoModal from 'components/modals/ordens-servico/OrdemServicoAcaoModal';
import {
  ORDEM_SERVICO_ACOES,
  isOrdemServicoExcluivel,
  isOrdemServicoLocal,
  resolveOrdemServicoId,
  type OrdemServicoAcao,
} from 'components/modals/ordens-servico/ordemServicoAcoes';
import { useTableFilters } from 'hooks/useTableFilters';
import { useAtendimentoOrdensServico } from 'hooks/useAtendimentos';
import { useDeleteOrdemServico } from 'hooks/useOrdensServico';
import { useModalSelect } from 'hooks/useModalSelect';
import { useI18n } from 'contexts/I18nContext';
import type { OrdemServico } from 'services/ordemServicoService';
import OrdemServicoModal, {
  type OrdemServicoAtendimentoPrefill,
} from 'components/modals/ordens-servico/OrdemServicoModal';

interface AtendimentoOrdensServicoListProps {
  atendimentoId: number | string;
  /** id_ticket do IXC (su_ticket.id) — usado para vincular a OS criada nesta aba. Se ausente, usa `atendimentoId`. */
  atendimentoIxcTicketId?: string;
  clienteId?: number;
  clienteNome?: string;
  atendimentoPrefill?: OrdemServicoAtendimentoPrefill;
  onOsCreated?: () => void;
}

const AtendimentoOrdensServicoList: React.FC<AtendimentoOrdensServicoListProps> = ({
  atendimentoId,
  atendimentoIxcTicketId,
  clienteId,
  clienteNome,
  atendimentoPrefill,
  onOsCreated,
}) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const tableFilters = useTableFilters({
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });
  const { data: ordens = [], isLoading, refetch } = useAtendimentoOrdensServico(
    atendimentoId,
    clienteId,
    true
  );
  const deleteMutation = useDeleteOrdemServico();
  const { selectedItem, handleSelectionChange, clearSelection } = useModalSelect<OrdemServico>();

  const [showOsModal, setShowOsModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editOrdemId, setEditOrdemId] = useState<number | string | null>(null);
  const [acaoModal, setAcaoModal] = useState<{
    acao: OrdemServicoAcao;
    ordem: OrdemServico;
  } | null>(null);

  const resolveItem = useCallback(
    (selectedItems: OrdemServico[]) =>
      selectedItems.length > 0 ? selectedItems[0] : selectedItem,
    [selectedItem]
  );

  const isNothingSelected = useCallback(
    (selectedItems: OrdemServico[]) => selectedItems.length === 0 && !selectedItem,
    [selectedItem]
  );

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleAcao = useCallback((ordem: OrdemServico, acao: OrdemServicoAcao) => {
    if (isOrdemServicoLocal(ordem) && acao !== 'registrar_mensagem' && acao !== 'finalizar') {
      return;
    }
    setAcaoModal({ acao, ordem });
  }, []);

  const handleDelete = useCallback(
    async (id: number | string) => {
      try {
        await deleteMutation.mutateAsync(id);
        clearSelection();
        handleRefresh();
      } catch {
        // Erro tratado pelo hook
      }
    },
    [clearSelection, deleteMutation, handleRefresh]
  );

  const columns = useMemo(() => getOrdemServicoListColumns(), []);

  const acoesDropdown = useMemo(() => {
    const acoes =
      selectedItem && isOrdemServicoLocal(selectedItem)
        ? ORDEM_SERVICO_ACOES.filter(
            (acao) => acao.key === 'registrar_mensagem' || acao.key === 'finalizar'
          )
        : ORDEM_SERVICO_ACOES;

    return acoes.map((acao) => ({
      label: acao.label,
      action: (selectedItems?: OrdemServico[]) => {
        const ordem = resolveItem(selectedItems ?? []);
        if (ordem) {
          handleAcao(ordem, acao.key);
        }
      },
    }));
  }, [handleAcao, resolveItem, selectedItem]);

  const bulkActions = useMemo(
    () => [
      {
        key: 'novo',
        label: bulkBtn.novo.label,
        variant: bulkBtn.novo.variant,
        requiresSelection: false,
        onClick: () => {
          setIsEditMode(false);
          setEditOrdemId(null);
          setShowOsModal(true);
        },
      },
      {
        key: 'editar',
        label: bulkBtn.editar.label,
        variant: bulkBtn.editar.variant,
        disabled: (items: OrdemServico[]) => isNothingSelected(items),
        onClick: (items: OrdemServico[]) => {
          const ordem = resolveItem(items);
          if (!ordem) return;
          setIsEditMode(true);
          setEditOrdemId(resolveOrdemServicoId(ordem));
          setShowOsModal(true);
        },
      },
      {
        key: 'deletar',
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (items: OrdemServico[]) =>
          isNothingSelected(items) ||
          items.some((item) => !isOrdemServicoExcluivel(item)) ||
          deleteMutation.isPending,
        onClick: async (items: OrdemServico[]) => {
          const ordem = resolveItem(items);
          if (!ordem) return;
          if (!window.confirm(t('messages.confirmDelete'))) return;
          await handleDelete(resolveOrdemServicoId(ordem));
        },
      },
      {
        key: 'acoes',
        label: 'Ações',
        variant: 'primary' as const,
        disabled: (items: OrdemServico[]) => items.length !== 1,
        dropdown: acoesDropdown,
      },
    ],
    [
      acoesDropdown,
      bulkBtn,
      deleteMutation.isPending,
      handleDelete,
      isNothingSelected,
      resolveItem,
      t,
    ]
  );

  const handleOsSuccess = useCallback(() => {
    setShowOsModal(false);
    setIsEditMode(false);
    setEditOrdemId(null);
    clearSelection();
    handleRefresh();
    onOsCreated?.();
  }, [clearSelection, handleRefresh, onOsCreated]);

  return (
    <>
      <EmbeddedTablePanel<OrdemServico>
        key={`atendimento-ordens-servico-${atendimentoId}`}
        className="no-padding"
        config={{
          columns,
          data: ordens as OrdemServico[],
          loading: isLoading,
          searchable: true,
          searchPlaceholder: 'Buscar...',
          searchField: tableFilters.searchField || 'protocolo',
          searchFields: [
            { key: 'protocolo', label: 'Protocolo' },
            { key: 'status', label: 'Status' },
            { key: 'mensagem', label: 'Mensagem' },
          ],
          sortable: true,
          sortColumn: tableFilters.sortColumn,
          sortDirection: tableFilters.sortDirection,
          striped: true,
          hover: true,
          responsive: true,
          selectable: true,
          emptyMessage: 'Nenhuma ordem de serviço vinculada a este atendimento.',
          bulkActions: bulkActions.map((action) => ({
            key: action.key,
            label: action.label,
            onClick: action.onClick,
            disabled: action.disabled,
            variant: action.variant,
            requiresSelection: action.requiresSelection,
            dropdown: 'dropdown' in action ? action.dropdown : undefined,
          })),
        }}
        tableId={`atendimento-ordens-servico-${atendimentoId}`}
        search={tableFilters.search}
        onSearch={(term, field) => {
          tableFilters.setSearch(term);
          if (field) tableFilters.setSearchField(field);
        }}
        onSearchFieldChange={tableFilters.setSearchField}
        onSelectionChange={handleSelectionChange}
        onRefresh={handleRefresh}
        onSort={(col, dir) => tableFilters.setSort(col, dir)}
      />

      <OrdemServicoModal
        show={showOsModal}
        onClose={() => {
          setShowOsModal(false);
          setIsEditMode(false);
          setEditOrdemId(null);
        }}
        ordemServicoId={isEditMode ? editOrdemId : null}
        initialClienteId={clienteId}
        initialClienteNome={clienteNome}
        initialAtendimentoId={isEditMode ? undefined : atendimentoId}
        initialIdTicket={
          isEditMode ? undefined : atendimentoIxcTicketId || String(atendimentoId)
        }
        initialAtendimentoPrefill={isEditMode ? undefined : atendimentoPrefill}
        onSuccess={handleOsSuccess}
      />

      <OrdemServicoAcaoModal
        show={!!acaoModal}
        onClose={() => setAcaoModal(null)}
        ordemServico={acaoModal?.ordem ?? null}
        acao={acaoModal?.acao ?? null}
        onSuccess={() => {
          setAcaoModal(null);
          handleRefresh();
        }}
      />
    </>
  );
};

export default AtendimentoOrdensServicoList;
