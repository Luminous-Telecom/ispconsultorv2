import React, { useCallback, useMemo, useState } from 'react';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import ImprimirModal from 'components/common/ImprimirModal';
import ImageViewerModal from 'components/common/ImageViewerModal';
import { useBulkBtn } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import type { TableConfig } from 'components/tables/types';
import { useTableFilters } from 'hooks/useTableFilters';
import {
  useDeleteOrdemServicoArquivo,
  useOrdemServicoArquivos,
} from 'hooks/useOrdensServico';
import { OrdemServicoService, type OrdemServicoArquivo } from 'services/ordemServicoService';
import OrdemServicoAdicionarArquivoModal from './OrdemServicoAdicionarArquivoModal';

interface OrdemServicoArquivosListProps {
  ordemServicoId: number | string;
}

const OrdemServicoArquivosList: React.FC<OrdemServicoArquivosListProps> = ({ ordemServicoId }) => {
  const bulkBtn = useBulkBtn();
  const { error: notifyError } = useNotificationContext();
  const tableFilters = useTableFilters({
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });

  const { data: arquivos = [], isLoading, refetch } = useOrdemServicoArquivos(ordemServicoId, true);
  const deleteMutation = useDeleteOrdemServicoArquivo();

  const [, setSelectedItems] = useState<OrdemServicoArquivo[]>([]);
  const [showAdicionarModal, setShowAdicionarModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('Arquivo');

  const isImageFile = useCallback((arquivo: OrdemServicoArquivo): boolean => {
    const mimeType = (arquivo.mime_type || '').toLowerCase();
    const nomeArquivo = (arquivo.nome || '').toLowerCase();
    return mimeType.includes('image') || /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i.test(nomeArquivo);
  }, []);

  const handleDownload = useCallback(
    async (arquivo: OrdemServicoArquivo) => {
      try {
        await OrdemServicoService.downloadArquivo(ordemServicoId, arquivo.id, arquivo.nome);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao baixar arquivo';
        notifyError(message);
      }
    },
    [notifyError, ordemServicoId]
  );

  const handleView = useCallback(
    async (arquivo: OrdemServicoArquivo) => {
      try {
        const blob = await OrdemServicoService.fetchArquivoBlob(ordemServicoId, arquivo.id, true);
        const url = window.URL.createObjectURL(blob);
        const isImage = isImageFile(arquivo);

        setPreviewUrl(url);
        setPreviewTitle(
          isImage
            ? `Foto — ${arquivo.descricao || arquivo.nome}`
            : `Documento — ${arquivo.descricao || arquivo.nome}`
        );

        if (isImage) {
          setShowImagePreview(true);
        } else {
          setShowPreview(true);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao visualizar arquivo';
        notifyError(message);
      }
    },
    [isImageFile, notifyError, ordemServicoId]
  );

  const closePreview = useCallback(() => {
    setShowPreview(false);
    setShowImagePreview(false);
    setPreviewUrl((current) => {
      if (current?.startsWith('blob:')) {
        window.URL.revokeObjectURL(current);
      }
      return null;
    });
  }, []);

  const handleDelete = useCallback(
    async (items: OrdemServicoArquivo[]) => {
      if (items.length === 0) return;

      const confirmed = window.confirm(
        items.length === 1
          ? 'Deseja excluir o arquivo selecionado?'
          : `Deseja excluir os ${items.length} arquivos selecionados?`
      );
      if (!confirmed) return;

      for (const item of items) {
        await deleteMutation.mutateAsync({ ordemServicoId, arquivoId: item.id });
      }
      setSelectedItems([]);
    },
    [deleteMutation, ordemServicoId]
  );

  const canViewFile = useCallback((arquivo: OrdemServicoArquivo): boolean => {
    const extensoesVisiveis = /\.(pdf|jpg|jpeg|png|gif|bmp|webp|svg|ico|mp4|webm|ogg|mov|avi|txt|csv|json|xml|html|css|js|md)$/i;
    const mimeType = (arquivo.mime_type || '').toLowerCase();
    return extensoesVisiveis.test(arquivo.nome) || /pdf|image|video|text/.test(mimeType);
  }, []);

  const columns = useMemo(
    (): TableConfig<OrdemServicoArquivo>['columns'] => [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        searchable: true,
        render: (item) => item.id,
      },
      {
        key: 'descricao',
        label: 'Descrição',
        sortable: true,
        searchable: true,
        render: (item) => (
          <span title={item.nome}>{item.descricao || item.nome || '-'}</span>
        ),
      },
      {
        key: 'nome',
        label: 'Arquivo',
        sortable: true,
        searchable: true,
        render: (item) => item.nome || '-',
      },
    ],
    []
  );

  const bulkActions = useMemo(
    () => [
      {
        key: 'novo',
        label: bulkBtn.novo.label,
        variant: bulkBtn.novo.variant,
        requiresSelection: false,
        disabled: () => false,
        onClick: () => setShowAdicionarModal(true),
      },
      {
        key: 'visualizar',
        label: bulkBtn.visualizar.label,
        variant: bulkBtn.visualizar.variant,
        disabled: (items: OrdemServicoArquivo[]) =>
          items.length !== 1 || !canViewFile(items[0]),
        onClick: async (items: OrdemServicoArquivo[]) => {
          if (items.length !== 1) return;
          handleView(items[0]);
        },
      },
      {
        key: 'baixar',
        label: bulkBtn.baixar.label,
        variant: bulkBtn.baixar.variant,
        disabled: (items: OrdemServicoArquivo[]) => items.length === 0,
        onClick: async (items: OrdemServicoArquivo[]) => {
          for (const item of items) {
            handleDownload(item);
          }
        },
      },
      {
        key: 'deletar',
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (items: OrdemServicoArquivo[]) => items.length === 0 || deleteMutation.isPending,
        onClick: handleDelete,
      },
    ],
    [bulkBtn, canViewFile, deleteMutation.isPending, handleDelete, handleDownload, handleView]
  );

  return (
    <>
      <EmbeddedTablePanel<OrdemServicoArquivo>
        key={`ordem-servico-arquivos-${ordemServicoId}`}
        className="no-padding"
        config={{
          columns,
          data: arquivos,
          loading: isLoading,
          searchable: true,
          searchPlaceholder: 'Buscar...',
          searchField: tableFilters.searchField || 'descricao',
          searchFields: [
            { key: 'id', label: 'ID' },
            { key: 'descricao', label: 'Descrição' },
            { key: 'nome', label: 'Arquivo' },
          ],
          sortable: true,
          sortColumn: tableFilters.sortColumn,
          sortDirection: tableFilters.sortDirection,
          striped: true,
          hover: true,
          responsive: true,
          selectable: true,
          multiSelect: true,
          emptyMessage: 'Nenhum arquivo anexado.',
          bulkActions: bulkActions.map((action) => ({
            key: action.key,
            label: action.label,
            onClick: action.onClick,
            disabled: action.disabled,
            variant: action.variant,
            requiresSelection: action.requiresSelection,
          })),
        }}
        tableId={`ordem-servico-arquivos-${ordemServicoId}`}
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

      <OrdemServicoAdicionarArquivoModal
        show={showAdicionarModal}
        onClose={() => setShowAdicionarModal(false)}
        ordemServicoId={ordemServicoId}
        onSuccess={() => {
          setShowAdicionarModal(false);
          void refetch();
        }}
      />

      <ImprimirModal
        show={showPreview}
        onClose={closePreview}
        pdfUrl={previewUrl}
        title={previewTitle}
        modalId="ordem-servico-arquivo-preview-modal"
      />

      <ImageViewerModal
        show={showImagePreview}
        onClose={closePreview}
        imageUrl={previewUrl}
        title={previewTitle}
        modalId="ordem-servico-image-viewer-modal"
      />
    </>
  );
};

export default OrdemServicoArquivosList;
