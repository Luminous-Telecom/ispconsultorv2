import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../services/documentoSistemaService';

interface DocumentosSistemaModalProps {
  show: boolean;
  onClose: () => void;
}

type TipoDocumento = 'contrato' | 'recibo' | 'carta_cobranca';

const DocumentosSistemaModal: React.FC<DocumentosSistemaModalProps> = ({ show, onClose }) => {
  const [activeTab, setActiveTab] = useState<TipoDocumento>('contrato');
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    conteudo: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  // Query para buscar documentos por tipo
  const { data: documentos, isLoading } = useQuery({
    queryKey: ['documentos-sistema', activeTab],
    queryFn: () => DocumentoSistemaService.getByType(activeTab),
    enabled: show,
  });

  // Mutation para criar/atualizar documento
  const saveDocumentoMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingId) {
        return DocumentoSistemaService.update(editingId, data);
      }
      return DocumentoSistemaService.create({ ...data, tipo: activeTab });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema', activeTab] });
      handleReset();
    },
  });

  // Mutation para deletar documento
  const deleteDocumentoMutation = useMutation({
    mutationFn: (id: number) => DocumentoSistemaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema', activeTab] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveDocumentoMutation.mutate(formData);
  };

  const handleEdit = (documento: DocumentoSistema) => {
    setEditingId(documento.id);
    setFormData({
      nome: documento.nome,
      descricao: documento.descricao || '',
      conteudo: documento.conteudo,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este documento?')) {
      deleteDocumentoMutation.mutate(id);
    }
  };

  const handleReset = () => {
    setFormData({
      nome: '',
      descricao: '',
      conteudo: '',
    });
    setEditingId(null);
  };

  const handleClose = () => {
    handleReset();
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
      <div className="modal-body">
        {/* Abas */}
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'contrato' ? 'active' : ''}`}
              onClick={() => setActiveTab('contrato')}
            >
              <i className="bi bi-file-earmark-text me-2"></i>
              Modelos de Contrato
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'recibo' ? 'active' : ''}`}
              onClick={() => setActiveTab('recibo')}
            >
              <i className="bi bi-receipt me-2"></i>
              Modelos de Recibo
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'carta_cobranca' ? 'active' : ''}`}
              onClick={() => setActiveTab('carta_cobranca')}
            >
              <i className="bi bi-envelope me-2"></i>
              Modelos de Carta de Cobrança
            </button>
          </li>
        </ul>

        <div className="row">
          {/* Formulário */}
          <div className="col-md-5">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">
                  {editingId ? 'Editar' : 'Novo'} {getTipoLabel(activeTab).slice(0, -1)}
                </h6>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="nome" className="form-label">
                      Nome do Modelo <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder={`Ex: ${activeTab === 'contrato' ? 'Contrato Padrão' : activeTab === 'recibo' ? 'Recibo de Pagamento' : 'Carta de Cobrança Padrão'}`}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="descricao" className="form-label">Descrição</label>
                    <input
                      type="text"
                      className="form-control"
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Breve descrição do modelo"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="conteudo" className="form-label">
                      Conteúdo do Modelo <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      id="conteudo"
                      rows={12}
                      value={formData.conteudo}
                      onChange={(e) => setFormData(prev => ({ ...prev, conteudo: e.target.value }))}
                      placeholder="Conteúdo HTML do documento..."
                      required
                    />
                    <small className="form-text text-muted">
                      Use variáveis como: {'{'}cliente_nome{'}'}, {'{'}cliente_cpf{'}'}, {'{'}valor{'}'}, {'{'}data{'}'}
                    </small>
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saveDocumentoMutation.isPending}
                    >
                      {saveDocumentoMutation.isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleReset}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Lista de Documentos */}
          <div className="col-md-7">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">{getTipoLabel(activeTab)} Cadastrados</h6>
              </div>
              <div className="card-body">
                {isLoading ? (
                  <div className="text-center py-3">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Carregando...</span>
                    </div>
                  </div>
                ) : documentos?.data?.length === 0 ? (
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    Nenhum modelo cadastrado ainda.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Descrição</th>
                          <th>Status</th>
                          <th className="text-end">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documentos?.data?.map((documento: DocumentoSistema) => (
                          <tr key={documento.id}>
                            <td>{documento.nome}</td>
                            <td>{documento.descricao || '-'}</td>
                            <td>
                              <span className={`badge ${documento.ativo ? 'bg-success' : 'bg-secondary'}`}>
                                {documento.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => handleEdit(documento)}
                                title="Editar"
                              >
                                Editar
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(documento.id)}
                                disabled={deleteDocumentoMutation.isPending}
                                title="Excluir"
                              >
                                Excluir
                              </button>
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
        </div>
      </div>
    </DraggableModal>
  );
};

export default DocumentosSistemaModal;
