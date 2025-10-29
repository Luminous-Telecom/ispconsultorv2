import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../services/documentoSistemaService';
import ModeloReciboService, { ModeloRecibo } from '../../../services/modeloReciboService';
import ModeloCartaService, { ModeloCarta } from '../../../services/modeloCartaService';
import ModeloTermoService, { ModeloTermo } from '../../../services/modeloTermoService';
import DocumentoModal from './DocumentoModal';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import Table from '../../tables/Table';
import { TableConfig } from '../../tables/types';

interface DocumentosSistemaModalProps {
  show: boolean;
  onClose: () => void;
}

type TipoDocumento = 'contrato' | 'recibo' | 'carta_cobranca' | 'termo';

type DocumentoUnion = DocumentoSistema | ModeloRecibo | ModeloCarta | ModeloTermo;

const DocumentosSistemaModal: React.FC<DocumentosSistemaModalProps> = ({ show, onClose }) => {
  const [activeTab, setActiveTab] = useState<TipoDocumento>('contrato');
  const [selectedDocumento, setSelectedDocumento] = useState<DocumentoUnion | null>(null);
  const [showDocumentoModal, setShowDocumentoModal] = useState(false);
  const [documentoModalMode, setDocumentoModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDocumentoId, setSelectedDocumentoId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<DocumentoUnion[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const queryClient = useQueryClient();
  const { addNotification } = useNotificationContext();

  // Query para buscar documentos por tipo
  const { data: documentos, isLoading, refetch } = useQuery({
    queryKey: ['documentos-sistema', activeTab],
    queryFn: async () => {
      switch (activeTab) {
        case 'contrato':
          return DocumentoSistemaService.getByType('contrato');
        case 'recibo':
          return ModeloReciboService.list();
        case 'carta_cobranca':
          return ModeloCartaService.list();
        case 'termo':
          return ModeloTermoService.list();
        default:
          return DocumentoSistemaService.getByType('contrato');
      }
    },
    enabled: show,
  });

  // Mutation para deletar documento
  const deleteDocumentoMutation = useMutation({
    mutationFn: async (id: number) => {
      switch (activeTab) {
        case 'contrato':
          return DocumentoSistemaService.delete(id);
        case 'recibo':
          return ModeloReciboService.delete(id);
        case 'carta_cobranca':
          return ModeloCartaService.delete(id);
        case 'termo':
          return ModeloTermoService.delete(id);
        default:
          return DocumentoSistemaService.delete(id);
      }
    },
    onSuccess: () => {
      addNotification('success', 'Documento excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema', activeTab] });
    },
    onError: (error: any) => {
      addNotification('error', error.message || 'Erro ao excluir documento');
    }
  });

  const handleDelete = async (documentoId: number) => {
    try {
      await deleteDocumentoMutation.mutateAsync(documentoId);
      refetch();
    } catch (error) {
      // Erro já é tratado pelo onError da mutation
    }
  };

  const handleTabChange = (newTab: TipoDocumento) => {
    setActiveTab(newTab);
    // Limpar seleções quando mudar de aba
    setSelectedDocumentoId(null);
    setSelectedItems([]);
    setShowDocumentoModal(false);
  };

  const getTipoLabel = (tipo: TipoDocumento) => {
    const labels = {
      contrato: 'Contratos',
      recibo: 'Recibos',
      carta_cobranca: 'Cartas de Cobrança',
      termo: 'Termos',
    };
    return labels[tipo];
  };

  // Definir colunas da tabela
  const columns: TableConfig<DocumentoUnion>['columns'] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (item: DocumentoUnion) => (
        <div>{item.id}</div>
      )
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (item: DocumentoUnion) => (
        <div className="fw-medium">{item.nome}</div>
      )
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
      render: (item: DocumentoUnion) => (
        <div className="text-secondary">
          {item.descricao || '-'}
        </div>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      render: (item: DocumentoUnion) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (item: DocumentoUnion) => (
        <span className="text-secondary">
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </span>
      )
    }
  ];

  // Ações em massa
  const bulkActions = [
    {
      label: 'Novo',
      variant: 'primary' as const,
      action: () => {
        setDocumentoModalMode('create');
        setSelectedDocumentoId(null);
        setShowDocumentoModal(true);
      }
    },
    {
      label: 'Editar',
      action: (selectedItems: DocumentoUnion[]) => {
        if (selectedItems.length === 1) {
          setDocumentoModalMode('edit');
          setSelectedDocumentoId(selectedItems[0].id);
          setShowDocumentoModal(true);
        }
      }
    },
    {
      label: 'Deletar',
      variant: 'primary' as const,
      action: async (selectedItems: DocumentoUnion[]) => {
        if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja deletar ${selectedItems.length} documento(s)?`)) {
          try {
            // Deletar todos os itens selecionados sem confirmação adicional
            await Promise.all(selectedItems.map(item => deleteDocumentoMutation.mutateAsync(item.id)));
            refetch();
          } catch (error) {
            // Erro já é tratado pelo onError da mutation
          }
        }
      }
    }
  ];

  // Removido headerActions - botões agora ficam apenas na div interna do Table

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Modelos de Documentos"
        size="xl"
        modalId="documentos-sistema-modal"
      >
        <div style={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Navegação por Abas - Fixa */}
          <ul className="nav nav-tabs" role="tablist" style={{ flexShrink: 0, marginBottom: 0, marginTop: '1rem', marginLeft: '1rem', marginRight: '1rem' }}>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'contrato' ? 'active' : ''}`}
                onClick={() => handleTabChange('contrato')}
                type="button"
              >
                <i className="bi bi-file-earmark-text me-2"></i>
                Contratos
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'recibo' ? 'active' : ''}`}
                onClick={() => handleTabChange('recibo')}
                type="button"
              >
                <i className="bi bi-receipt me-2"></i>
                Recibos
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'carta_cobranca' ? 'active' : ''}`}
                onClick={() => handleTabChange('carta_cobranca')}
                type="button"
              >
                <i className="bi bi-envelope me-2"></i>
                Cartas de Cobrança
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'termo' ? 'active' : ''}`}
                onClick={() => handleTabChange('termo')}
                type="button"
              >
                <i className="bi bi-file-text me-2"></i>
                Termos
              </button>
            </li>
          </ul>

          {/* Conteúdo das Abas */}
          <div 
            className="tab-content" 
            style={{ 
              flex: 1, 
              overflow: 'hidden', 
              padding: 0, 
              minHeight: 0 
            }}
          >
            <Table
            config={{
              columns,
              data: documentos?.data as DocumentoUnion[] || [],
              loading: isLoading,
              searchable: true,
              searchPlaceholder: `Buscar ${getTipoLabel(activeTab).toLowerCase()}...`,
              sortable: true,
              striped: true,
              hover: true,
              responsive: true,
              bulkActions: bulkActions.map(action => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                variant: action.variant,
                onClick: action.action,
                ...('disabled' in action && { disabled: action.disabled as boolean | ((selectedItems: DocumentoUnion[]) => boolean) })
              })),
              emptyMessage: `Nenhum modelo de ${getTipoLabel(activeTab).toLowerCase()} cadastrado ainda.`,
              className: 'no-padding'
            }}
            tableId={`documentos-${activeTab}`}
            onSelectionChange={setSelectedItems}
            onSort={(column: string, direction: 'asc' | 'desc') => {
              setSortColumn(column);
              setSortDirection(direction);
            }}
            onSearch={setSearch}
            onRefresh={refetch}
          />
          </div>
        </div>

        {/* Modal Unificado */}
        <DocumentoModal
          show={showDocumentoModal}
          onClose={() => {
            setShowDocumentoModal(false);
            setSelectedDocumentoId(null);
          }}
          documento={documentoModalMode === 'edit' ? (documentos?.data as DocumentoUnion[])?.find((d: DocumentoUnion) => d.id === selectedDocumentoId) || null : null}
          tipo={activeTab}
          onSuccess={() => {
            refetch();
          }}
        />
      </DraggableModal>
    </>
  );
};

export default DocumentosSistemaModal;
