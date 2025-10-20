import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../services/documentoSistemaService';
import RichTextEditor from '../../common/RichTextEditor';
import { useNotificationContext } from '../../../contexts/NotificationContext';

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
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { addNotification } = useNotificationContext();

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
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
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

  const insertVariable = (variable: string) => {
    const variableText = `{${variable}}`;
    document.execCommand('insertText', false, variableText);
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      addNotification('error', 'Apenas arquivos .docx são permitidos');
      return;
    }

    setIsImporting(true);
    try {
      const result = await DocumentoSistemaService.convertWordToHtml(file);
      setFormData(prev => ({ ...prev, conteudo: result.data.html }));
      addNotification('success', 'Arquivo importado com sucesso');
    } catch (error: any) {
      addNotification('error', error.message || 'Erro ao importar arquivo');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

        <div className="row g-2">
          {/* Formulário */}
          <div className="col-md-10">
            <div className="card">
              <div className="card-header py-1 px-2">
                <div className="row align-items-center">
                  <div className="col">
                    <small className="fw-bold mb-0">
                      {editingId ? 'Editar' : 'Novo'} {getTipoLabel(activeTab).slice(0, -1)}
                    </small>
                  </div>
                  <div className="col-auto">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx"
                      onChange={handleFileImport}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-info btn-sm py-0 px-1"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImporting}
                      title="Importar de Word (.docx)"
                      style={{ fontSize: '0.7rem' }}
                    >
                      {isImporting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" style={{ width: '0.6rem', height: '0.6rem' }}></span>
                          Importando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-file-word me-1"></i>
                          Importar Word
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body p-2">
                <form onSubmit={handleSubmit}>
                  <div className="row g-2">
                    <div className="col-md-4">
                      <div className="mb-2">
                        <label htmlFor="nome" className="form-label small mb-1">
                          Nome <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          id="nome"
                          value={formData.nome}
                          onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                          placeholder={`Ex: ${activeTab === 'contrato' ? 'Contrato Padrão' : activeTab === 'recibo' ? 'Recibo de Pagamento' : 'Carta de Cobrança Padrão'}`}
                          required
                        />
                      </div>

                      <div className="mb-2">
                        <label htmlFor="descricao" className="form-label small mb-1">Descrição</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          id="descricao"
                          value={formData.descricao}
                          onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                          placeholder="Breve descrição"
                        />
                      </div>

                      <div className="mb-1">
                        <small className="text-secondary me-2" style={{ fontSize: '0.7rem' }}>Inserir variável:</small>
                        <div className="d-flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm py-0 px-1"
                            onClick={() => insertVariable('cliente_nome')}
                            style={{ fontSize: '0.7rem' }}
                          >
                            Nome
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm py-0 px-1"
                            onClick={() => insertVariable('cliente_cpf')}
                            style={{ fontSize: '0.7rem' }}
                          >
                            CPF
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm py-0 px-1"
                            onClick={() => insertVariable('valor')}
                            style={{ fontSize: '0.7rem' }}
                          >
                            Valor
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm py-0 px-1"
                            onClick={() => insertVariable('data')}
                            style={{ fontSize: '0.7rem' }}
                          >
                            Data
                          </button>
                        </div>
                      </div>

                      <div className="d-flex gap-1">
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm"
                          disabled={saveDocumentoMutation.isPending}
                        >
                          {saveDocumentoMutation.isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
                        </button>
                        {editingId && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleReset}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="col-md-8">
                      <div className="mb-2">
                        <label htmlFor="conteudo" className="form-label small mb-1">
                          Conteúdo <span className="text-danger">*</span>
                        </label>
                        <RichTextEditor
                          value={formData.conteudo}
                          onChange={(value) => setFormData(prev => ({ ...prev, conteudo: value }))}
                          placeholder="Digite o conteúdo do documento..."
                          height="400px"
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Lista de Documentos */}
          <div className="col-md-2">
            <div className="card">
              <div className="card-header py-1 px-2">
                <small className="fw-bold mb-0">Modelos</small>
              </div>
              <div className="card-body p-1" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                {isLoading ? (
                  <div className="text-center py-2">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Carregando...</span>
                    </div>
                  </div>
                ) : documentos?.data?.length === 0 ? (
                  <div className="alert alert-info py-1 mb-0" style={{ fontSize: '0.7rem' }}>
                    <i className="bi bi-info-circle me-1"></i>
                    Nenhum modelo cadastrado.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-1">
                    {documentos?.data?.map((documento: DocumentoSistema) => (
                      <div key={documento.id} className="border rounded p-1" style={{ fontSize: '0.7rem' }}>
                        <div className="fw-bold text-truncate" title={documento.nome}>
                          {documento.nome}
                        </div>
                        {documento.descricao && (
                          <div className="text-secondary text-truncate" title={documento.descricao}>
                            {documento.descricao}
                          </div>
                        )}
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className={`badge ${documento.ativo ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.6rem' }}>
                            {documento.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-outline-primary btn-sm py-0 px-1"
                              onClick={() => handleEdit(documento)}
                              title="Editar"
                              style={{ fontSize: '0.6rem' }}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm py-0 px-1"
                              onClick={() => handleDelete(documento.id)}
                              disabled={deleteDocumentoMutation.isPending}
                              title="Excluir"
                              style={{ fontSize: '0.6rem' }}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
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
