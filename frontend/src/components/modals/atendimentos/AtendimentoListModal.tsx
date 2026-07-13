import React, { useCallback, useMemo, useState } from 'react';
import { useAtendimentos, useDeleteAtendimento } from 'hooks/useAtendimentos';
import { useEntityListModal } from 'hooks/useEntityListModal';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import type { Atendimento } from 'services/atendimentoService';
import { AtendimentoService } from 'services/atendimentoService';
import AtendimentoModal from './AtendimentoModal';
import AtendimentoInteragirModal from './AtendimentoInteragirModal';
import OrdemServicoModal from 'components/modals/ordens-servico/OrdemServicoModal';
import ImprimirModal from 'components/common/ImprimirModal';
import { useImpressaoSuporteDocumento } from 'hooks/useImpressaoSuporteDocumento';
import { useBulkBtn } from 'components/ui';
import {
  getAtendimentoPrioridadeBadgeConfig,
  ATENDIMENTO_PRIORIDADE_BADGE_LABELS,
} from './atendimentoPrioridadeBadges';
import {
  getAtendimentoStatusBadgeConfig,
  ATENDIMENTO_STATUS_BADGE_LABELS,
} from './atendimentoStatusBadges';
import {
  ATENDIMENTO_ACOES,
  isAtendimentoInteracaoBloqueada,
  resolveAtendimentoId,
  type AtendimentoAcao,
} from './atendimentoAcoes';
import { renderStatusBadge } from 'components/ui/StatusBadge';
import { formatIxcData } from 'utils/ixcDateTime';

interface AtendimentoListModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  skipWrapper?: boolean;
}

const truncar = (texto?: string, max = 80): string => {
  if (!texto) return '-';
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
};

