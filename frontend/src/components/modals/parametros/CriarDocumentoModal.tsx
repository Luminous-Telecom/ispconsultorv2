import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../services/documentoSistemaService';
import RichTextEditor from '../../common/RichTextEditor';
import { useNotificationContext } from '../../../contexts/NotificationContext';

interface CriarDocumentoModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tipo: 'contrato' | 'recibo' | 'carta_cobranca';
}

const CriarDocumentoModal: React.FC<CriarDocumentoModalProps> = ({ show, onClose, onSuccess, tipo }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    conteudo: '',
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { addNotification } = useNotificationContext();

  // Mutation para criar documento
  const createDocumentoMutation = useMutation({
    mutationFn: (data: any) => DocumentoSistemaService.create({ ...data, tipo }),
    onSuccess: () => {
      addNotification('success', 'Documento criado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema'] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      addNotification('error', error.message || 'Erro ao criar documento');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.conteudo) {
      addNotification('error', 'Nome e conteúdo são obrigatórios');
      return;
    }
    createDocumentoMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData({
      nome: '',
      descricao: '',
      conteudo: '',
    });
  };

  const handleInsertVariable = (variable: string) => {
    // Esta função será chamada pelo RichTextEditor
    console.log(`Variável ${variable} inserida`);
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

  const getTipoLabel = (tipo: string) => {
    const labels = {
      contrato: 'Contrato',
      recibo: 'Recibo',
      carta_cobranca: 'Carta de Cobrança',
    };
    return labels[tipo as keyof typeof labels];
  };

  return (
    <DraggableModal 
      show={show} 
      onClose={handleClose} 
      title={`Novo ${getTipoLabel(tipo)}`} 
      size="xl" 
      modalId={`criar-documento-${tipo}-modal`}
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
                  placeholder={`Ex: ${getTipoLabel(tipo)} Padrão`}
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
                    onClick={() => handleInsertVariable('cliente_nome')}
                    style={{ fontSize: '0.7rem' }}
                  >
                    Nome
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm py-0 px-1"
                    onClick={() => handleInsertVariable('cliente_cpf')}
                    style={{ fontSize: '0.7rem' }}
                  >
                    CPF
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm py-0 px-1"
                    onClick={() => handleInsertVariable('valor')}
                    style={{ fontSize: '0.7rem' }}
                  >
                    Valor
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm py-0 px-1"
                    onClick={() => handleInsertVariable('data')}
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
                  disabled={createDocumentoMutation.isPending}
                >
                  {createDocumentoMutation.isPending ? 'Criando...' : 'Criar'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleReset}
                >
                  Limpar
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
                  key={`criar-${tipo}`}
                  value={formData.conteudo}
                  onChange={(value) => setFormData(prev => ({ ...prev, conteudo: value }))}
                  placeholder="Digite o conteúdo do documento..."
                  height="400px"
                  onInsertVariable={handleInsertVariable}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default CriarDocumentoModal;
