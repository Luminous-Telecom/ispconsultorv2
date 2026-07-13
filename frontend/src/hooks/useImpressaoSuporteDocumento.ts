import { useCallback, useState } from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { extractApiErrorMessage } from 'utils/apiErrorHelper';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';

type SuporteImpressaoFetcher = (
  entityId: number | string,
  options?: { clienteId?: number; modeloId?: number; modeloPadrao?: string }
) => Promise<Blob>;

interface UseImpressaoSuporteDocumentoParams {
  fetchPdf: SuporteImpressaoFetcher;
  entityLabel: string;
}

export function useImpressaoSuporteDocumento({
  fetchPdf,
  entityLabel,
}: UseImpressaoSuporteDocumentoParams) {
  const { success, error } = useNotificationContext();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const limparPdfUrl = useCallback(() => {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setShowModal(false);
  }, [pdfUrl]);

  const imprimir = useCallback(
    async (
      entityId: number | string,
      options: { clienteId?: number; modeloId?: number; modeloPadrao?: string } = {}
    ) => {
      if (!entityId) {
        error(`${entityLabel} não encontrado`);
        return;
      }

      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }

      setShowModal(true);
      setIsGeneratingPdf(true);

      try {
        const blob = await fetchPdf(entityId, options);
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
        setIsGeneratingPdf(false);
        success('Documento gerado com sucesso!');
      } catch (err) {
        const message = await extractApiErrorMessage(err, {
          defaultMessage: CONTEXT_ERROR_MESSAGES.PDF_GENERATE_ERROR,
          handleBlobResponse: true,
        });
        error(message);
        setShowModal(false);
        setIsGeneratingPdf(false);
      }
    },
    [entityLabel, error, fetchPdf, pdfUrl, success]
  );

  return {
    isGeneratingPdf,
    pdfUrl,
    showModal,
    setShowModal,
    imprimir,
    limparPdfUrl,
  };
}
