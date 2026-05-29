import { useState, useCallback } from 'react';
import { extractApiErrorMessage } from 'utils/apiErrorHelper';
import { Contrato } from 'hooks/useContratos';
import DocumentoSistemaService from 'services/documentoSistemaService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useImpressaoContrato } from 'hooks/useImpressaoContrato';

export function useContratoPrintActions() {
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const impressaoHook = useImpressaoContrato({});

  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [pdfUrlLocal, setPdfUrlLocal] = useState<string | null>(null);
  const [isGeneratingPdfLocal, setIsGeneratingPdfLocal] = useState(false);

  const clearPdfUrlLocal = useCallback(() => {
    if (pdfUrlLocal) {
      window.URL.revokeObjectURL(pdfUrlLocal);
      setPdfUrlLocal(null);
    }
  }, [pdfUrlLocal]);

  const openLocalPrintModal = useCallback(() => {
    setShowImprimirModal(true);
    setIsGeneratingPdfLocal(true);
    clearPdfUrlLocal();
  }, [clearPdfUrlLocal]);

  const handleImprimirContrato = useCallback(
    async (contrato: Contrato) => {
      if (!contrato.cliente_id) {
        showApiError('Contrato sem cliente associado');
        return;
      }
      await impressaoHook.imprimirContrato(contrato.id, contrato.cliente_id);
    },
    [impressaoHook, showApiError]
  );

  const generateDocumentPdf = useCallback(
    async (
      contrato: Contrato,
      getConteudo: (modelosData: Awaited<
        ReturnType<typeof DocumentoSistemaService.getModelosByModeloContrato>
      >) => string | undefined,
      emptyContentMessage: string,
      successMessage: string,
      errorConfig: {
        defaultMessage: string;
        customStatusMessages: Record<number, string>;
      }
    ) => {
      if (!contrato.cliente_id) {
        showApiError('Contrato sem cliente associado');
        return;
      }

      openLocalPrintModal();

      try {
        const modelo = await DocumentoSistemaService.getDefaultByType('contrato');

        if (modelo.success && modelo.data) {
          const modelosData = await DocumentoSistemaService.getModelosByModeloContrato(
            modelo.data.id
          );
          const conteudo = getConteudo(modelosData) || modelo.data.conteudo;

          if (!conteudo || conteudo.trim() === '') {
            showApiError(emptyContentMessage);
            setShowImprimirModal(false);
            setIsGeneratingPdfLocal(false);
            return;
          }

          const pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(
            modelo.data.id,
            contrato.cliente_id,
            conteudo
          );

          const url = window.URL.createObjectURL(pdfBlob);
          setPdfUrlLocal(url);
          setIsGeneratingPdfLocal(false);
          success(successMessage);
        } else {
          showApiError('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.');
          setShowImprimirModal(false);
          setIsGeneratingPdfLocal(false);
        }
      } catch (err) {
        const showApiErrorMessage = await extractApiErrorMessage(err, {
          defaultMessage: errorConfig.defaultMessage,
          handleBlobResponse: true,
          customStatusMessages: errorConfig.customStatusMessages,
        });
        showApiError(showApiErrorMessage);
        setShowImprimirModal(false);
        setIsGeneratingPdfLocal(false);
      }
    },
    [openLocalPrintModal, showApiError, success]
  );

  const handleImprimirTermoAdesao = useCallback(
    async (contrato: Contrato) => {
      await generateDocumentPdf(
        contrato,
        (modelosData) => modelosData.data?.modelo_termo_adesao,
        'Conteúdo do termo de adesão não encontrado. Verifique se o modelo possui conteúdo cadastrado.',
        'Termo de Adesão gerado com sucesso!',
        {
          defaultMessage: CONTEXT_ERROR_MESSAGES.CONTRACT_TERM_ADESAO_ERROR,
          customStatusMessages: {
            404: CONTEXT_ERROR_MESSAGES.CONTRACT_MODEL_NOT_FOUND,
            500: CONTEXT_ERROR_MESSAGES.CONTRACT_TERM_ADESAO_SERVER_ERROR,
          },
        }
      );
    },
    [generateDocumentPdf]
  );

  const handleImprimirContratoPermanencia = useCallback(
    async (contrato: Contrato) => {
      await generateDocumentPdf(
        contrato,
        (modelosData) => modelosData.data?.modelo_contrato_permanencia,
        'Conteúdo do contrato de permanência não encontrado. Verifique se o modelo possui conteúdo cadastrado.',
        'Contrato de Permanência gerado com sucesso!',
        {
          defaultMessage: CONTEXT_ERROR_MESSAGES.CONTRACT_PERMANENCE_ERROR,
          customStatusMessages: {
            404: CONTEXT_ERROR_MESSAGES.CONTRACT_MODEL_NOT_FOUND,
            500: CONTEXT_ERROR_MESSAGES.CONTRACT_PERMANENCE_SERVER_ERROR,
          },
        }
      );
    },
    [generateDocumentPdf]
  );

  const handleCloseImprimirModal = useCallback(() => {
    if (impressaoHook.showModal) {
      impressaoHook.limparPdfUrl();
    }
    setShowImprimirModal(false);
    clearPdfUrlLocal();
  }, [impressaoHook, clearPdfUrlLocal]);

  return {
    impressaoHook,
    showImprimirModal,
    pdfUrlLocal,
    isGeneratingPdfLocal,
    handleImprimirContrato,
    handleImprimirTermoAdesao,
    handleImprimirContratoPermanencia,
    handleCloseImprimirModal,
  };
}
