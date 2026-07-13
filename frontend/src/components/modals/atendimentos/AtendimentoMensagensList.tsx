import React, { useCallback, useMemo, useState } from 'react';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import DraggableModal from 'components/common/DraggableModal';
import { FormField, ModalFormActions, useBulkBtn } from 'components/ui';
import type { TableConfig } from 'components/tables/types';
import { useTableFilters } from 'hooks/useTableFilters';
import {
  useAtendimentoMensagens,
  useCreateAtendimentoMensagem,
  useDeleteAtendimentoMensagem,
} from 'hooks/useAtendimentos';
import type { AtendimentoMensagem } from 'services/atendimentoService';
import { formatIxcData } from 'utils/ixcDateTime';
import AtendimentoMensagemDetalhesModal from './AtendimentoMensagemDetalhesModal';

interface AtendimentoMensagensListProps {
  atendimentoId: number | string;
  clienteId?: number;
  suStatus?: string;
}

const AtendimentoMensagensList: React.FC<AtendimentoMensagensListProps> = ({
  atendimentoId,
  clienteId,
  suStatus,
}) => {
  const mensagensBloqueadas = suStatus === 'S' || suStatus === 'C';
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
  const createMutation = useCreateAtendimentoMensagem();
  const deleteMutation = useDeleteAtendimentoMensagem();

  const [, setSelectedItems] = useState<AtendimentoMensagem[]>([]);
  const [showNovaMensagem, setShowNovaMensagem] = useState(false);
  const [previewMensagem, setPreviewMensagem] = useState<AtendimentoMensagem | null>(null);
  const [mensagem, setMensagem] = useState('');

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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!mensagem.trim() || mensagensBloqueadas) return;

      createMutation.mutate(
        { id: atendimentoId, mensagem: mensagem.trim(), clienteId },
        {
          onSuccess: () => {
            setMensagem('');
            setShowNovaMensagem(false);
            void refetch();
          },
        }
      );
    },
    [atendimentoId, clienteId, createMutation, mensagem, mensagensBloqueadas, refetch]
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
        key: 'novo',
        label: bulkBtn.novo.label,
        variant: bulkBtn.novo.variant,
        requiresSelection: false,
        disabled: () => mensagensBloqueadas,
        onClick: () => setShowNovaMensagem(true),
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

  return (
    <>
      <EmbeddedTablePanel<AtendimentoMensagem>
        key={`atendimento-mensagens-${atendimentoId}`}
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

      <DraggableModal
        show={showNovaMensagem}
        onClose={() => setShowNovaMensagem(false)}
        title="Nova mensagem"
        size="md"
        modalId="atendimento-nova-mensagem-modal"
        headerActions={
          <ModalFormActions
            onCancel={() => setShowNovaMensagem(false)}
            formId="atendimento-nova-mensagem-form"
            isPending={createMutation.isPending}
          />
        }
      >
        <form
          id="atendimento-nova-mensagem-form"
          onSubmit={handleSubmit}
          className="form-modal-simple"
        >
          <div className="row g-2">
            <div className="col-12">
              <FormField
                name="mensagem"
                type="textarea"
                label="Mensagem"
                required
                value={mensagem}
                onChange={(v) => setMensagem(String(v ?? ''))}
                rows={5}
                size="sm"
              />
            </div>
          </div>
        </form>
      </DraggableModal>

      <AtendimentoMensagemDetalhesModal
        show={previewMensagem != null}
        onClose={() => setPreviewMensagem(null)}
        mensagem={previewMensagem}
      />
    </>
  );
};

export default AtendimentoMensagensList;
