import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DocumentoSistemaService from 'services/documentoSistemaService';
import ModeloReciboService from 'services/modeloReciboService';
import ModeloCartaService from 'services/modeloCartaService';
import ModeloTermoService from 'services/modeloTermoService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useCliente, useClientes } from 'hooks/useClientes';
import { useI18n } from 'contexts/I18nContext';
import { DocumentoForm, DocumentoModalProps, DocumentoUnion } from '../types';
import { DocumentoActiveTab, EMPTY_FORM } from './constants';
import { getContentByType, getDocumentoService } from './documentoModalUtils';

export function useDocumentoModal({
  show,
  onClose,
  documento,
  tipo,
  onSuccess,
}: DocumentoModalProps) {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<DocumentoForm>({ ...EMPTY_FORM });
  const [currentDocumento, setCurrentDocumento] = useState<DocumentoUnion | null>(documento ?? null);
  const isEditing = !!currentDocumento;
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [clienteTesteId, setClienteTesteId] = useState<number>(0);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<DocumentoActiveTab>('contrato');
  const [showImprimirDropdown, setShowImprimirDropdown] = useState(false);

  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const { t } = useI18n();

  const { data: clienteTeste } = useCliente(clienteTesteId || 0);
  const { data: clientesData } = useClientes({ limit: 9999 });
  const clientesDisponiveis = clientesData?.data || (clienteTeste ? [clienteTeste] : []);

  const getService = useCallback(() => getDocumentoService(tipo), [tipo]);

  useEffect(() => {
    if (show) {
      setActiveTab('contrato');
      setCurrentDocumento(documento ?? null);
    } else {
      setCurrentDocumento(null);
      setFormData({ ...EMPTY_FORM });
      setActiveTab('contrato');
      setClienteTesteId(0);
      setShowImprimirDropdown(false);
      setShowPreview(false);
      setIsGeneratingPdf(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documento, show]);

  useEffect(() => {
    if (!show && pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [show, pdfUrl]);

  useEffect(() => {
    if (!show || !currentDocumento?.id) {
      if (!show) {
        setFormData({ ...EMPTY_FORM });
      }
      return;
    }

    const loadData = async () => {
      const service = getService();
      try {
        const response = await service.getById(currentDocumento.id);
        const doc = response.success && response.data ? response.data : currentDocumento;
        const conteudo = (doc as { conteudo?: string })?.conteudo ?? '';

        if (tipo === 'contrato') {
          try {
            const modelos = await DocumentoSistemaService.getModelosByModeloContrato(doc.id);
            setFormData({
              nome: doc.nome,
              descricao: doc.descricao || '',
              conteudo,
              conteudo_contrato: modelos.success ? (modelos.data.modelo_contrato_conteudo || '') : conteudo,
              conteudo_adesao: modelos.success ? (modelos.data.modelo_termo_adesao || '') : '',
              conteudo_permanencia: modelos.success ? (modelos.data.modelo_contrato_permanencia || '') : '',
              conteudo_recibo: modelos.success ? (modelos.data.modelo_recibo || '') : '',
              conteudo_carta: modelos.success ? (modelos.data.modelo_carta || '') : '',
            });
          } catch {
            setFormData({
              nome: doc.nome,
              descricao: doc.descricao || '',
              conteudo,
              conteudo_contrato: conteudo,
              conteudo_adesao: '',
              conteudo_permanencia: '',
              conteudo_recibo: '',
              conteudo_carta: '',
            });
          }
        } else {
          setFormData({
            nome: doc.nome,
            descricao: doc.descricao || '',
            conteudo,
            conteudo_contrato: '',
            conteudo_adesao: '',
            conteudo_permanencia: '',
            conteudo_recibo: '',
            conteudo_carta: '',
          });
        }
      } catch {
        const conteudo = (currentDocumento as { conteudo?: string })?.conteudo ?? '';
        setFormData({
          nome: currentDocumento.nome,
          descricao: currentDocumento.descricao || '',
          conteudo,
          conteudo_contrato: '',
          conteudo_adesao: '',
          conteudo_permanencia: '',
          conteudo_recibo: '',
          conteudo_carta: '',
        });
      }
    };

    loadData();
  }, [currentDocumento, show, tipo, getService]);

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
      if (tipo === 'ordem_servico') {
        const response = await DocumentoSistemaService.create({ ...data, tipo });
        return response.data;
      }
      const response = await DocumentoSistemaService.create({ ...data, tipo: 'contrato' });
      return response.data;
    },
    onSuccess: (createdDocumento) => {
      success(t('document.successCreate'));
      setCurrentDocumento(createdDocumento);
      setActiveTab('contrato');
      setShowImprimirDropdown(false);
      setClienteTesteId(0);
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema'] });
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema', tipo] });
      onSuccess?.(createdDocumento);
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.DOCUMENT_CREATE_ERROR),
  });

  const updateDocumentoMutation = useMutation({
    mutationFn: async (data: {
      nome: string;
      descricao?: string;
      conteudo?: string;
      conteudo_contrato?: string;
      conteudo_adesao?: string;
      conteudo_permanencia?: string;
      conteudo_recibo?: string;
      conteudo_carta?: string;
    }): Promise<DocumentoUnion> => {
      if (!currentDocumento) {
        throw new Error('Documento não encontrado');
      }

      const service = getService();

      if (tipo === 'contrato') {
        const promises = [];
        if (data.conteudo_contrato !== undefined) {
          promises.push(
            DocumentoSistemaService.saveModeloContratoConteudo(currentDocumento.id, data.conteudo_contrato || '')
          );
        }
        if (data.conteudo_adesao !== undefined) {
          promises.push(DocumentoSistemaService.saveModeloTermoAdesao(currentDocumento.id, data.conteudo_adesao || ''));
        }
        if (data.conteudo_permanencia !== undefined) {
          promises.push(
            DocumentoSistemaService.saveModeloContratoPermanencia(currentDocumento.id, data.conteudo_permanencia || '')
          );
        }
        if (data.conteudo_recibo !== undefined) {
          promises.push(DocumentoSistemaService.saveModeloRecibo(currentDocumento.id, data.conteudo_recibo || ''));
        }
        if (data.conteudo_carta !== undefined) {
          promises.push(DocumentoSistemaService.saveModeloCarta(currentDocumento.id, data.conteudo_carta || ''));
        }
        if (data.nome || data.descricao) {
          promises.push(
            DocumentoSistemaService.update(currentDocumento.id, { nome: data.nome, descricao: data.descricao })
          );
        }
        await Promise.all(promises);
        const updatedResponse = await DocumentoSistemaService.getById(currentDocumento.id);
        return updatedResponse.data;
      }

      await service.update(currentDocumento.id, data as Record<string, unknown>);
      const updatedResponse = await service.getById(currentDocumento.id);
      return updatedResponse.data;
    },
    onSuccess: (updatedDocumento) => {
      success(t('document.successUpdate'));
      setCurrentDocumento(updatedDocumento);
      setShowImprimirDropdown(false);
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema'] });
      queryClient.invalidateQueries({ queryKey: ['documentos-sistema', tipo] });
      onSuccess?.(updatedDocumento);
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.DOCUMENT_UPDATE_ERROR),
  });

  const isSubmitting = createDocumentoMutation.isPending || updateDocumentoMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome) {
      showApiError(t('messages.nameRequired'));
      return;
    }

    if (tipo !== 'contrato' && !formData.conteudo) {
      showApiError(t('messages.contentRequired'));
      return;
    }

    try {
      if (isEditing) {
        const data = {
          nome: formData.nome,
          descricao: formData.descricao,
          conteudo: formData.conteudo,
          conteudo_contrato: formData.conteudo_contrato,
          conteudo_adesao: formData.conteudo_adesao,
          conteudo_permanencia: formData.conteudo_permanencia,
          conteudo_recibo: formData.conteudo_recibo,
          conteudo_carta: formData.conteudo_carta,
        };
        await updateDocumentoMutation.mutateAsync(data);
      } else {
        const conteudoToSend = tipo === 'contrato' ? formData.conteudo_contrato || '' : formData.conteudo;
        const data = { nome: formData.nome, descricao: formData.descricao, conteudo: conteudoToSend };
        await createDocumentoMutation.mutateAsync(data);
      }
    } catch (err: unknown) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.DOCUMENT_UPDATE_ERROR);
    }
  };

  const revokePdfUrl = useCallback(() => {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [pdfUrl]);

  const handleClose = () => {
    setClienteTesteId(0);
    setCurrentDocumento(null);
    setFormData({ ...EMPTY_FORM });
    setShowPreview(false);
    setIsGeneratingPdf(false);
    revokePdfUrl();
    onClose();
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    revokePdfUrl();
  };

  const handlePrint = async (documentoTipo?: DocumentoActiveTab) => {
    if (!isEditing || !currentDocumento) return;

    setShowPreview(true);
    setIsGeneratingPdf(true);
    revokePdfUrl();

    try {
      if (tipo === 'contrato' && documentoTipo) {
        const conteudo = getContentByType(formData, documentoTipo);
        if (conteudo) {
          const blob = clienteTesteId
            ? await DocumentoSistemaService.generateTestPdfWithContent(
                currentDocumento.id,
                clienteTesteId,
                conteudo
              )
            : await DocumentoSistemaService.generatePdfWithContent(currentDocumento.id, conteudo);

          const url = window.URL.createObjectURL(blob);
          setPdfUrl(url);
          setIsGeneratingPdf(false);
          return;
        }
      }

      const service = getService();
      const blob = clienteTesteId
        ? await service.generateTestPdf(currentDocumento.id, clienteTesteId)
        : await service.generatePdf(currentDocumento.id);

      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.PDF_GENERATE_ERROR);
      setShowPreview(false);
      setIsGeneratingPdf(false);
    }
  };

  const handleSelectCliente = (cliente: { id: number }) => {
    setClienteTesteId(cliente.id);
    setShowClienteModal(false);
  };

  return {
    isMobile,
    tipo,
    formData,
    setFormData,
    currentDocumento,
    isEditing,
    showPreview,
    pdfUrl,
    isGeneratingPdf,
    clienteTesteId,
    setClienteTesteId,
    showClienteModal,
    setShowClienteModal,
    activeTab,
    setActiveTab,
    showImprimirDropdown,
    setShowImprimirDropdown,
    clientesDisponiveis,
    isSubmitting,
    handleSubmit,
    handleClose,
    handleClosePreview,
    handlePrint,
    handleSelectCliente,
  };
}
