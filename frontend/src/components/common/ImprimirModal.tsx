import React, { useState, useEffect } from 'react';
import DraggableModal from '../common/DraggableModal';
import { Button } from '@/components/ui';

interface ImprimirModalProps {
  show: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  title?: string;
  modalId?: string;
}

const ImprimirModal: React.FC<ImprimirModalProps> = ({
  show,
  onClose,
  pdfUrl,
  title = "Visualizar Documento",
  modalId = "imprimir-modal"
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (show && pdfUrl) {
      setHasError(false);
      setIsLoading(true);
      
      // Adicionar listener para erros de carregamento de recursos
      const handleResourceError = (event: ErrorEvent) => {
        // eslint-disable-next-line no-console
        console.error('[ImprimirModal] Erro ao carregar recurso', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
          pdfUrl
        });
        
        // Verificar se o erro é relacionado ao PDF
        if (event.filename && event.filename.includes('cliente-arquivos')) {
          // eslint-disable-next-line no-console
          console.error('[ImprimirModal] Erro relacionado ao PDF do cliente-arquivos', {
            filename: event.filename,
            pdfUrl
          });
          setIsLoading(false);
          setHasError(true);
        }
      };
      
      // Adicionar listener para erros não capturados
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        // eslint-disable-next-line no-console
        console.error('[ImprimirModal] Promise rejeitada', {
          reason: event.reason,
          pdfUrl
        });
      };
      
      window.addEventListener('error', handleResourceError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      
      return () => {
        window.removeEventListener('error', handleResourceError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
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

  const handleIframeError = (event: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    // eslint-disable-next-line no-console
    console.error('[ImprimirModal] Erro ao carregar iframe', { 
      event, 
      pdfUrl,
      error: 'Erro ao carregar iframe'
    });
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
        {pdfUrl ? (
          <>
            {isLoading && (
              <div className="d-flex align-items-center justify-content-center" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, background: 'rgba(255, 255, 255, 0.9)' }}>
                <div className="text-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                  <p className="mt-2 text-muted">Carregando documento...</p>
                </div>
              </div>
            )}
            {hasError ? (
              <div className="d-flex align-items-center justify-content-center h-100">
                <div className="text-center">
                  <div className="alert alert-danger" role="alert">
                    <h5 className="alert-heading">Erro ao carregar documento PDF</h5>
                    <p>Não foi possível exibir o documento. Tente novamente.</p>
                    <Button 
                      variant="primary" 
                      onClick={() => {
                        setHasError(false);
                        setIsLoading(true);
                        // Forçar recarregamento do iframe
                        const iframe = document.querySelector(`#pdf-iframe-${modalId}`) as HTMLIFrameElement;
                        if (iframe) {
                          iframe.src = pdfUrl;
                        }
                      }}
                    >
                      Recarregar
                    </Button>
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
        ) : (
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
              <p className="mt-2 text-muted">Carregando documento...</p>
            </div>
          </div>
        )}
      </div>
    </DraggableModal>
  );
};

export default ImprimirModal;