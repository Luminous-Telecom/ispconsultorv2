import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useOrdensServico,
  useDeleteOrdemServico,
} from 'hooks/useOrdensServico';
import { useEntityListModal } from 'hooks/useEntityListModal';
import ListModal from 'components/common/ListModal';
import DocumentoSistemaService from 'services/documentoSistemaService';
import { OrdemServicoService } from 'services/ordemServicoService';
import type { OrdemServico } from 'services/ordemServicoService';
import { MODELOS_ORDEM_SERVICO_PADRAO } from 'constants/modelosOrdemServicoPadrao';
import OrdemServicoModal from './OrdemServicoModal';
import OrdemServicoAcaoModal from './OrdemServicoAcaoModal';
import ImprimirModal from 'components/common/ImprimirModal';
import { useImpressaoSuporteDocumento } from 'hooks/useImpressaoSuporteDocumento';
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

  const impressaoOs = useImpressaoSuporteDocumento({
    fetchPdf: OrdemServicoService.imprimirPdf,
    entityLabel: 'Ordem de serviço',
  });

  const { data: modelosOsData } = useQuery({
    queryKey: ['documentos-sistema', 'ordem_servico'],
    queryFn: () => DocumentoSistemaService.getByType('ordem_servico'),
    enabled: show,
    staleTime: 60_000,
  });

  const modelosOsCadastrados = useMemo(
    () => (modelosOsData?.data ?? []).filter((item) => item.ativo !== false),
    [modelosOsData?.data]
  );

  const handleImprimirComModelo = useCallback(
    (
      selectedItems: OrdemServico[],
      options: { modeloId?: number; modeloPadrao?: string } = {}
    ) => {
      if (selectedItems.length !== 1) return;
      const ordem = selectedItems[0];
      const ordemId = resolveOrdemServicoId(ordem);
      const clienteRef = ordem.cliente_id;
      void impressaoOs.imprimir(ordemId, {
        clienteId: clienteRef ? Number(clienteRef) : undefined,
        ...options,
      });
    },
    [impressaoOs]
  );

  const imprimirDropdown = useMemo(() => {
    const presetItems = MODELOS_ORDEM_SERVICO_PADRAO.map((preset) => ({
      label: `${preset.nome} (padrão)`,
      action: (selectedItems?: OrdemServico[]) => {
        handleImprimirComModelo(selectedItems ?? [], { modeloPadrao: preset.id });
      },
    }));

    const cadastradosItems = modelosOsCadastrados.map((modelo) => ({
      label: modelo.nome,
      action: (selectedItems?: OrdemServico[]) => {
        handleImprimirComModelo(selectedItems ?? [], { modeloId: modelo.id });
      },
    }));

    return [...presetItems, ...cadastradosItems];
  }, [handleImprimirComModelo, modelosOsCadastrados]);

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
        label: bulkBtn.imprimir.label,
        variant: bulkBtn.imprimir.variant,
        disabled: (selectedItems: OrdemServico[]) => selectedItems.length !== 1,
        dropdown: imprimirDropdown,
      },
      {
        label: 'Ações',
        variant: 'primary' as const,
        disabled: (selectedItems: OrdemServico[]) => selectedItems.length !== 1,
        dropdown: acoesDropdown,
      },
    ];
  }, [list, handleDelete, imprimirDropdown, acoesDropdown, bulkBtn.imprimir.label, bulkBtn.imprimir.variant]);

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

      {showFormModal && (
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
      )}

      <OrdemServicoAcaoModal
        show={!!acaoModal}
        onClose={() => setAcaoModal(null)}
        ordemServico={acaoModal?.ordem ?? null}
        acao={acaoModal?.acao ?? null}
        onSuccess={() => {
          setAcaoModal(null);
        }}
      />

      <ImprimirModal
        show={impressaoOs.showModal}
        onClose={impressaoOs.limparPdfUrl}
        pdfUrl={impressaoOs.pdfUrl}
        isGenerating={impressaoOs.isGeneratingPdf}
        title="Ordem de serviço"
        modalId="ordem-servico-list-imprimir-modal"
      />
    </>
  );
};

export default OrdemServicoListModal;
