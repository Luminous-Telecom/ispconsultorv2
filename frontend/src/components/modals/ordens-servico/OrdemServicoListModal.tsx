import React, { useCallback, useMemo, useState } from 'react';
import {
  useOrdensServico,
  useDeleteOrdemServico,
} from 'hooks/useOrdensServico';
import { useEntityListModal } from 'hooks/useEntityListModal';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import type { OrdemServico } from 'services/ordemServicoService';
import OrdemServicoModal from './OrdemServicoModal';
import OrdemServicoAcaoModal from './OrdemServicoAcaoModal';
import { ORDEM_SERVICO_ACOES, isOrdemServicoLocal, type OrdemServicoAcao } from './ordemServicoAcoes';
import {
  getOrdemServicoPrioridadeBadgeConfig,
  ORDEM_SERVICO_PRIORIDADE_BADGE_LABELS,
} from './ordemServicoPrioridadeBadges';
import {
  getOrdemServicoStatusBadgeConfig,
  ORDEM_SERVICO_STATUS_BADGE_LABELS,
} from './ordemServicoStatusBadges';
import { renderStatusBadge } from 'components/ui/StatusBadge';
import { formatRpkiValidityDisplay } from 'utils/formatters';

interface OrdemServicoListModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  skipWrapper?: boolean;
}

const formatIxcData = (value?: string): string => {
  if (!value?.trim() || value.startsWith('0000-00-00')) return '-';
  return formatRpkiValidityDisplay(value);
};

const truncar = (texto?: string, max = 80): string => {
  if (!texto) return '-';
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
};

const resolveOrdemId = (ordem: OrdemServico): number | string => ordem.id_local ?? ordem.id;

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

  const handleAcao = useCallback((ordem: OrdemServico, acao: OrdemServicoAcao) => {
    if (isOrdemServicoLocal(ordem) && acao !== 'registrar_mensagem' && acao !== 'finalizar') {
      return;
    }
    const config = ORDEM_SERVICO_ACOES.find((a) => a.key === acao);
    if (!config?.needsForm) return;
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

  const columns = useMemo(
    (): ListModalConfig<OrdemServico>['columns'] => [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '65px',
        render: (item) => <span>{item.id_local ?? item.id}</span>,
      },
      {
        key: 'protocolo',
        label: 'Protocolo',
        sortable: true,
        width: '120px',
        render: (item) => <span>{item.protocolo || '-'}</span>,
      },
      {
        key: 'id_assunto',
        label: 'Assunto',
        sortable: true,
        width: '130px',
        render: (item) => <span>{item.assunto_nome || '-'}</span>,
      },
      {
        key: 'cliente_nome',
        label: 'Cliente',
        sortable: true,
        width: '150px',
        render: (item) => <span>{item.cliente_nome || '-'}</span>,
      },
      {
        key: 'operador_nome',
        label: 'Operador',
        sortable: true,
        width: '130px',
        render: (item) => <span>{item.operador_nome || '-'}</span>,
      },
      {
        key: 'id_estrutura',
        label: 'Estrutura',
        sortable: true,
        width: '150px',
        render: (item) => <span>{item.estrutura_nome || item.id_estrutura || '-'}</span>,
      },
      {
        key: 'mensagem',
        label: 'Descrição',
        sortable: false,
        width: '200px',
        render: (item) => <span title={item.mensagem || ''}>{truncar(item.mensagem, 60)}</span>,
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        width: '130px',
        badgeLabels: ORDEM_SERVICO_STATUS_BADGE_LABELS,
        render: (item) => renderStatusBadge(getOrdemServicoStatusBadgeConfig(item.status)),
      },
      {
        key: 'id_tecnico',
        label: 'Técnico',
        sortable: true,
        width: '140px',
        render: (item) => <span>{item.tecnico_nome || '-'}</span>,
      },
      {
        key: 'setor',
        label: 'Setor',
        sortable: true,
        width: '120px',
        render: (item) => <span>{item.setor_nome || '-'}</span>,
      },
      {
        key: 'prioridade',
        label: 'Prior.',
        sortable: true,
        width: '85px',
        badgeLabels: ORDEM_SERVICO_PRIORIDADE_BADGE_LABELS,
        render: (item) => renderStatusBadge(getOrdemServicoPrioridadeBadgeConfig(item.prioridade)),
      },
      {
        key: 'data_abertura',
        label: 'Abertura',
        sortable: true,
        width: '150px',
        render: (item) => <span>{formatIxcData(item.data_abertura)}</span>,
      },
      {
        key: 'data_agenda',
        label: 'Agenda',
        sortable: true,
        width: '150px',
        render: (item) => <span>{formatIxcData(item.data_agenda)}</span>,
      },
      {
        key: 'data_final',
        label: 'Final',
        sortable: true,
        width: '150px',
        render: (item) => <span>{formatIxcData(item.data_final)}</span>,
      },
      {
        key: 'data_fechamento',
        label: 'Fechamento',
        sortable: true,
        width: '150px',
        render: (item) => <span>{formatIxcData(item.data_fechamento)}</span>,
      },
    ],
    []
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: 'ID' },
      { key: 'cliente_nome', label: 'Cliente' },
      { key: 'operador_nome', label: 'Operador' },
      { key: 'estrutura_nome', label: 'Estrutura' },
      { key: 'mensagem', label: 'Descrição' },
      { key: 'protocolo', label: 'Protocolo' },
      { key: 'status', label: 'Status' },
    ],
    []
  );

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

  const bulkActions = useMemo(
    () => [
      ...list.buildCrudBulkActions({
        onNew: () => {
          list.setSelectedEntityId(null);
          setIsEditMode(false);
          setShowFormModal(true);
        },
        onEdit: (item) => {
          list.setSelectedEntityId(Number(resolveOrdemId(item)));
          setIsEditMode(true);
          setShowFormModal(true);
        },
        onDelete: handleDelete,
      }),
      {
        label: 'Ações',
        variant: 'primary' as const,
        disabled: (selectedItems: OrdemServico[]) => selectedItems.length !== 1,
        dropdown: acoesDropdown,
      },
    ],
    [list, handleDelete, acoesDropdown]
  );

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
