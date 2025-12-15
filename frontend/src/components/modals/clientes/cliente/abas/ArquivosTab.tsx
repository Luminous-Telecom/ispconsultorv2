import React, { useState, useMemo, useCallback } from 'react';
import { useClienteArquivos } from '@/hooks/useClienteArquivos';
import { ClienteArquivo } from '@/services/clienteArquivoService';
import { formatDateTime } from '@/utils/formatters';
import Table from '@/components/tables/Table';
import { API_CONFIG } from '@/config/api';
import ImprimirModal from '@/components/common/ImprimirModal';
import AdicionarArquivoModal from './AdicionarArquivoModal';

interface ArquivosTabProps {
  clienteId?: number | null;
}

const ArquivosTab: React.FC<ArquivosTabProps> = ({ clienteId }) => {
  const [_selectedItems, setSelectedItems] = useState<ClienteArquivo[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showAdicionarModal, setShowAdicionarModal] = useState(false);

  const { arquivos, isLoading, refetch, deleteMutation } = useClienteArquivos({
    clienteId: clienteId || undefined
  });

  const handleDownload = useCallback((arquivo: ClienteArquivo) => {
    const baseURL = API_CONFIG.BASE_URL;
    const url = `${baseURL}/cliente-arquivos/${arquivo.id}/download`;
    window.open(url, '_blank');
  }, []);

  const handleView = useCallback((arquivo: ClienteArquivo) => {
    const baseURL = API_CONFIG.BASE_URL;
    // Adicionar query param view=true para permitir exibição em iframe
    const url = `${baseURL}/cliente-arquivos/${arquivo.id}/download?view=true`;
    
    // Verificar se é imagem para abrir em nova aba
    const mimeType = (arquivo.mime_type || '').toLowerCase();
    const nomeArquivo = (arquivo.nome || '').toLowerCase();
    const isImage = mimeType.includes('image') || /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i.test(nomeArquivo);
    
    if (isImage) {
      // Para imagens, abrir em nova aba
      window.open(url, '_blank');
    } else {
      // Para outros arquivos (PDF, etc), abrir no modal
      setPreviewUrl(url);
      setShowPreview(true);
    }
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewUrl(null);
  }, []);

  const tableConfig = useMemo(() => ({
    data: arquivos,
    columns: [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        searchable: true,
        render: (item: ClienteArquivo) => item.id
      },
      {
        key: 'nome',
        label: 'Nome',
        sortable: true,
        searchable: true,
        render: (item: ClienteArquivo) => (
          <span title={item.descricao || item.nome}>{item.nome}</span>
        )
      },
      {
        key: 'tipo',
        label: 'Tipo',
        sortable: true,
        searchable: true,
        render: (item: ClienteArquivo) => (
          <span className={`badge ${
            item.tipo === 'documento' ? 'bg-primary' :
            item.tipo === 'foto' ? 'bg-info' :
            item.tipo === 'assinatura' ? 'bg-success' :
            'bg-secondary'
          }`}>
            {item.tipo}
          </span>
        )
      },
      {
        key: 'origem',
        label: 'Origem',
        sortable: true,
        searchable: true,
        render: (item: ClienteArquivo) => (
          <span className={`badge ${
            item.origem === 'manual' ? 'bg-secondary' :
            item.origem === 'assinatura_digital' ? 'bg-success' :
            'bg-info'
          }`}>
            {item.origem === 'manual' ? 'Manual' :
             item.origem === 'assinatura_digital' ? 'Assinatura Digital' :
             'Sistema'}
          </span>
        )
      },
      {
        key: 'tamanho',
        label: 'Tamanho',
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
        label: 'Data',
        sortable: true,
        searchable: false,
        render: (item: ClienteArquivo) => formatDateTime(item.created_at)
      }
    ],
    bulkActions: [
      {
        key: 'new',
        label: 'Novo',
        variant: 'primary' as const,
        disabled: () => false,
        onClick: async () => {
          setShowAdicionarModal(true);
        }
      },
      {
        key: 'view',
        label: 'Visualizar',
        variant: 'info' as const,
        disabled: (selectedItems: ClienteArquivo[]) => {
          if (selectedItems.length === 0) return true;
          // Verificar se pelo menos um arquivo pode ser visualizado
          return !selectedItems.some(item => {
            const mimeType = (item.mime_type || '').toLowerCase();
            const nomeArquivo = (item.nome || '').toLowerCase();
            const extensoesVisiveis = [
              '.pdf', 
              '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico',
              '.mp4', '.webm', '.ogg', '.mov', '.avi',
              '.txt', '.csv', '.json', '.xml', '.html', '.css', '.js', '.md'
            ];
            const temExtensaoVisivel = extensoesVisiveis.some(ext => nomeArquivo.endsWith(ext));
            const isPdf = mimeType.includes('pdf') || nomeArquivo.endsWith('.pdf');
            const isImage = mimeType.includes('image') || /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i.test(nomeArquivo);
            const isVideo = mimeType.includes('video') || /\.(mp4|webm|ogg|mov|avi)$/i.test(nomeArquivo);
            const isText = mimeType.includes('text') || 
                          mimeType.includes('csv') || 
                          mimeType.includes('json') || 
                          mimeType.includes('xml') || 
                          mimeType.includes('html') ||
                          /\.(txt|csv|json|xml|html|css|js|md)$/i.test(nomeArquivo);
            return isPdf || isImage || isVideo || isText || temExtensaoVisivel;
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
        label: 'Baixar',
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
        label: 'Excluir',
        variant: 'danger' as const,
        disabled: (selectedItems: ClienteArquivo[]) => selectedItems.length === 0 || deleteMutation.isPending,
        onClick: async (selectedItems: ClienteArquivo[]) => {
          if (window.confirm(`Tem certeza que deseja deletar ${selectedItems.length} arquivo(s)?`)) {
            for (const item of selectedItems) {
              await deleteMutation.mutateAsync(item.id);
            }
          }
        }
      }
    ],
    searchPlaceholder: 'Buscar arquivos...',
    emptyMessage: 'Nenhum arquivo encontrado'
  }), [arquivos, deleteMutation, handleDownload, handleView, setShowAdicionarModal]);

  if (!clienteId) {
    return (
      <div className="alert alert-info">
        Salve o cliente primeiro para adicionar arquivos.
      </div>
    );
  }

  return (
    <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Tabela de arquivos */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            config={{ ...tableConfig, loading: isLoading }}
            onRefresh={refetch}
            onSelectionChange={setSelectedItems}
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

      {/* Modal de visualização */}
      <ImprimirModal
        show={showPreview}
        onClose={handleClosePreview}
        pdfUrl={previewUrl}
        title="Visualizar Documento"
        modalId="arquivo-preview-modal"
      />
    </div>
  );
};

export default ArquivosTab;
