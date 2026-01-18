import React, { useState, useMemo, useCallback } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useClienteArquivos } from '@/hooks/useClienteArquivos';
import { ClienteArquivo } from '@/services/clienteArquivoService';
import { formatDateTime } from '@/utils/formatters';
import Table from '@/components/tables/Table';
import ImprimirModal from '@/components/common/ImprimirModal';
import ImageViewerModal from '@/components/common/ImageViewerModal';
import AdicionarArquivoModal from './AdicionarArquivoModal';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { useTableFilters } from '@/hooks/useTableFilters';

interface ArquivosTabProps {
  clienteId?: number | null;
  onAudit?: (arquivo: ClienteArquivo) => void;
  auditEntity?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
}

const ArquivosTab: React.FC<ArquivosTabProps> = ({ 
  clienteId, 
  onAudit, 
  auditEntity,
  sortColumn,
  sortDirection,
  onSort
}) => {
  const { t } = useI18n();
  const [_selectedItems, setSelectedItems] = useState<ClienteArquivo[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>(t('modal.viewDocument'));
  const [showAdicionarModal, setShowAdicionarModal] = useState(false);

  const arquivosTableFilters = useTableFilters({ 
    initialSortColumn: sortColumn || 'id', 
    initialSortDirection: sortDirection || 'desc' 
  });

  const finalSortColumn = sortColumn || arquivosTableFilters.sortColumn;
  const finalSortDirection = sortDirection || arquivosTableFilters.sortDirection;
  const finalOnSort = onSort || arquivosTableFilters.setSort;

  const { arquivos, isLoading, refetch, deleteMutation } = useClienteArquivos({
    clienteId: clienteId || undefined,
    filters: {
      sortColumn: finalSortColumn,
      sortDirection: finalSortDirection
    }
  });
  const { confirm, modalProps } = useConfirmModal();

  const isImageFile = useCallback((arquivo: ClienteArquivo): boolean => {
    const mimeType = (arquivo.mime_type || '').toLowerCase();
    const nomeArquivo = (arquivo.nome || '').toLowerCase();
    return mimeType.includes('image') || /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i.test(nomeArquivo);
  }, []);

  const handleDownload = useCallback((arquivo: ClienteArquivo) => {
    window.open(`/api/cliente-arquivos/${arquivo.id}/download`, '_blank');
  }, []);

  const handleView = useCallback((arquivo: ClienteArquivo) => {
    const url = `/api/cliente-arquivos/${arquivo.id}/download?view=true`;
    const isImage = isImageFile(arquivo);
    
    setPreviewUrl(url);
    setPreviewTitle(isImage ? `${t('buttons.view')} ${t('form.fileTypePhoto')} - ${arquivo.nome}` : `${t('buttons.view')} ${t('form.fileTypeDocument')} - ${arquivo.nome}`);
    
    if (isImage) {
      setShowImagePreview(true);
    } else {
      setShowPreview(true);
    }
  }, [isImageFile, t]);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewUrl(null);
  }, []);

  const handleCloseImagePreview = useCallback(() => {
    setShowImagePreview(false);
    setPreviewUrl(null);
  }, []);

  const tableConfig = useMemo(() => ({
    data: arquivos,
    sortable: true,
    sortColumn: finalSortColumn,
    sortDirection: finalSortDirection,
    columns: [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        searchable: true,
        width: 42,
        resizable: true,
        render: (item: ClienteArquivo) => item.id
      },
      {
        key: 'nome',
        label: t('table.fileName'),
        sortable: true,
        searchable: true,
        render: (item: ClienteArquivo) => (
          <span title={item.descricao || item.nome}>{item.nome}</span>
        )
      },
      {
        key: 'tipo',
        label: t('table.fileType'),
        sortable: true,
        searchable: true,
        render: (item: ClienteArquivo) => (
          <span className={`badge ${
            item.tipo === 'documento' ? 'bg-primary' :
            item.tipo === 'foto' ? 'bg-info' :
            item.tipo === 'assinatura' ? 'bg-success' :
            'bg-secondary'
          }`}>
            {item.tipo === 'documento' ? t('fileType.document') :
             item.tipo === 'foto' ? t('fileType.photo') :
             item.tipo === 'assinatura' ? t('fileType.signature') :
             item.tipo}
          </span>
        )
      },
      {
        key: 'origem',
        label: t('table.fileOrigin'),
        sortable: true,
        searchable: true,
        render: (item: ClienteArquivo) => (
          <span className={`badge ${
            item.origem === 'manual' ? 'bg-secondary' :
            item.origem === 'assinatura_digital' ? 'bg-success' :
            'bg-info'
          }`}>
            {item.origem === 'manual' ? t('fileType.manual') :
             item.origem === 'assinatura_digital' ? t('fileType.digitalSignature') :
             t('fileType.system')}
          </span>
        )
      },
      {
        key: 'tamanho',
        label: t('table.fileSize'),
        sortable: true,
        searchable: false,
        render: (item: ClienteArquivo) => {
          if (!item.tamanho) return '-';
          const bytes = item.tamanho;
          if (bytes < 1024) return `${bytes} B`;
          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
          return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        }
      },
      {
        key: 'created_at',
        label: t('table.fileDate'),
        sortable: true,
        searchable: false,
        render: (item: ClienteArquivo) => formatDateTime(item.created_at)
      }
    ],
    bulkActions: [
      {
        key: 'new',
        label: t('actions.create'),
        variant: 'primary' as const,
        disabled: () => false,
        onClick: async () => {
          setShowAdicionarModal(true);
        }
      },
      {
        key: 'view',
        label: t('buttons.view'),
        disabled: (items: ClienteArquivo[]) => {
          if (items.length === 0) return true;
          const extensoesVisiveis = /\.(pdf|jpg|jpeg|png|gif|bmp|webp|svg|ico|mp4|webm|ogg|mov|avi|txt|csv|json|xml|html|css|js|md)$/i;
          return !items.some(item => {
            const mimeType = (item.mime_type || '').toLowerCase();
            return extensoesVisiveis.test(item.nome) || 
                   /pdf|image|video|text/.test(mimeType);
          });
        },
        onClick: async (selectedItems: ClienteArquivo[]) => {
          if (selectedItems.length > 0) {
            // Visualizar apenas o primeiro arquivo selecionado
            handleView(selectedItems[0]);
          }
        }
      },
      {
        key: 'download',
        label: t('buttons.download'),
        variant: 'primary' as const,
        disabled: (selectedItems: ClienteArquivo[]) => selectedItems.length === 0,
        onClick: async (selectedItems: ClienteArquivo[]) => {
          // Baixar todos os arquivos selecionados
          for (const item of selectedItems) {
            handleDownload(item);
          }
        }
      },
      {
        key: 'delete-selected',
        label: t('actions.delete'),
        disabled: (selectedItems: ClienteArquivo[]) => selectedItems.length === 0 || deleteMutation.isPending,
        onClick: async (selectedItems: ClienteArquivo[]) => {
          if (selectedItems.length === 0) return;
          
          const confirmed = await confirm({
            message: t('confirm.deleteFiles', { count: selectedItems.length }),
            variant: 'danger',
            title: t('confirm.deleteFilesTitle'),
            confirmText: t('actions.delete'),
            cancelText: t('actions.cancel'),
          });
          
          if (confirmed) {
            for (const item of selectedItems) {
              await deleteMutation.mutateAsync(item.id);
            }
          }
        }
      }
    ],
    searchPlaceholder: t('layout.searchPlaceholder'),
    searchFields: [
      { key: 'id', label: t('table.id') },
      { key: 'nome', label: t('form.fileName') },
      { key: 'tipo', label: t('table.fileType') },
      { key: 'origem', label: t('table.fileOrigin') }
    ],
    emptyMessage: t('empty.noFiles')
  }), [arquivos, deleteMutation, handleDownload, handleView, confirm, t, finalSortColumn, finalSortDirection]);

  if (!clienteId) {
    return (
      <div className="alert alert-info">
        {t('messages.saveClientFirst')}
      </div>
    );
  }

  return (
    <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
      <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        {/* Tabela de arquivos */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            key="cliente-arquivos-tab-table"
            title={t('tabs.files')}
            config={{ ...tableConfig, loading: isLoading }}
            onRefresh={refetch}
            onSelectionChange={setSelectedItems}
            onAudit={onAudit}
            auditEntity={auditEntity}
            onSort={finalOnSort}
          />
        </div>
      </div>

      {/* Modal de adicionar arquivo */}
      {clienteId && (
        <AdicionarArquivoModal
          show={showAdicionarModal}
          onClose={() => setShowAdicionarModal(false)}
          clienteId={clienteId}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {/* Modal de visualização de documentos (PDF, etc) */}
      <ImprimirModal
        show={showPreview}
        onClose={handleClosePreview}
        pdfUrl={previewUrl}
        title={previewTitle}
        modalId="arquivo-preview-modal"
      />

      {/* Modal de visualização de imagens com zoom */}
      <ImageViewerModal
        show={showImagePreview}
        onClose={handleCloseImagePreview}
        imageUrl={previewUrl}
        title={previewTitle}
        modalId="image-viewer-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </div>
  );
};

export default ArquivosTab;
