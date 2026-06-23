import React, { useCallback, useMemo, useState } from 'react';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import TextPreviewModal from 'components/common/TextPreviewModal';
import { useBulkBtn } from 'components/ui';
import type { TableConfig } from 'components/tables/types';
import { useTableFilters } from 'hooks/useTableFilters';
import {
  useDeleteOrdemServicoMensagem,
  useOrdemServicoMensagens,
} from 'hooks/useOrdensServico';
import type { OrdemServico, OrdemServicoMensagem } from 'services/ordemServicoService';
import { formatRpkiValidityDisplay } from 'utils/formatters';
import OrdemServicoAcaoModal from './OrdemServicoAcaoModal';

interface OrdemServicoMensagensListProps {
  ordemServicoId: number | string;
  ordemServico: OrdemServico | null;
}

const formatIxcData = (value?: string): string => {
  if (!value?.trim() || value.startsWith('0000-00-00')) return '-';
  return formatRpkiValidityDisplay(value);
};

const formatMensagemPreview = (msg: OrdemServicoMensagem): string => {
  const linhas = [
    `Data: ${formatIxcData(msg.data)}`,
    `Evento: ${msg.evento_nome || `Evento ${msg.id_evento}`}`,
    `Colaborador: ${msg.colaborador_nome || '-'}`,
    '',
    msg.mensagem || '-',
  ];
  return linhas.join('\n');
};

const OrdemServicoMensagensList: React.FC<OrdemServicoMensagensListProps> = ({
  ordemServicoId,
  ordemServico,
}) => {
  const bulkBtn = useBulkBtn();
  const tableFilters = useTableFilters({
    initialSortColumn: 'data',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });

  const { data: mensagens = [], isLoading, refetch } = useOrdemServicoMensagens(ordemServicoId, true);
  const deleteMutation = useDeleteOrdemServicoMensagem();

  const [selectedItems, setSelectedItems] = useState<OrdemServicoMensagem[]>([]);
  const [showNovaMensagemModal, setShowNovaMensagemModal] = useState(false);
  const [previewMensagem, setPreviewMensagem] = useState<OrdemServicoMensagem | null>(null);

  const columns = useMemo(
    (): TableConfig<OrdemServicoMensagem>['columns'] => [
      {
        key: 'data',
        label: 'Data',
        sortable: true,
        searchable: false,
        width: '130px',
        render: (item) => <span className="text-nowrap">{formatIxcData(item.data)}</span>,
      },
      {
        key: 'evento_nome',
        label: 'Evento',
        sortable: true,
        searchable: true,
        width: '140px',
        render: (item) => item.evento_nome || `Evento ${item.id_evento}`,
      },
      {
        key: 'colaborador_nome',
        label: 'Colaborador',
        sortable: true,
        searchable: true,
        width: '140px',
        render: (item) => item.colaborador_nome || '-',
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
    async (items: OrdemServicoMensagem[]) => {
      if (items.length === 0) return;

      const confirmed = window.confirm(
        items.length === 1
          ? 'Deseja excluir a mensagem selecionada?'
          : `Deseja excluir as ${items.length} mensagens selecionadas?`
      );
      if (!confirmed) return;

      for (const item of items) {
        await deleteMutation.mutateAsync({ ordemServicoId, mensagemId: item.id });
      }
      setSelectedItems([]);
    },
    [deleteMutation, ordemServicoId]
  );

  const bulkActions = useMemo(
    () => [
      {
        key: 'novo',
        label: bulkBtn.novo.label,
        variant: bulkBtn.novo.variant,
        requiresSelection: false,
        disabled: () => !ordemServico,
        onClick: () => setShowNovaMensagemModal(true),
      },
      {
        key: 'visualizar',
        label: bulkBtn.visualizar.label,
        variant: bulkBtn.visualizar.variant,
        disabled: (items: OrdemServicoMensagem[]) => items.length !== 1,
        onClick: async (items: OrdemServicoMensagem[]) => {
          if (items.length !== 1) return;
          setPreviewMensagem(items[0]);
        },
      },
      {
        key: 'deletar',
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (items: OrdemServicoMensagem[]) => items.length === 0 || deleteMutation.isPending,
        onClick: handleDelete,
      },
    ],
    [bulkBtn, deleteMutation.isPending, handleDelete, ordemServico]
  );

  return (
    <>
      <EmbeddedTablePanel<OrdemServicoMensagem>
        key={`ordem-servico-mensagens-${ordemServicoId}`}
        title="Histórico"
        className="no-padding"
        config={{
          columns,
          data: mensagens,
          loading: isLoading,
          searchable: true,
          searchPlaceholder: 'Buscar...',
          searchField: tableFilters.searchField || 'mensagem',
          searchFields: [
            { key: 'evento_nome', label: 'Evento' },
            { key: 'colaborador_nome', label: 'Colaborador' },
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
          emptyMessage: 'Nenhuma mensagem registrada.',
          bulkActions: bulkActions.map((action) => ({
            key: action.key,
            label: action.label,
            onClick: action.onClick,
            disabled: action.disabled,
            variant: action.variant,
            requiresSelection: action.requiresSelection,
          })),
        }}
        tableId={`ordem-servico-mensagens-${ordemServicoId}`}
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

      <OrdemServicoAcaoModal
        show={showNovaMensagemModal}
        onClose={() => setShowNovaMensagemModal(false)}
        ordemServico={ordemServico}
        acao="registrar_mensagem"
        onSuccess={() => {
          setShowNovaMensagemModal(false);
          void refetch();
        }}
      />

      <TextPreviewModal
        show={previewMensagem != null}
        onClose={() => setPreviewMensagem(null)}
        title={
          previewMensagem
            ? `Mensagem — ${formatIxcData(previewMensagem.data)}`
            : 'Mensagem'
        }
        content={previewMensagem ? formatMensagemPreview(previewMensagem) : null}
        modalId="ordem-servico-mensagem-preview-modal"
      />
    </>
  );
};

export default OrdemServicoMensagensList;
