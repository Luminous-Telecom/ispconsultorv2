import React, { useCallback, useMemo, useState } from 'react';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { useBulkBtn } from 'components/ui';
import type { TableConfig } from 'components/tables/types';
import { useTableFilters } from 'hooks/useTableFilters';
import {
  useAtendimentoMensagens,
  useDeleteAtendimentoMensagem,
} from 'hooks/useAtendimentos';
import type { AtendimentoMensagem } from 'services/atendimentoService';
import { formatIxcData } from 'utils/ixcDateTime';
import AtendimentoMensagemDetalhesModal from './AtendimentoMensagemDetalhesModal';
import AtendimentoInteragirModal from './AtendimentoInteragirModal';
import { isAtendimentoInteracaoBloqueada } from './atendimentoAcoes';

interface AtendimentoMensagensListProps {
  atendimentoId: number | string;
  clienteId?: number;
  suStatus?: string;
  onStatusChanged?: () => void;
}

const AtendimentoMensagensList: React.FC<AtendimentoMensagensListProps> = ({
  atendimentoId,
  clienteId,
  suStatus,
  onStatusChanged,
}) => {
  const mensagensBloqueadas = isAtendimentoInteracaoBloqueada(suStatus);
  const bulkBtn = useBulkBtn();
  const tableFilters = useTableFilters({
    initialSortColumn: 'data',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });

  const { data: mensagens = [], isLoading, refetch } = useAtendimentoMensagens(
    atendimentoId,
    clienteId,
    true
  );
  const deleteMutation = useDeleteAtendimentoMensagem();

  const [, setSelectedItems] = useState<AtendimentoMensagem[]>([]);
  const [showInteragir, setShowInteragir] = useState(false);
  const [previewMensagem, setPreviewMensagem] = useState<AtendimentoMensagem | null>(null);

  const columns = useMemo(
    (): TableConfig<AtendimentoMensagem>['columns'] => [
      {
        key: 'data',
        label: 'Data',
        sortable: true,
        searchable: false,
        width: '130px',
        render: (item) => <span className="text-nowrap">{formatIxcData(item.data)}</span>,
      },
      {
        key: 'operador',
        label: 'Operador',
        sortable: true,
        searchable: true,
        width: '160px',
        render: (item) => item.operador || '-',
      },
      {
        key: 'mensagem',
        label: 'Mensagem',
        sortable: false,
        searchable: true,
        render: (item) => (
          <span className="os-mensagem-texto small">{item.mensagem || '-'}</span>
        ),
      },
    ],
    []
  );

  const handleDelete = useCallback(
    async (items: AtendimentoMensagem[]) => {
      if (items.length === 0) return;

      const confirmed = window.confirm(
        items.length === 1
          ? 'Deseja excluir a mensagem selecionada?'
          : `Deseja excluir as ${items.length} mensagens selecionadas?`
      );
      if (!confirmed) return;

      for (const item of items) {
        try {
          await deleteMutation.mutateAsync({
            atendimentoId,
            mensagemId: item.id,
            clienteId,
          });
        } catch {
          break;
        }
      }
      setSelectedItems([]);
    },
    [atendimentoId, clienteId, deleteMutation]
  );

  const bulkActions = useMemo(
    () => [
      {
        key: 'interagir',
        label: 'Interagir',
        variant: bulkBtn.novo.variant,
        requiresSelection: false,
        disabled: () => mensagensBloqueadas,
        onClick: () => setShowInteragir(true),
      },
      {
        key: 'visualizar',
        label: bulkBtn.visualizar.label,
        variant: bulkBtn.visualizar.variant,
        disabled: (items: AtendimentoMensagem[]) => items.length !== 1,
        onClick: async (items: AtendimentoMensagem[]) => {
          if (items.length !== 1) return;
          setPreviewMensagem(items[0]);
        },
      },
      {
        key: 'deletar',
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (items: AtendimentoMensagem[]) => items.length === 0 || deleteMutation.isPending,
        onClick: handleDelete,
      },
    ],
    [bulkBtn, deleteMutation.isPending, handleDelete, mensagensBloqueadas]
  );

  const handleInteragirSuccess = useCallback(() => {
    void refetch();
    onStatusChanged?.();
  }, [onStatusChanged, refetch]);

  return (
    <>
      <EmbeddedTablePanel<AtendimentoMensagem>
        key={`atendimento-mensagens-${atendimentoId}`}
        className="no-padding"
        config={{
          columns,
          data: mensagens,
          loading: isLoading,
          searchable: true,
          searchPlaceholder: 'Buscar...',
          searchField: tableFilters.searchField || 'mensagem',
          searchFields: [
            { key: 'operador', label: 'Operador' },
            { key: 'mensagem', label: 'Mensagem' },
          ],
          sortable: true,
          sortColumn: tableFilters.sortColumn,
          sortDirection: tableFilters.sortDirection,
          striped: true,
          hover: true,
          responsive: true,
          selectable: true,
          multiSelect: true,
          emptyMessage: mensagensBloqueadas
            ? 'Atendimento solucionado ou cancelado — novas mensagens não são permitidas pelo IXC.'
            : 'Nenhuma mensagem registrada.',
          bulkActions: bulkActions.map((action) => ({
            key: action.key,
            label: action.label,
            onClick: action.onClick,
            disabled: action.disabled,
            variant: action.variant,
            requiresSelection: action.requiresSelection,
          })),
        }}
        tableId={`atendimento-mensagens-${atendimentoId}`}
        search={tableFilters.search}
        onSearch={(term, field) => {
          tableFilters.setSearch(term);
          if (field) tableFilters.setSearchField(field);
        }}
        onSearchFieldChange={tableFilters.setSearchField}
        onRefresh={refetch}
        onSort={(col, dir) => tableFilters.setSort(col, dir)}
        onSelectionChange={setSelectedItems}
      />

      <AtendimentoInteragirModal
        show={showInteragir}
        onClose={() => setShowInteragir(false)}
        atendimentoId={atendimentoId}
        clienteId={clienteId}
        statusAtual={String(suStatus ?? 'N')}
        onSuccess={handleInteragirSuccess}
      />

      <AtendimentoMensagemDetalhesModal
        show={previewMensagem != null}
        onClose={() => setPreviewMensagem(null)}
        mensagem={previewMensagem}
      />
    </>
  );
};

export default AtendimentoMensagensList;
