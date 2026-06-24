import React, { useState, useEffect } from 'react';
import DraggableModal from '../common/DraggableModal';
import { RecarregarButton } from 'components/ui';
import Loading from './Loading';

interface ImprimirModalProps {
  show: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  title?: string;
  modalId?: string;
  isGenerating?: boolean;
}

const ImprimirModal: React.FC<ImprimirModalProps> = ({
  show,
  onClose,
  pdfUrl,
  title = "Documento",
  modalId = "imprimir-modal",
  isGenerating = false
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={title}
      size="xl"
      modalId={modalId}
    >
      <div style={{ height: '80vh', width: '100%', position: 'relative' }}>
        {isGenerating || !pdfUrl ? (
          <div className="d-flex align-items-center justify-content-center h-100" style={{ minHeight: 0 }}>
            <Loading message="Carregando documento..." variant="modal" />
          </div>
        ) : (
          <>
            {isLoading && (
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1,
                  backgroundColor: 'var(--bg-primary)',
                  opacity: 0.95,
                  minHeight: 0,
                }}
              >
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
                        const iframe = document.querySelector(`#pdf-iframe-${modalId}`) as HTMLIFrameElement;
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
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
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