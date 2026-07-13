import React, { useCallback, useMemo, useState } from 'react';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import ImprimirModal from 'components/common/ImprimirModal';
import ImageViewerModal from 'components/common/ImageViewerModal';
import { useBulkBtn } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import type { TableConfig } from 'components/tables/types';
import { useTableFilters } from 'hooks/useTableFilters';
import {
  useAtendimentoArquivos,
  useDeleteAtendimentoArquivo,
} from 'hooks/useAtendimentos';
import { AtendimentoService, type AtendimentoArquivo } from 'services/atendimentoService';
import AtendimentoAdicionarArquivoModal from './AtendimentoAdicionarArquivoModal';

interface AtendimentoArquivosListProps {
  atendimentoId: number | string;
  clienteId?: number;
}

const AtendimentoArquivosList: React.FC<AtendimentoArquivosListProps> = ({
  atendimentoId,
  clienteId,
}) => {
  const bulkBtn = useBulkBtn();
  const { error: notifyError } = useNotificationContext();
  const tableFilters = useTableFilters({
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });

  const { data: arquivos = [], isLoading, refetch } = useAtendimentoArquivos(
    atendimentoId,
    clienteId,
    true
  );
  const deleteMutation = useDeleteAtendimentoArquivo();

  const [, setSelectedItems] = useState<AtendimentoArquivo[]>([]);
  const [showAdicionarModal, setShowAdicionarModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('Arquivo');

  const isImageFile = useCallback((arquivo: AtendimentoArquivo): boolean => {
    const mimeType = (arquivo.mime_type || '').toLowerCase();
    const nomeArquivo = (arquivo.nome || '').toLowerCase();
    return mimeType.includes('image') || /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i.test(nomeArquivo);
  }, []);

  const handleDownload = useCallback(
    async (arquivo: AtendimentoArquivo) => {
      try {
        await AtendimentoService.downloadArquivo(
          atendimentoId,
          arquivo.id,
          arquivo.nome || 'arquivo',
          clienteId
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao baixar arquivo';
        notifyError(message);
      }
    },
    [atendimentoId, clienteId, notifyError]
  );

  const handleView = useCallback(
    async (arquivo: AtendimentoArquivo) => {
      try {
        const blob = await AtendimentoService.fetchArquivoBlob(
          atendimentoId,
          arquivo.id,
          clienteId,
          true
        );
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
    [atendimentoId, clienteId, isImageFile, notifyError]
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
    async (items: AtendimentoArquivo[]) => {
      if (items.length === 0) return;

      const confirmed = window.confirm(
        items.length === 1
          ? 'Deseja excluir o arquivo selecionado?'
          : `Deseja excluir os ${items.length} arquivos selecionados?`
      );
      if (!confirmed) return;

      for (const item of items) {
        await deleteMutation.mutateAsync({
          atendimentoId,
          arquivoId: item.id,
          clienteId,
        });
      }
      setSelectedItems([]);
    },
    [atendimentoId, clienteId, deleteMutation]
  );

  const canViewFile = useCallback((arquivo: AtendimentoArquivo): boolean => {
    const extensoesVisiveis = /\.(pdf|jpg|jpeg|png|gif|bmp|webp|svg|ico|mp4|webm|ogg|mov|avi|txt|csv|json|xml|html|css|js|md)$/i;
    const mimeType = (arquivo.mime_type || '').toLowerCase();
    return extensoesVisiveis.test(arquivo.nome || '') || /pdf|image|video|text/.test(mimeType);
  }, []);

  const columns = useMemo(
    (): TableConfig<AtendimentoArquivo>['columns'] => [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        searchable: true,
        width: '70px',
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
        disabled: (items: AtendimentoArquivo[]) =>
          items.length !== 1 || !canViewFile(items[0]),
        onClick: async (items: AtendimentoArquivo[]) => {
          if (items.length !== 1) return;
          handleView(items[0]);
        },
      },
      {
        key: 'baixar',
        label: bulkBtn.baixar.label,
        variant: bulkBtn.baixar.variant,
        disabled: (items: AtendimentoArquivo[]) => items.length === 0,
        onClick: async (items: AtendimentoArquivo[]) => {
          for (const item of items) {
            handleDownload(item);
          }
        },
      },
      {
        key: 'deletar',
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (items: AtendimentoArquivo[]) => items.length === 0 || deleteMutation.isPending,
        onClick: handleDelete,
      },
    ],
    [bulkBtn, canViewFile, deleteMutation.isPending, handleDelete, handleDownload, handleView]
  );

  return (
    <>
      <EmbeddedTablePanel<AtendimentoArquivo>
        key={`atendimento-arquivos-${atendimentoId}`}
        title="Arquivos"
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
        tableId={`atendimento-arquivos-${atendimentoId}`}
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

      <AtendimentoAdicionarArquivoModal
        show={showAdicionarModal}
        onClose={() => setShowAdicionarModal(false)}
        atendimentoId={atendimentoId}
        clienteId={clienteId}
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
        modalId="atendimento-arquivo-preview-modal"
      />

      <ImageViewerModal
        show={showImagePreview}
        onClose={closePreview}
        imageUrl={previewUrl}
        title={previewTitle}
        modalId="atendimento-image-viewer-modal"
      />
    </>
  );
};

export default AtendimentoArquivosList;
