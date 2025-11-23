import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import DocumentoSistemaService from '@/services/documentoSistemaService';
import ModeloReciboService from '@/services/modeloReciboService';
import ModeloCartaService from '@/services/modeloCartaService';
import ModeloTermoService from '@/services/modeloTermoService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import DraggableModal from '@/components/common/DraggableModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import FormField from '@/components/ui/FormField';
import EntitySelectField from '@/components/ui/EntitySelectField';
import { DocumentoForm, DocumentoModalProps, DocumentoUnion } from './types';
import ContratoTab from './abas/ContratoTab';
import AdesaoTab from './abas/AdesaoTab';
import PermanenciaTab from './abas/PermanenciaTab';
import ConteudoTab from './abas/ConteudoTab';
import { useCliente, useClientes } from '@/hooks/useClientes';
import ClienteListModal from '@/components/modals/clientes/ClienteListModal';

const emptyForm: DocumentoForm = {
  nome: '',
  descricao: '',
  conteudo: '',
  conteudo_contrato: '',
  conteudo_adesao: '',
  conteudo_permanencia: '',
};

const DocumentoModal: React.FC<DocumentoModalProps> = ({ show, onClose, documento, tipo, onSuccess }) => {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<DocumentoForm>({ ...emptyForm });

  const [currentDocumento, setCurrentDocumento] = useState<DocumentoUnion | null>(documento ?? null);
  const isEditing = !!currentDocumento;
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [clienteTesteId, setClienteTesteId] = useState<number>(0);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'contrato' | 'adesao' | 'permanencia'>('contrato');
  const [showImprimirDropdown, setShowImprimirDropdown] = useState(false);

  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  const { data: clienteTeste } = useCliente(clienteTesteId || 0);
  const { data: clientesData } = useClientes({ limit: 9999 }); // Buscar todos os clientes

  const clientesDisponiveis = useMemo(() => {
    if (clientesData?.data) {
      return clientesData.data;
    }
    return clienteTeste ? [clienteTeste] : [];
  }, [clientesData, clienteTeste]);

  useEffect(() => {
    if (show) {
      setCurrentDocumento(documento ?? null);
    } else {
      setCurrentDocumento(null);
      setFormData({ ...emptyForm });
      setActiveTab('contrato');
      setClienteTesteId(0);
      setShowImprimirDropdown(false);
    }
  }, [documento, show]);

  const getTipoLabel = (tipo: string) => {
    const labels = {
      contrato: 'Contrato',
      recibo: 'Recibo',
      carta_cobranca: 'Carta de Cobrança',
      termo: 'Termo',
    };
    return labels[tipo as keyof typeof labels] || 'Documento';
  };

  // Carregar dados do documento atual
  useEffect(() => {
    if (!show) {
      return;
    }

    if (!currentDocumento) {
      setFormData({ ...emptyForm });
      return;
    }

    const loadData = async () => {
      const conteudoAtual = (currentDocumento as { conteudo?: string } | null)?.conteudo ?? '';

      if (tipo === 'contrato') {
        try {
          const response = await DocumentoSistemaService.getModelosByModeloContrato(currentDocumento.id);
          setFormData({
            nome: currentDocumento.nome,
            descricao: currentDocumento.descricao || '',
            conteudo: conteudoAtual,
            conteudo_contrato: response.success ? (response.data.modelo_contrato_conteudo || '') : conteudoAtual,
            conteudo_adesao: response.success ? (response.data.modelo_termo_adesao || '') : '',
            conteudo_permanencia: response.success ? (response.data.modelo_contrato_permanencia || '') : '',
          });
        } catch {
          setFormData({
            nome: currentDocumento.nome,
            descricao: currentDocumento.descricao || '',
            conteudo: conteudoAtual,
            conteudo_contrato: conteudoAtual,
            conteudo_adesao: '',
            conteudo_permanencia: '',
          });
        }
      } else {
        setFormData({
          nome: currentDocumento.nome,
          descricao: currentDocumento.descricao || '',
          conteudo: conteudoAtual,
          conteudo_contrato: '',
          conteudo_adesao: '',
          conteudo_permanencia: '',
        });
      }
    };

    loadData();
  }, [currentDocumento, show, tipo]);

  useEffect(() => {
    if (!show && pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    if (!show) {
      setShowImprimirDropdown(false);
    }
  }, [show, pdfUrl]);

  // Service functions
  const getService = () => {
    switch (tipo) {
      case 'contrato': return DocumentoSistemaService;
      case 'recibo': return ModeloReciboService;
      case 'carta_cobranca': return ModeloCartaService;
      case 'termo': return ModeloTermoService;
      default: return DocumentoSistemaService;
    }
  };

  const createDocumentoMutation = useMutation({
    mutationFn: async (data: { nome: string; descricao?: string; conteudo: string }): Promise<DocumentoUnion> => {
      if (tipo === 'contrato') {
        const response = await DocumentoSistemaService.create({ ...data, tipo });
        return response.data;
      }

      if (tipo === 'recibo') {
        const response = await ModeloReciboService.create(data);
        return response.data;
      }

      if (tipo === 'carta_cobranca') {
        const response = await ModeloCartaService.create(data);
        return response.data;
      }

      if (tipo === 'termo') {
        const response = await ModeloTermoService.create({ ...data, tipo_termo: 'adesao' });
        return response.data;
      }

      const response = await DocumentoSistemaService.create({ ...data, tipo: 'contrato' });
      return response.data;
    },
    onSuccess: (createdDocumento) => {
      success('Documento criado com sucesso');
      setCurrentDocumento(createdDocumento);
      setActiveTab('contrato');
      setShowImprimirDropdown(false);
      setClienteTesteId(0);
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema'] });
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema', tipo] });
      onSuccess?.(createdDocumento);
    },
    onError: (err: unknown) => {
      if (err instanceof Error && 'response' in err) {
        const axiosError = err as AxiosError<{ message: string }>;
        error( axiosError.response?.data?.message || 'Erro ao criar documento');
      } else if (err instanceof Error) {
        error( err.message || 'Erro ao criar documento');
      } else {
        error( 'Erro ao criar documento');
      }
    }
  });

  const updateDocumentoMutation = useMutation({
    mutationFn: async (data: { nome: string; descricao?: string; conteudo?: string; conteudo_contrato?: string; conteudo_adesao?: string; conteudo_permanencia?: string }): Promise<DocumentoUnion> => {
      if (!currentDocumento) {
        throw new Error('Documento não encontrado');
      }

      const service = getService();

      if (tipo === 'contrato') {
        const promises = [];
        if (data.conteudo_contrato !== undefined) {
          promises.push(DocumentoSistemaService.saveModeloContratoConteudo(currentDocumento.id, data.conteudo_contrato || ''));
        }
        if (data.conteudo_adesao !== undefined) {
          promises.push(DocumentoSistemaService.saveModeloTermoAdesao(currentDocumento.id, data.conteudo_adesao || ''));
        }
        if (data.conteudo_permanencia !== undefined) {
          promises.push(DocumentoSistemaService.saveModeloContratoPermanencia(currentDocumento.id, data.conteudo_permanencia || ''));
        }
        if (data.nome || data.descricao || data.conteudo) {
          promises.push(DocumentoSistemaService.update(currentDocumento.id, { nome: data.nome, descricao: data.descricao, conteudo: data.conteudo }));
        }
        await Promise.all(promises);

        const updatedResponse = await DocumentoSistemaService.getById(currentDocumento.id);
        return updatedResponse.data;
      }
      
      const response = await service.update(currentDocumento.id, data as Record<string, unknown>);
      return response.data;
    },
    onSuccess: (updatedDocumento) => {
      success('Documento salvo com sucesso');
      setCurrentDocumento(updatedDocumento);
      setShowImprimirDropdown(false);
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema'] });
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema', tipo] });
      onSuccess?.(updatedDocumento);
    },
    onError: (err: unknown) => {
      if (err instanceof Error && 'response' in err) {
        const axiosError = err as AxiosError<{ message: string }>;
        error( axiosError.response?.data?.message || 'Erro ao salvar documento');
      } else if (err instanceof Error) {
        error( err.message || 'Erro ao salvar documento');
      } else {
        error( 'Erro ao salvar documento');
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome) {
      error( 'Nome é obrigatório');
      return;
    }

    if (tipo !== 'contrato' && !formData.conteudo) {
      error( 'Conteúdo é obrigatório');
      return;
    }

    try {
      if (isEditing) {
        const data = { nome: formData.nome, descricao: formData.descricao, conteudo: formData.conteudo, conteudo_contrato: formData.conteudo_contrato, conteudo_adesao: formData.conteudo_adesao, conteudo_permanencia: formData.conteudo_permanencia };
        await updateDocumentoMutation.mutateAsync(data);
      } else {
        // Para criação, usar conteudo_contrato se for contrato, senão conteudo
        const conteudoToSend = tipo === 'contrato' ? formData.conteudo_contrato || '' : formData.conteudo;
        const data = { nome: formData.nome, descricao: formData.descricao, conteudo: conteudoToSend };
        await createDocumentoMutation.mutateAsync(data);
      }
    } catch (err: unknown) {
      if (err instanceof Error && 'response' in err) {
        const axiosError = err as AxiosError<{ message: string }>;
        error( axiosError.response?.data?.message || 'Erro ao salvar documento');
      } else if (err instanceof Error) {
        error( err.message || 'Erro ao salvar documento');
      } else {
        error( 'Erro ao salvar documento');
      }
    }
  };

  const handleClose = () => {
    setClienteTesteId(0);
    setCurrentDocumento(null);
    setFormData({ ...emptyForm });
    setShowPreview(false);
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    onClose();
  };

  const handleInsertVariable = (_variable: string) => {
    // Esta função será passada para as abas se necessário
  };

  const getContentByType = (documentoTipo: 'contrato' | 'adesao' | 'permanencia') => {
    switch (documentoTipo) {
      case 'contrato': return formData.conteudo_contrato;
      case 'adesao': return formData.conteudo_adesao;
      case 'permanencia': return formData.conteudo_permanencia;
      default: return '';
    }
  };

  const handlePrint = async (documentoTipo?: 'contrato' | 'adesao' | 'permanencia') => {
    if (!isEditing || !currentDocumento) return;

    setIsGeneratingPdf(true);
    try {
      if (tipo === 'contrato' && documentoTipo) {
        const conteudo = getContentByType(documentoTipo);
        if (conteudo) {
          const blob = clienteTesteId
            ? await DocumentoSistemaService.generateTestPdfWithContent(currentDocumento.id, clienteTesteId, conteudo)
            : await DocumentoSistemaService.generatePdfWithContent(currentDocumento.id, conteudo);
          
          const url = window.URL.createObjectURL(blob);
          if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
          setPdfUrl(url);
          setShowPreview(true);
          return;
        }
      }

      const service = getService();
      const blob = clienteTesteId 
        ? await service.generateTestPdf(currentDocumento.id, clienteTesteId)
        : await service.generatePdf(currentDocumento.id);
      
      const url = window.URL.createObjectURL(blob);
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
      setPdfUrl(url);
      setShowPreview(true);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Erro ao gerar PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const headerActions = (
    <div className="d-flex gap-2 align-items-center">
      <div className="dropdown">
        <button 
          className="btn btn-primary btn-sm dropdown-toggle" 
          type="button" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowImprimirDropdown(!showImprimirDropdown);
          }}
          disabled={!isEditing || isGeneratingPdf}
        >
          {isGeneratingPdf ? 'Gerando...' : 'Imprimir'}
        </button>
        {showImprimirDropdown && (
          <ul className="dropdown-menu show" style={{ display: 'block', position: 'absolute', zIndex: 1050 }}>
            {tipo === 'contrato' ? (
              <>
                <li><button className="dropdown-item" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowImprimirDropdown(false); handlePrint('contrato'); }} disabled={!isEditing || isGeneratingPdf}>Modelo Contrato</button></li>
                <li><button className="dropdown-item" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowImprimirDropdown(false); handlePrint('adesao'); }} disabled={!isEditing || isGeneratingPdf}>Termo Adesão</button></li>
                <li><button className="dropdown-item" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowImprimirDropdown(false); handlePrint('permanencia'); }} disabled={!isEditing || isGeneratingPdf}>Contrato Permanência</button></li>
              </>
            ) : (
              <li><button className="dropdown-item" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowImprimirDropdown(false); handlePrint(); }} disabled={!isEditing || isGeneratingPdf}>{getTipoLabel(tipo)}</button></li>
            )}
          </ul>
        )}
      </div>
      
      <button type="button" className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={createDocumentoMutation.isPending || updateDocumentoMutation.isPending}>
        Salvar
      </button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={handleClose}>
        Cancelar
      </button>
    </div>
  );

  return (
    <>
      <DraggableModal show={show} onClose={handleClose} title={`${isEditing ? 'Editar' : 'Novo'} ${getTipoLabel(tipo)}`} size="xl" headerActions={headerActions}>
        <div style={{ padding: isMobile ? '0' : '16px' }}>
          <form onSubmit={handleSubmit}>
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <FormField name="nome" type="text" label="Nome" value={formData.nome} onChange={(value) => setFormData(prev => ({ ...prev, nome: String(value ?? '') }))} placeholder={isEditing ? undefined : `Ex: ${getTipoLabel(tipo)} Padrão`} required size="sm" />
              </div>
              <div className="col-md-6">
                <FormField name="descricao" type="text" label="Descrição" value={formData.descricao} onChange={(value) => setFormData(prev => ({ ...prev, descricao: String(value ?? '') }))} placeholder="Breve descrição" size="sm" />
              </div>
              <div className="col-md-12">
                <EntitySelectField
                  value={clienteTesteId || 0}
                  onChange={(value) => {
                    setClienteTesteId(value);
                  }}
                  onShowModal={() => setShowClienteModal(true)}
                  entities={clientesDisponiveis.map((c) => ({
                    id: c.id,
                    nome: c.razao_social
                  }))}
                  label="Cliente para Teste"
                  idFieldTitle="Digite o ID do cliente"
                  helpText="Selecione um cliente para visualizar o documento com dados reais"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span id="conteudo-label" className="form-label small mb-0">
                  {tipo === 'contrato' ? 'Conteúdo do Contrato' : 'Conteúdo'} <span className="text-danger">*</span>
                </span>
              </div>
              
              {tipo === 'contrato' && (
                <ul className="nav nav-tabs mb-2" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button className={`nav-link ${activeTab === 'contrato' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('contrato')}>Modelo Contrato</button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button className={`nav-link ${activeTab === 'adesao' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('adesao')}>Termo Adesão</button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button className={`nav-link ${activeTab === 'permanencia' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('permanencia')}>Contrato Permanência</button>
                  </li>
                </ul>
              )}
              
              {tipo === 'contrato' ? (
                <>
                  {activeTab === 'contrato' && (
                    <ContratoTab
                      value={formData.conteudo_contrato}
                      onChange={(value) => setFormData(prev => ({ ...prev, conteudo_contrato: value }))}
                      onInsertVariable={handleInsertVariable}
                      editorKey={`${isEditing ? currentDocumento?.id : 'create'}-contrato`}
                    />
                  )}
                  {activeTab === 'adesao' && (
                    <AdesaoTab
                      value={formData.conteudo_adesao}
                      onChange={(value) => setFormData(prev => ({ ...prev, conteudo_adesao: value }))}
                      onInsertVariable={handleInsertVariable}
                      editorKey={`${isEditing ? currentDocumento?.id : 'create'}-adesao`}
                    />
                  )}
                  {activeTab === 'permanencia' && (
                    <PermanenciaTab
                      value={formData.conteudo_permanencia}
                      onChange={(value) => setFormData(prev => ({ ...prev, conteudo_permanencia: value }))}
                      onInsertVariable={handleInsertVariable}
                      editorKey={`${isEditing ? currentDocumento?.id : 'create'}-permanencia`}
                    />
                  )}
                </>
              ) : (
                <ConteudoTab
                  value={formData.conteudo}
                  onChange={(value) => setFormData(prev => ({ ...prev, conteudo: value }))}
                  onInsertVariable={handleInsertVariable}
                  editorKey={`${isEditing ? currentDocumento?.id : 'create'}-conteudo`}
                  placeholder={`Digite o conteúdo do ${getTipoLabel(tipo).toLowerCase()}...`}
                />
              )}
            </div>
          </form>
        </div>
      </DraggableModal>

      {isEditing && (
        <ImprimirModal show={showPreview} onClose={() => { setShowPreview(false); if (pdfUrl) { window.URL.revokeObjectURL(pdfUrl); setPdfUrl(null); } }} pdfUrl={pdfUrl} title="Visualizar Documento" modalId="documento-imprimir-modal" />
      )}

      <ClienteListModal
        show={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        onSelectClient={(cliente) => {
          setClienteTesteId(cliente.id);
          setShowClienteModal(false);
        }}
      />
    </>
  );
};

export default DocumentoModal;

