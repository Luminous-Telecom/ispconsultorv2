import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../services/documentoSistemaService';
import RichTextEditor from '../../common/RichTextEditor';
import { useNotificationContext } from '../../../contexts/NotificationContext';

interface EditarDocumentoModalProps {
  show: boolean;
  onClose: () => void;
  documento: DocumentoSistema | null;
  onSuccess?: () => void;
}

const EditarDocumentoModal: React.FC<EditarDocumentoModalProps> = ({ show, onClose, documento, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    conteudo: '',
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { addNotification } = useNotificationContext();

  // Carregar dados do documento quando o modal abrir
  useEffect(() => {
    if (documento && show) {
      setFormData({
        nome: documento.nome,
        descricao: documento.descricao || '',
        conteudo: documento.conteudo,
      });
    }
  }, [documento, show]);

  // Mutation para atualizar documento
  const updateDocumentoMutation = useMutation({
    mutationFn: (data: any) => DocumentoSistemaService.update(documento!.id, data),
    onSuccess: () => {
      addNotification('success', 'Documento atualizado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema'] });
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    },
    onError: (error: any) => {
      addNotification('error', error.message || 'Erro ao atualizar documento');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.conteudo) {
      addNotification('error', 'Nome e conteúdo são obrigatórios');
      return;
    }
    updateDocumentoMutation.mutate(formData);
  };

  const handleReset = () => {
    if (documento) {
      setFormData({
        nome: documento.nome,
        descricao: documento.descricao || '',
        conteudo: documento.conteudo,
      });
    }
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

  if (!documento) return null;

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={`Editar ${documento.nome}`}
      size="xl"
    >
      <div className="p-2">
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
                  disabled={updateDocumentoMutation.isPending}
                >
                  {updateDocumentoMutation.isPending ? 'Salvando...' : 'Atualizar'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleReset}
                >
                  Cancelar
                </button>
              </div>
            </div>
            <div className="col-md-8">
              <div className="mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="conteudo" className="form-label small mb-0">
                    Conteúdo <span className="text-danger">*</span>
                  </label>
                  <div>
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
    </DraggableModal>
  );
};

export default EditarDocumentoModal;
