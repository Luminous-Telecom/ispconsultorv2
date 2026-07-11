import React, { useState, useEffect, useCallback } from 'react';
import DraggableModal from '../common/DraggableModal';
import { RecarregarButton, BaixarButton } from 'components/ui';
import Loading from './Loading';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';

interface ImprimirModalProps {
  show: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  title?: string;
  modalId?: string;
  isGenerating?: boolean;
  fileName?: string;
}

function sanitizePdfFileName(name: string): string {
  const trimmed = name.trim() || 'documento.pdf';
  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
}

async function downloadPdfFromUrl(pdfUrl: string, fileName: string): Promise<void> {
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(CONTEXT_ERROR_MESSAGES.TITULO_BOLETO_DOWNLOAD_ERROR);
  }

  const blob = await response.blob();
  const pdfBlob =
    blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  const safeName = sanitizePdfFileName(fileName);
  const file = new File([pdfBlob], safeName, { type: 'application/pdf' });

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (typeof nav.canShare === 'function' && typeof nav.share === 'function') {
    try {
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: safeName });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
        throw err;
      }
      // Continua no fallback de <a download>
    }
  }

  const objectUrl = window.URL.createObjectURL(pdfBlob);
  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = safeName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1500);
  }
}

const ImprimirModal: React.FC<ImprimirModalProps> = ({
  show,
  onClose,
  pdfUrl,
  title = 'Documento',
  modalId = 'imprimir-modal',
  isGenerating = false,
  fileName = 'documento.pdf',
}) => {
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (show && pdfUrl) {
      setHasError(false);
      setIsLoading(true);

      const handleResourceError = (event: ErrorEvent) => {
        if (event.filename && event.filename.includes('blob:')) {
          setIsLoading(false);
          setHasError(true);
        }
      };

      window.addEventListener('error', handleResourceError);

      return () => {
        window.removeEventListener('error', handleResourceError);
      };
    }
  }, [show, pdfUrl]);

  const handleClose = () => {
    setHasError(false);
    setIsLoading(true);
    setIsDownloading(false);
    onClose();
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleDownload = useCallback(async () => {
    if (!pdfUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadPdfFromUrl(pdfUrl, fileName);
      success(t('messages.pdfDownloaded'));
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === 'AbortError' || err.name === 'NotAllowedError')
      ) {
        return;
      }
      showApiError(err, CONTEXT_ERROR_MESSAGES.TITULO_BOLETO_DOWNLOAD_ERROR);
    } finally {
      setIsDownloading(false);
    }
  }, [pdfUrl, fileName, isDownloading, success, showApiError, t]);

  const canDownload = Boolean(pdfUrl) && !isGenerating && !hasError;

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={title}
      size="xl"
      className="imprimir-modal no-padding"
      modalId={modalId}
    >
      <div className="imprimir-modal-frame">
        {canDownload && (
          <div className="imprimir-modal-toolbar">
            <BaixarButton
              type="button"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              isPending={isDownloading}
            />
          </div>
        )}
        {isGenerating || !pdfUrl ? (
          <div className="d-flex align-items-center justify-content-center h-100 imprimir-modal-loading">
            <Loading message="Carregando documento..." variant="modal" />
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="d-flex align-items-center justify-content-center imprimir-modal-overlay">
                <Loading message="Carregando documento..." variant="modal" />
              </div>
            )}
            {hasError ? (
              <div className="d-flex align-items-center justify-content-center h-100">
                <div className="text-center">
                  <div className="alert alert-danger" role="alert">
                    <h5 className="alert-heading">Erro ao carregar documento PDF</h5>
                    <p>Não foi possível exibir o documento. Tente novamente.</p>
                    <RecarregarButton
                      type="button"
                      onClick={() => {
                        setHasError(false);
                        setIsLoading(true);
                        const iframe = document.querySelector(
                          `#pdf-iframe-${modalId}`
                        ) as HTMLIFrameElement;
                        if (iframe) {
                          iframe.src = pdfUrl;
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <iframe
                id={`pdf-iframe-${modalId}`}
                src={pdfUrl}
                className="imprimir-modal-iframe"
                title="Documento PDF"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            )}
          </>
        )}
      </div>
    </DraggableModal>
  );
};

export default ImprimirModal;
