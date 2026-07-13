import React, { useCallback, useMemo, useState } from 'react';
import { useAtendimentos, useDeleteAtendimento } from 'hooks/useAtendimentos';
import { useEntityListModal } from 'hooks/useEntityListModal';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import type { Atendimento } from 'services/atendimentoService';
import { AtendimentoService } from 'services/atendimentoService';
import AtendimentoModal from './AtendimentoModal';
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
    ];
  }, [list, handleDelete, handleImprimir, bulkBtn.imprimir.label, bulkBtn.imprimir.variant]);

  const pagination = useMemo(
    () => list.buildPagination(atendimentosData?.pagination),
    [list, atendimentosData?.pagination]
  );

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
