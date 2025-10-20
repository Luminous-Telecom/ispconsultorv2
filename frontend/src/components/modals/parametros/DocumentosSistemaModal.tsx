import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../services/documentoSistemaService';
import EditarDocumentoModal from './EditarDocumentoModal';
import { useNotificationContext } from '../../../contexts/NotificationContext';

interface DocumentosSistemaModalProps {
  show: boolean;
  onClose: () => void;
}

type TipoDocumento = 'contrato' | 'recibo' | 'carta_cobranca';

const DocumentosSistemaModal: React.FC<DocumentosSistemaModalProps> = ({ show, onClose }) => {
  const [activeTab, setActiveTab] = useState<TipoDocumento>('contrato');
  const [selectedDocumento, setSelectedDocumento] = useState<DocumentoSistema | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

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
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                </div>
              ) : documentos?.data?.length === 0 ? (
                <div className="alert alert-info m-2">
                  <i className="bi bi-info-circle me-2"></i>
                  Nenhum modelo de {getTipoLabel(activeTab).toLowerCase()} cadastrado ainda.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-sm mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="small">Nome</th>
                        <th className="small">Descrição</th>
                        <th className="small">Status</th>
                        <th className="small">Criado em</th>
                        <th className="small text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentos?.data?.map((documento: DocumentoSistema) => (
                        <tr key={documento.id}>
                          <td className="small">
                            <div className="fw-medium">{documento.nome}</div>
                          </td>
                          <td className="small">
                            <div className="text-secondary">
                              {documento.descricao || '-'}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${documento.ativo ? 'bg-success' : 'bg-secondary'}`}>
                              {documento.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="small text-secondary">
                            {new Date(documento.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="text-center">
                            <div className="btn-group btn-group-sm" role="group">
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => handleEdit(documento)}
                                title="Editar documento"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => handleDelete(documento.id)}
                                disabled={deleteDocumentoMutation.isPending}
                                title="Excluir documento"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
