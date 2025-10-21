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
  const [showPreview, setShowPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
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

  // Limpar PDF URL quando o modal for fechado
  useEffect(() => {
    if (!show && pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [show, pdfUrl]);

  // Mutation para atualizar documento
  const updateDocumentoMutation = useMutation({
    mutationFn: (data: any) => DocumentoSistemaService.update(documento!.id, data),
    onSuccess: () => {
      addNotification('success', 'Documento salvo com sucesso');
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema'] });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      addNotification('error', error.message || 'Erro ao salvar documento');
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

  const editorRef = useRef<any>(null);

  const handleInsertVariable = (variable: string) => {
    if (editorRef.current && editorRef.current.insertVariable) {
      editorRef.current.insertVariable(variable);
    }
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
    // Limpa a URL do PDF
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    onClose();
  };

  const handlePrint = async () => {
    if (!documento) return;
    
    setIsGeneratingPdf(true);
    try {
      // Gera o PDF usando a API
      const pdfBlob = await DocumentoSistemaService.generatePdf(documento.id);
      
      // Verifica se é um Blob válido
      if (!(pdfBlob instanceof Blob)) {
        throw new Error('Resposta inválida do servidor');
      }
      
      // Cria uma URL para o PDF e abre em nova aba
      const url = window.URL.createObjectURL(pdfBlob);
      
      const newWindow = window.open(url, '_blank');
      if (newWindow) {
        newWindow.focus();
      } else {
        addNotification('warning', 'O navegador bloqueou o pop-up. Por favor, permita pop-ups para este site.');
      }

      // Libera a URL do objeto após um curto período
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

    } catch (error: any) {
      addNotification('error', error.message || 'Erro ao gerar PDF para preview');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleConfirmPrint = () => {
    if (pdfUrl) {
      // Abre o PDF em uma nova janela para impressão
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
    setShowPreview(false);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([formData.conteudo], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `${formData.nome}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!documento) return null;

  // Ações para o header do modal
  const headerActions = (
    <div className="d-flex gap-1">
                     <button
                       type="button"
                       className="btn btn-info btn-sm"
                       onClick={handlePrint}
                       title="Abrir PDF do modelo"
                       disabled={isGeneratingPdf}
                     >
                       {isGeneratingPdf ? (
                         <>
                           <span className="spinner-border spinner-border-sm me-1" style={{ width: '0.8rem', height: '0.8rem' }}></span>
                           Gerando PDF...
                         </>
                       ) : (
                         <>Abrir PDF</>
                       )}
                     </button>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={handleSubmit}
        disabled={updateDocumentoMutation.isPending}
      >
        {updateDocumentoMutation.isPending ? 'Salvando...' : 'Salvar'}
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={handleClose}
      >
        Cancelar
      </button>
    </div>
  );

  return (
    <>
      <DraggableModal
        show={show}
        onClose={handleClose}
        title={`Editar ${documento.nome}`}
        size="xl"
        headerActions={headerActions}
      >
        <div className="p-2">
          <form onSubmit={handleSubmit}>
            {/* Campos superiores em linha única */}
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label htmlFor="editar-doc-nome" className="form-label small mb-1">
                  Nome <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  id="editar-doc-nome"
                  name="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="editar-doc-descricao" className="form-label small mb-1">Descrição</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  id="editar-doc-descricao"
                  name="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Breve descrição"
                />
              </div>
            </div>

            {/* Editor de conteúdo - ocupa todo o espaço restante */}
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span id="conteudo-label" className="form-label small mb-0">
                  Conteúdo <span className="text-danger">*</span>
                </span>
                <div>
                  <label htmlFor="import-word-file" className="sr-only">Importar arquivo Word</label>
                  <input
                    ref={fileInputRef}
                    id="import-word-file"
                    name="import-word-file"
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
                      <>Importar Word</>
                    )}
                  </button>
                </div>
              </div>
              <RichTextEditor
                ref={editorRef}
                key={documento?.id}
                id="conteudo"
                name="conteudo"
                ariaLabelledBy="conteudo-label"
                value={formData.conteudo}
                onChange={(value) => setFormData(prev => ({ ...prev, conteudo: value }))}
                placeholder="Digite o conteúdo do documento..."
                height="100%"
                onInsertVariable={handleInsertVariable}
              />
            </div>
          </form>
        </div>
      </DraggableModal>

             {/* Modal de Visualização para Impressão */}
             <DraggableModal
               show={showPreview}
               onClose={() => setShowPreview(false)}
               title=""
               size="xl"
               headerActions={null}
             >
               <div style={{ 
                 height: '100%',
                 display: 'flex',
                 flexDirection: 'column',
                 padding: '0'
               }}>
                 {/* Área do documento - sem barras */}
                 <div style={{ 
                   flex: 1,
                   overflow: 'auto',
                   backgroundColor: 'white',
                   display: 'flex',
                   justifyContent: 'center',
                   alignItems: 'flex-start'
                 }}>
                  {pdfUrl ? (
                    <iframe
                      id="pdf-preview-iframe"
                      name="pdf-preview-iframe"
                      src={pdfUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        minHeight: '600px',
                        border: 'none'
                      }}
                      title="Preview do PDF"
                      aria-label="Visualização do PDF"
                    />
                   ) : (
                     <div 
                       className="document-preview"
                       style={{ 
                         padding: '20px',
                         minHeight: '100%',
                         backgroundColor: 'white',
                         width: '100%'
                       }}
                       dangerouslySetInnerHTML={{ __html: formData.conteudo }} 
                     />
                   )}
                 </div>
               </div>
             </DraggableModal>
    </>
  );
};

export default EditarDocumentoModal;
