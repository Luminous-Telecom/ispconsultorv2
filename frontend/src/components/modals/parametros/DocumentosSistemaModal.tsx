import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../services/documentoSistemaService';
import ModeloReciboService, { ModeloRecibo } from '../../../services/modeloReciboService';
import ModeloCartaService, { ModeloCarta } from '../../../services/modeloCartaService';
import EditarDocumentoModal from './EditarDocumentoModal';
import CriarDocumentoModal from './CriarDocumentoModal';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DataTable from '../../common/DataTable';
import ModalHeaderActions from '../../common/ModalHeaderActions';
import { Column } from '../../../types/entities';

interface DocumentosSistemaModalProps {
  show: boolean;
  onClose: () => void;
}

type TipoDocumento = 'contrato' | 'recibo' | 'carta_cobranca';

type DocumentoUnion = DocumentoSistema | ModeloRecibo | ModeloCarta;

const DocumentosSistemaModal: React.FC<DocumentosSistemaModalProps> = ({ show, onClose }) => {
  const [activeTab, setActiveTab] = useState<TipoDocumento>('contrato');
  const [selectedDocumento, setSelectedDocumento] = useState<DocumentoUnion | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      try {
        await deleteDocumentoMutation.mutateAsync(documentoId);
        refetch();
      } catch (error) {
        // Erro já é tratado pelo onError da mutation
      }
    }
  };

  const handleTabChange = (newTab: TipoDocumento) => {
    setActiveTab(newTab);
    // Limpar seleções quando mudar de aba
    setSelectedDocumentoId(null);
    setSelectedItems([]);
    setShowEditModal(false);
    setShowCreateModal(false);
  };

  const getTipoLabel = (tipo: TipoDocumento) => {
    const labels = {
      contrato: 'Contratos',
      recibo: 'Recibos',
      carta_cobranca: 'Cartas de Cobrança',
    };
    return labels[tipo];
  };

  // Definir colunas da tabela
  const columns: Column<DocumentoUnion>[] = [
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
        setShowCreateModal(true);
      }
    },
    {
      label: 'Editar',
      action: (selectedItems: DocumentoUnion[]) => {
        if (selectedItems.length > 0) {
          setSelectedDocumentoId(selectedItems[0].id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: 'Deletar',
      variant: 'primary' as const,
      action: (selectedItems: DocumentoUnion[]) => {
        if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja deletar ${selectedItems.length} documento(s)?`)) {
          selectedItems.forEach(item => handleDelete(item.id));
        }
      }
    }
  ];

  // Ações para o header do modal usando componente reutilizável
  const headerActions = (
    <ModalHeaderActions
      bulkActions={bulkActions}
      selectedItems={selectedItems}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={`Buscar ${getTipoLabel(activeTab).toLowerCase()}...`}
      limit={limit}
      onLimitChange={setLimit}
      pagination={{
        from: 1,
        to: documentos?.data?.length || 0,
        total: documentos?.data?.length || 0,
        current_page: 1,
        last_page: 1
      }}
      onPageChange={setPage}
      onRefresh={() => refetch()}
      idPrefix="documentos-sistema"
    />
  );

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Modelos de Documentos"
        size="lg"
        modalId="documentos-sistema-modal"
        headerActions={headerActions}
      >
        <div>
          {/* Abas */}
          <ul className="nav nav-tabs mb-2">
            <li className="nav-item">
              <button
                className={`nav-link py-1 px-2 small ${activeTab === 'contrato' ? 'active' : ''}`}
                onClick={() => handleTabChange('contrato')}
              >
                <i className="bi bi-file-earmark-text me-1"></i>
                Contratos
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link py-1 px-2 small ${activeTab === 'recibo' ? 'active' : ''}`}
                onClick={() => handleTabChange('recibo')}
              >
                <i className="bi bi-receipt me-1"></i>
                Recibos
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link py-1 px-2 small ${activeTab === 'carta_cobranca' ? 'active' : ''}`}
                onClick={() => handleTabChange('carta_cobranca')}
              >
                <i className="bi bi-envelope me-1"></i>
                Cartas de Cobrança
              </button>
            </li>
          </ul>

          <DataTable
            data={documentos?.data || []}
            columns={columns}
            isLoading={isLoading}
            pagination={{
              from: 1,
              to: documentos?.data?.length || 0,
              total: documentos?.data?.length || 0,
              current_page: 1,
              last_page: 1
            }}
            limit={limit}
            setLimit={setLimit}
            setPage={setPage}
            onSort={(column: string, direction: 'asc' | 'desc') => {
              setSortColumn(column);
              setSortDirection(direction);
            }}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            bulkActions={bulkActions}
            onSelectionChange={setSelectedItems}
            searchPlaceholder={`Buscar ${getTipoLabel(activeTab).toLowerCase()}...`}
            onSearch={setSearch}
            emptyMessage={`Nenhum modelo de ${getTipoLabel(activeTab).toLowerCase()} cadastrado ainda.`}
            showHeader={false}
          />
        </div>

        {/* Modal de Criação */}
        <CriarDocumentoModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch();
            setShowCreateModal(false);
          }}
          tipo={activeTab}
        />

        {/* Modal de Edição */}
        <EditarDocumentoModal
          show={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedDocumentoId(null);
          }}
          documento={documentos?.data?.find(d => d.id === selectedDocumentoId) || null}
          tipo={activeTab}
          onSuccess={() => {
            refetch();
            // Não fechar o modal automaticamente
          }}
        />
      </DraggableModal>
    </>
  );
};

export default DocumentosSistemaModal;
