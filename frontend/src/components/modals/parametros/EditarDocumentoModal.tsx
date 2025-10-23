import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import ImprimirModal from '../../common/ImprimirModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../services/documentoSistemaService';
import ModeloReciboService, { ModeloRecibo } from '../../../services/modeloReciboService';
import ModeloCartaService, { ModeloCarta } from '../../../services/modeloCartaService';
import RichTextEditor from '../../common/RichTextEditor';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { ClienteService } from '../../../services/clienteService';

type DocumentoUnion = DocumentoSistema | ModeloRecibo | ModeloCarta;

interface EditarDocumentoModalProps {
  show: boolean;
  onClose: () => void;
  documento: DocumentoUnion | null;
  tipo: 'contrato' | 'recibo' | 'carta_cobranca';
  onSuccess?: () => void;
}

const EditarDocumentoModal: React.FC<EditarDocumentoModalProps> = ({ show, onClose, documento, tipo, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    conteudo: '',
    conteudo_contrato: '',
    conteudo_adesao: '',
    conteudo_permanencia: '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [clienteTesteId, setClienteTesteId] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'contrato' | 'adesao' | 'permanencia'>('contrato');
  const [openImprimirDropdown, setOpenImprimirDropdown] = useState(false);

  const queryClient = useQueryClient();
  const { addNotification} = useNotificationContext();

  // Buscar lista de clientes para teste
  const { data: clientesData } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => ClienteService.list({ limit: 100 })
  });

  // Carregar dados do documento quando o modal abrir
  useEffect(() => {
    if (documento && show) {
      // Se for contrato, buscar modelos específicos das tabelas separadas
      if (tipo === 'contrato') {
        DocumentoSistemaService.getModelosByModeloContrato(documento.id)
          .then(response => {
            if (response.success) {
              setFormData({
                nome: documento.nome,
                descricao: documento.descricao || '',
                conteudo: documento.conteudo,
                conteudo_contrato: response.data.modelo_contrato_conteudo || '',
                conteudo_adesao: response.data.modelo_termo_adesao || '',
                conteudo_permanencia: response.data.modelo_contrato_permanencia || '',
              });
            } else {
              // Fallback para dados padrão
              setFormData({
                nome: documento.nome,
                descricao: documento.descricao || '',
                conteudo: documento.conteudo,
                conteudo_contrato: documento.conteudo,
                conteudo_adesao: '',
                conteudo_permanencia: '',
              });
            }
          })
          .catch(() => {
            // Fallback para dados padrão em caso de erro
            setFormData({
              nome: documento.nome,
              descricao: documento.descricao || '',
              conteudo: documento.conteudo,
              conteudo_contrato: documento.conteudo,
              conteudo_adesao: '',
              conteudo_permanencia: '',
            });
          });
      } else {
        setFormData({
          nome: documento.nome,
          descricao: documento.descricao || '',
          conteudo: documento.conteudo,
          conteudo_contrato: '',
          conteudo_adesao: '',
          conteudo_permanencia: '',
        });
      }
    }
  }, [documento, show, tipo]);

  // Limpar PDF URL quando o modal for fechado
  useEffect(() => {
    if (!show && pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [show, pdfUrl]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openImprimirDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.dropdown')) {
          setOpenImprimirDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openImprimirDropdown]);

  // Mutation para atualizar documento
  const updateDocumentoMutation = useMutation({
    mutationFn: async (data: any) => {
      switch (tipo) {
        case 'contrato':
          return DocumentoSistemaService.update(documento!.id, data);
        case 'recibo':
          return ModeloReciboService.update(documento!.id, data);
        case 'carta_cobranca':
          return ModeloCartaService.update(documento!.id, data);
        default:
          return DocumentoSistemaService.update(documento!.id, data);
      }
    },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) {
      addNotification('error', 'Nome é obrigatório');
      return;
    }

    // Se não for contrato, validar conteúdo obrigatório
    if (tipo !== 'contrato') {
      if (!formData.conteudo) {
        addNotification('error', 'Conteúdo é obrigatório');
        return;
      }
    }

    try {
      if (tipo === 'contrato') {
        // Salvar cada modelo em sua respectiva tabela (sempre, mesmo que vazio)
        const promises = [];
        
        // Sempre salvar modelo contrato conteúdo (pode ser vazio)
        promises.push(DocumentoSistemaService.saveModeloContratoConteudo(documento!.id, formData.conteudo_contrato || ''));
        
        // Sempre salvar termo de adesão (pode ser vazio)
        promises.push(DocumentoSistemaService.saveModeloTermoAdesao(documento!.id, formData.conteudo_adesao || ''));
        
        // Sempre salvar contrato permanência (pode ser vazio)
        promises.push(DocumentoSistemaService.saveModeloContratoPermanencia(documento!.id, formData.conteudo_permanencia || ''));

        await Promise.all(promises);
      } else {
        await updateDocumentoMutation.mutateAsync({
          nome: formData.nome,
          descricao: formData.descricao,
          conteudo: formData.conteudo
        });
      }
      
      addNotification('success', 'Documento salvo com sucesso');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      addNotification('error', error.message || 'Erro ao salvar documento');
    }
  };

  const handleReset = () => {
    if (documento) {
      if (tipo === 'contrato') {
        // Recarregar dados das tabelas separadas
        DocumentoSistemaService.getModelosByModeloContrato(documento.id)
          .then(response => {
            if (response.success) {
              setFormData({
                nome: documento.nome,
                descricao: documento.descricao || '',
                conteudo: documento.conteudo,
                conteudo_contrato: response.data.modelo_contrato_conteudo || '',
                conteudo_adesao: response.data.modelo_termo_adesao || '',
                conteudo_permanencia: response.data.modelo_contrato_permanencia || '',
              });
            } else {
              setFormData({
                nome: documento.nome,
                descricao: documento.descricao || '',
                conteudo: documento.conteudo,
                conteudo_contrato: documento.conteudo,
                conteudo_adesao: '',
                conteudo_permanencia: '',
              });
            }
          })
          .catch(() => {
            setFormData({
              nome: documento.nome,
              descricao: documento.descricao || '',
              conteudo: documento.conteudo,
              conteudo_contrato: documento.conteudo,
              conteudo_adesao: '',
              conteudo_permanencia: '',
            });
          });
      } else {
        setFormData({
          nome: documento.nome,
          descricao: documento.descricao || '',
          conteudo: documento.conteudo,
          conteudo_contrato: '',
          conteudo_adesao: '',
          conteudo_permanencia: '',
        });
      }
    }
  };

  const editorRef = useRef<any>(null);

  const handleInsertVariable = (variable: string) => {
    if (editorRef.current && editorRef.current.insertVariable) {
      editorRef.current.insertVariable(variable);
    }
  };

  // Função para obter o conteúdo atual baseado na aba ativa
  const getCurrentContent = () => {
    if (tipo === 'contrato') {
      switch (activeTab) {
        case 'contrato':
          return formData.conteudo_contrato;
        case 'adesao':
          return formData.conteudo_adesao;
        case 'permanencia':
          return formData.conteudo_permanencia;
        default:
          return formData.conteudo_contrato;
      }
    }
    return formData.conteudo;
  };

  // Função para atualizar o conteúdo baseado na aba ativa
  const updateCurrentContent = (value: string) => {
    if (tipo === 'contrato') {
      switch (activeTab) {
        case 'contrato':
          setFormData(prev => ({ ...prev, conteudo_contrato: value }));
          break;
        case 'adesao':
          setFormData(prev => ({ ...prev, conteudo_adesao: value }));
          break;
        case 'permanencia':
          setFormData(prev => ({ ...prev, conteudo_permanencia: value }));
          break;
      }
    } else {
      setFormData(prev => ({ ...prev, conteudo: value }));
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

  const handlePrint = async (tipoDocumento?: 'contrato' | 'adesao' | 'permanencia' | 'documento') => {
    if (!documento) return;
    
    setIsGeneratingPdf(true);
    try {
      let pdfBlob: Blob;
      
      // Se tiver cliente selecionado, gera PDF com dados do cliente
      // Se não, gera PDF do modelo sem preencher variáveis
      if (clienteTesteId) {
        switch (tipo) {
          case 'contrato':
            // Para contratos, usar o documento específico selecionado
            const conteudoParaImprimir = getConteudoParaImprimir(tipoDocumento);
            if (conteudoParaImprimir) {
              // Usar o conteúdo específico do tipo de documento
              pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(documento.id, clienteTesteId, conteudoParaImprimir);
            } else {
              // Fallback para método padrão
              pdfBlob = await DocumentoSistemaService.generateTestPdf(documento.id, clienteTesteId);
            }
            break;
          case 'recibo':
            pdfBlob = await ModeloReciboService.generateTestPdf(documento.id, clienteTesteId);
            break;
          case 'carta_cobranca':
            pdfBlob = await ModeloCartaService.generateTestPdf(documento.id, clienteTesteId);
            break;
          default:
            pdfBlob = await DocumentoSistemaService.generateTestPdf(documento.id, clienteTesteId);
        }
      } else {
        switch (tipo) {
          case 'contrato':
            // Para contratos, usar o documento específico selecionado
            const conteudoParaImprimir = getConteudoParaImprimir(tipoDocumento);
            if (conteudoParaImprimir) {
              // Usar o conteúdo específico do tipo de documento
              pdfBlob = await DocumentoSistemaService.generatePdfWithContent(documento.id, conteudoParaImprimir);
            } else {
              // Fallback para método padrão
              pdfBlob = await DocumentoSistemaService.generatePdf(documento.id);
            }
            break;
          case 'recibo':
            pdfBlob = await ModeloReciboService.generatePdf(documento.id);
            break;
          case 'carta_cobranca':
            pdfBlob = await ModeloCartaService.generatePdf(documento.id);
            break;
          default:
            pdfBlob = await DocumentoSistemaService.generatePdf(documento.id);
        }
      }
      
      // Verifica se é um Blob válido
      if (!(pdfBlob instanceof Blob)) {
        throw new Error('Resposta inválida do servidor');
      }
      
      // Cria uma URL para o PDF e abre no modal de preview
      const url = window.URL.createObjectURL(pdfBlob);
      
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
      
      setPdfUrl(url);
      setShowPreview(true);

    } catch (error: any) {
      addNotification('error', error.message || 'Erro ao gerar PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Função para obter o conteúdo específico para impressão
  const getConteudoParaImprimir = (tipoDocumento?: 'contrato' | 'adesao' | 'permanencia' | 'documento') => {
    if (tipo === 'contrato') {
      switch (tipoDocumento) {
        case 'contrato':
          return formData.conteudo_contrato;
        case 'adesao':
          return formData.conteudo_adesao;
        case 'permanencia':
          return formData.conteudo_permanencia;
        default:
          return formData.conteudo_contrato;
      }
    }
    return formData.conteudo;
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
    <div className="d-flex gap-1 align-items-center">
      {/* Select de cliente para teste */}
      <label htmlFor="select-cliente-teste" style={{ margin: 0, display: 'inline-flex', alignItems: 'center' }}>
        <span style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0
        }}>
          Selecionar cliente para teste:
        </span>
        <select
          id="select-cliente-teste"
          name="cliente-teste"
          className="form-select form-select-sm"
          style={{ width: 'auto', fontSize: '0.875rem' }}
          value={clienteTesteId}
          onChange={(e) => setClienteTesteId(Number(e.target.value))}
          aria-label="Selecionar cliente para teste"
        >
          <option value={0}>Selecionar cliente...</option>
          {clientesData?.data?.map((cliente: any) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.razao_social}
            </option>
          ))}
        </select>
      </label>
      
             {/* Dropdown de impressão no padrão DataTable */}
             <div className="dropdown" style={{ position: 'relative' }}>
               <button
                 className="btn btn-sm btn-primary dropdown-toggle"
                 type="button"
                 onClick={() => setOpenImprimirDropdown(!openImprimirDropdown)}
                 disabled={isGeneratingPdf}
                 aria-expanded={openImprimirDropdown}
               >
                 {isGeneratingPdf ? 'Gerando...' : 'Imprimir'}
                 <i className="bi bi-chevron-down ms-1"></i>
               </button>
        {openImprimirDropdown && (
          <div 
            className="dropdown-menu show" 
            style={{ 
              position: 'absolute', 
              top: '100%', 
              left: 0, 
              zIndex: 1050,
              display: 'block',
              minWidth: '200px'
            }}
          >
            {tipo === 'contrato' ? (
              <>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    handlePrint('contrato');
                    setOpenImprimirDropdown(false);
                  }}
                  disabled={isGeneratingPdf}
                  style={{ display: 'block', width: '100%', textAlign: 'left' }}
                >
                  Modelo Contrato
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    handlePrint('adesao');
                    setOpenImprimirDropdown(false);
                  }}
                  disabled={isGeneratingPdf}
                  style={{ display: 'block', width: '100%', textAlign: 'left' }}
                >
                  Termo Adesão
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    handlePrint('permanencia');
                    setOpenImprimirDropdown(false);
                  }}
                  disabled={isGeneratingPdf}
                  style={{ display: 'block', width: '100%', textAlign: 'left' }}
                >
                  Contrato Permanência
                </button>
              </>
            ) : (
              <button
                className="dropdown-item"
                onClick={() => {
                  handlePrint('documento');
                  setOpenImprimirDropdown(false);
                }}
                disabled={isGeneratingPdf}
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
              >
                {tipo === 'recibo' ? 'Recibo' : tipo === 'carta_cobranca' ? 'Carta de Cobrança' : 'Documento'}
              </button>
            )}
          </div>
        )}
      </div>
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
        className="btn btn-primary btn-sm"
        onClick={handleClose}
      >
        Fechar
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
                  {tipo === 'contrato' ? 'Conteúdo do Contrato' : 'Conteúdo'} <span className="text-danger">*</span>
                </span>
              </div>
              
              {/* Abas para contratos */}
              {tipo === 'contrato' && (
                <ul className="nav nav-tabs mb-2" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'contrato' ? 'active' : ''}`}
                      type="button"
                      onClick={() => setActiveTab('contrato')}
                    >
                      Modelo Contrato
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'adesao' ? 'active' : ''}`}
                      type="button"
                      onClick={() => setActiveTab('adesao')}
                    >
                      Termo Adesão
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'permanencia' ? 'active' : ''}`}
                      type="button"
                      onClick={() => setActiveTab('permanencia')}
                    >
                      Contrato Permanência
                    </button>
                  </li>
                </ul>
              )}
              
              <RichTextEditor
                ref={editorRef}
                key={`${documento?.id}-${activeTab}`}
                id="conteudo"
                name="conteudo"
                ariaLabelledBy="conteudo-label"
                value={getCurrentContent()}
                onChange={updateCurrentContent}
                placeholder={`Digite o conteúdo ${tipo === 'contrato' ? `do ${activeTab === 'contrato' ? 'modelo de contrato' : activeTab === 'adesao' ? 'termo de adesão' : 'contrato de permanência'}` : 'do documento'}...`}
                height="100%"
                onInsertVariable={handleInsertVariable}
              />
            </div>
          </form>
        </div>
      </DraggableModal>

      {/* Modal de impressão */}
      <ImprimirModal
        show={showPreview}
        onClose={() => {
          setShowPreview(false);
          if (pdfUrl) {
            window.URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
          }
        }}
        pdfUrl={pdfUrl}
        title="Visualizar Documento"
        modalId="editar-documento-imprimir-modal"
      />
    </>
  );
};

export default EditarDocumentoModal;