const AtendimentoListModal: React.FC<AtendimentoListModalProps> = ({
  show,
  onClose,
  title,
  skipWrapper = false,
}) => {
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editingClienteId, setEditingClienteId] = useState<number | undefined>();
  const [interagirAtendimento, setInteragirAtendimento] = useState<Atendimento | null>(null);
  const [osAtendimento, setOsAtendimento] = useState<Atendimento | null>(null);

  const list = useEntityListModal<Atendimento>({
    onClose,
    initialSearchField: 'titulo',
  });

  const { data: atendimentosData, isLoading, refetch } = useAtendimentos(
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

  const deleteMutation = useDeleteAtendimento();
  const bulkBtn = useBulkBtn();

  const impressaoAtendimento = useImpressaoSuporteDocumento({
    fetchPdf: AtendimentoService.imprimirPdf,
    entityLabel: 'Atendimento',
  });

  const handleImprimir = useCallback(
    (selectedItems: Atendimento[]) => {
      if (selectedItems.length !== 1) return;
      const atendimento = selectedItems[0];
      const atendimentoId = atendimento.id_local ?? atendimento.id;
      const clienteRef = atendimento.cliente_id;
      void impressaoAtendimento.imprimir(atendimentoId, {
        clienteId: clienteRef ? Number(clienteRef) : undefined,
      });
    },
    [impressaoAtendimento]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteMutation.mutateAsync({ id });
      } catch {
        // hook
      }
    },
    [deleteMutation]
  );

  const handleAcao = useCallback((atendimento: Atendimento, acao: AtendimentoAcao) => {
    if (acao === 'interagir') {
      if (isAtendimentoInteracaoBloqueada(atendimento.su_status)) return;
      setInteragirAtendimento(atendimento);
      return;
    }
    if (acao === 'abrir_os') {
      setOsAtendimento(atendimento);
    }
  }, []);

  const columns = useMemo(
    (): ListModalConfig<Atendimento>['columns'] => [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '70px',
        render: (item) => <span>{item.id_local ?? item.id}</span>,
      },
      {
        key: 'protocolo',
        label: 'Protocolo',
        sortable: true,
        width: '130px',
        render: (item) => <span>{item.protocolo || '-'}</span>,
      },
      {
        key: 'titulo',
        label: 'Assunto',
        sortable: true,
        width: '160px',
        render: (item) => <span>{item.titulo || item.assunto_nome || '-'}</span>,
      },
      {
        key: 'cliente_nome',
        label: 'Cliente',
        sortable: false,
        width: '150px',
        render: (item) => <span>{item.cliente_nome || '-'}</span>,
      },
      {
        key: 'id_ticket_setor',
        label: 'Departamento',
        sortable: true,
        width: '140px',
        render: (item) => <span>{item.departamento_nome || '-'}</span>,
      },
      {
        key: 'id_responsavel_technico',
        label: 'Colaborador responsável',
        sortable: true,
        width: '140px',
        render: (item) => <span>{item.responsavel_nome || '-'}</span>,
      },
      {
        key: 'menssagem',
        label: 'Descrição',
        sortable: false,
        width: '200px',
        render: (item) => (
          <span title={item.menssagem || ''}>{truncar(item.menssagem, 60)}</span>
        ),
      },
      {
        key: 'su_status',
        label: 'Status',
        sortable: true,
        width: '120px',
        badgeLabels: ATENDIMENTO_STATUS_BADGE_LABELS,
        render: (item) => renderStatusBadge(getAtendimentoStatusBadgeConfig(item.su_status)),
      },
      {
        key: 'prioridade',
        label: 'Prior.',
        sortable: true,
        width: '85px',
        badgeLabels: ATENDIMENTO_PRIORIDADE_BADGE_LABELS,
        render: (item) =>
          renderStatusBadge(getAtendimentoPrioridadeBadgeConfig(item.prioridade)),
      },
      {
        key: 'ultima_atualizacao',
        label: 'Última atualização',
        sortable: true,
        width: '150px',
        render: (item) => <span>{formatIxcData(item.ultima_atualizacao)}</span>,
      },
    ],
    []
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: 'ID IXC' },
      { key: 'id_local', label: 'ID local' },
      { key: 'protocolo', label: 'Protocolo' },
      { key: 'titulo', label: 'Assunto' },
      { key: 'id_ticket_setor', label: 'Departamento (ID)' },
      { key: 'menssagem', label: 'Descrição' },
      { key: 'su_status', label: 'Status' },
    ],
    []
  );

  const acoesDropdown = useMemo(() => {
    return ATENDIMENTO_ACOES.map((acao) => ({
      label: acao.label,
      action: (selectedItems?: Atendimento[]) => {
        const atendimento = list.resolveItem(selectedItems ?? []);
        if (atendimento) {
          handleAcao(atendimento, acao.key);
        }
      },
      disabled:
        acao.key === 'interagir'
          ? (selectedItems?: Atendimento[]) => {
              const atendimento = list.resolveItem(selectedItems ?? []);
              return !atendimento || isAtendimentoInteracaoBloqueada(atendimento.su_status);
            }
          : undefined,
    }));
  }, [handleAcao, list]);

  const bulkActions = useMemo(() => {
    const crudActions = list.buildCrudBulkActions({
      onNew: () => {
        setEditingId(null);
        setEditingClienteId(undefined);
        setIsEditMode(false);
        setShowFormModal(true);
      },
      onEdit: (item) => {
        const editId = item.id_local ?? item.id;
        setEditingId(editId);
        const cid = item.cliente_id != null ? Number(item.cliente_id) : undefined;
        setEditingClienteId(cid && cid > 0 ? cid : undefined);
        setIsEditMode(true);
        setShowFormModal(true);
      },
      onDelete: handleDelete,
    });

    return [
      ...crudActions,
      {
        label: bulkBtn.imprimir.label,
        variant: bulkBtn.imprimir.variant,
        disabled: (selectedItems: Atendimento[]) => selectedItems.length !== 1,
        action: handleImprimir,
      },
      {
        label: 'Ações',
        variant: 'primary' as const,
        disabled: (selectedItems: Atendimento[]) => selectedItems.length !== 1,
        dropdown: acoesDropdown,
      },
    ];
  }, [list, handleDelete, handleImprimir, acoesDropdown, bulkBtn.imprimir.label, bulkBtn.imprimir.variant]);

  const pagination = useMemo(
    () => list.buildPagination(atendimentosData?.pagination),
    [list, atendimentosData?.pagination]
  );

  const osAtendimentoId = osAtendimento ? resolveAtendimentoId(osAtendimento) : null;
  const osClienteId =
    osAtendimento?.cliente_id != null ? Number(osAtendimento.cliente_id) : undefined;
  const osIxcTicketId = useMemo(() => {
    if (!osAtendimento) return '';
    const ixcId = String(osAtendimento.ixc_id ?? '').trim();
    if (ixcId) return ixcId;
    return osAtendimentoId != null ? String(osAtendimentoId) : '';
  }, [osAtendimento, osAtendimentoId]);

  return (
    <>
      <ListModal<Atendimento>
        show={show}
        onClose={list.handleModalClose}
        skipWrapper={skipWrapper}
        config={{
          title: title || 'Atendimentos',
          columns,
          searchPlaceholder: 'Buscar atendimentos...',
          searchField: 'titulo',
          searchFields,
          emptyMessage: 'Nenhum atendimento encontrado.',
        }}
        data={atendimentosData?.data ?? []}
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
        tableId="atendimentos-list-modal"
        modalId="atendimentos-list-modal"
      />

      {showFormModal && (
        <AtendimentoModal
          show={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setIsEditMode(false);
            setEditingId(null);
            setEditingClienteId(undefined);
          }}
          atendimentoId={isEditMode ? editingId : null}
          clienteIdInicial={editingClienteId}
          onSuccess={() => {
            void refetch();
          }}
        />
      )}

      {interagirAtendimento ? (
        <AtendimentoInteragirModal
          show={!!interagirAtendimento}
          onClose={() => setInteragirAtendimento(null)}
          atendimentoId={resolveAtendimentoId(interagirAtendimento)}
          clienteId={
            interagirAtendimento.cliente_id != null
              ? Number(interagirAtendimento.cliente_id)
              : undefined
          }
          statusAtual={String(interagirAtendimento.su_status ?? 'N')}
          onSuccess={() => {
            void refetch();
          }}
        />
      ) : null}

      {osAtendimento && osAtendimentoId != null ? (
        <OrdemServicoModal
          show={!!osAtendimento}
          onClose={() => setOsAtendimento(null)}
          ordemServicoId={null}
          initialClienteId={osClienteId && osClienteId > 0 ? osClienteId : undefined}
          initialClienteNome={String(osAtendimento.cliente_nome ?? '')}
          initialAtendimentoId={osAtendimentoId}
          initialIdTicket={osIxcTicketId || String(osAtendimentoId)}
          initialAtendimentoPrefill={{
            id_filial: String(osAtendimento.id_filial ?? ''),
            id_estrutura: String(osAtendimento.id_estrutura ?? ''),
            filial_nome: String(osAtendimento.filial_nome ?? ''),
            estrutura_nome: String(osAtendimento.estrutura_nome ?? ''),
          }}
          onSuccess={() => {
            setOsAtendimento(null);
            void refetch();
          }}
        />
      ) : null}

      <ImprimirModal
        show={impressaoAtendimento.showModal}
        onClose={impressaoAtendimento.limparPdfUrl}
        pdfUrl={impressaoAtendimento.pdfUrl}
        isGenerating={impressaoAtendimento.isGeneratingPdf}
        title="Atendimento"
        modalId="atendimento-list-imprimir-modal"
      />
    </>
  );
};

export default AtendimentoListModal;
