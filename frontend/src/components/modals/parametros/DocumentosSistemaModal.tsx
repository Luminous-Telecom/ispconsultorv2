import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../services/documentoSistemaService';
import EditarDocumentoModal from './EditarDocumentoModal';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DataTable from '../../common/DataTable';
import { Column } from '../../../types/entities';

interface DocumentosSistemaModalProps {
  show: boolean;
  onClose: () => void;
}

type TipoDocumento = 'contrato' | 'recibo' | 'carta_cobranca';

const DocumentosSistemaModal: React.FC<DocumentosSistemaModalProps> = ({ show, onClose }) => {
  const [activeTab, setActiveTab] = useState<TipoDocumento>('contrato');
  const [selectedDocumento, setSelectedDocumento] = useState<DocumentoSistema | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<DocumentoSistema[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const queryClient = useQueryClient();
  const { addNotification } = useNotificationContext();

  // Query para buscar documentos por tipo
  const { data: documentos, isLoading } = useQuery({
    queryKey: ['documentos-sistema', activeTab],
    queryFn: () => DocumentoSistemaService.getByType(activeTab),
    enabled: show,
  });

  // Mutation para deletar documento
  const deleteDocumentoMutation = useMutation({
    mutationFn: (id: number) => DocumentoSistemaService.delete(id),
    onSuccess: () => {
      addNotification('success', 'Documento excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema', activeTab] });
    },
    onError: (error: any) => {
      addNotification('error', error.message || 'Erro ao excluir documento');
    }
  });

  const handleEdit = (documento: DocumentoSistema) => {
    setSelectedDocumento(documento);
    setShowEditModal(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      deleteDocumentoMutation.mutate(id);
    }
  };

  const handleClose = () => {
    onClose();
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
  const columns: Column<DocumentoSistema>[] = [
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (item: DocumentoSistema) => (
        <div className="fw-medium">{item.nome}</div>
      )
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
      render: (item: DocumentoSistema) => (
        <div className="text-secondary">
          {item.descricao || '-'}
        </div>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      render: (item: DocumentoSistema) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (item: DocumentoSistema) => (
        <span className="text-secondary">
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </span>
      )
    }
  ];

  // Ações em massa
  const bulkActions = [
    {
      label: 'Editar',
      action: (selectedItems: DocumentoSistema[]) => {
        if (selectedItems.length > 0) {
          handleEdit(selectedItems[0]);
        }
      }
    },
    {
      label: 'Excluir',
      action: (selectedItems: DocumentoSistema[]) => {
        if (selectedItems.length > 0) {
          handleDelete(selectedItems[0].id);
        }
      }
    }
  ];

  return (
    <>
      <DraggableModal
        show={show}
        onClose={handleClose}
        title="Modelos de Documentos"
        size="xl"
        modalId="documentos-sistema-modal"
        headerActions={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleClose}
          >
            Fechar
          </button>
        }
      >
        <div className="modal-body p-2">
          {/* Abas */}
          <ul className="nav nav-tabs mb-2">
            <li className="nav-item">
              <button
                className={`nav-link py-1 px-2 small ${activeTab === 'contrato' ? 'active' : ''}`}
                onClick={() => setActiveTab('contrato')}
              >
                <i className="bi bi-file-earmark-text me-1"></i>
                Contratos
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link py-1 px-2 small ${activeTab === 'recibo' ? 'active' : ''}`}
                onClick={() => setActiveTab('recibo')}
              >
                <i className="bi bi-receipt me-1"></i>
                Recibos
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link py-1 px-2 small ${activeTab === 'carta_cobranca' ? 'active' : ''}`}
                onClick={() => setActiveTab('carta_cobranca')}
              >
                <i className="bi bi-envelope me-1"></i>
                Cartas de Cobrança
              </button>
            </li>
          </ul>

          {/* Tabela de Documentos */}
          <div className="card">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">{getTipoLabel(activeTab)} Cadastrados</small>
            </div>
            <div className="card-body p-0">
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
                bulkActions={bulkActions}
                onSelectionChange={setSelectedItems}
                searchPlaceholder={`Buscar ${getTipoLabel(activeTab).toLowerCase()}...`}
                emptyMessage={`Nenhum modelo de ${getTipoLabel(activeTab).toLowerCase()} cadastrado ainda.`}
                showHeader={false}
                actions={(item: DocumentoSistema) => (
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => handleEdit(item)}
                      title="Editar documento"
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleDelete(item.id)}
                      disabled={deleteDocumentoMutation.isPending}
                      title="Excluir documento"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      </DraggableModal>

      {/* Modal de Edição */}
      <EditarDocumentoModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        documento={selectedDocumento}
      />
    </>
  );
};

export default DocumentosSistemaModal;
