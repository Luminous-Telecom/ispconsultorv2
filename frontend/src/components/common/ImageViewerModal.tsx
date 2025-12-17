import React, { useEffect, useRef, useState } from 'react';
import Viewer from 'viewerjs';
import 'viewerjs/dist/viewer.css';
import DraggableModal from './DraggableModal';

interface ImageViewerModalProps {
  show: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  modalId?: string;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  show,
  onClose,
  imageUrl,
  title = "Visualizar Imagem",
  modalId = "image-viewer-modal"
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (show && imageUrl && imageRef.current) {
      // Inicializar ViewerJS
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }

      viewerRef.current = new Viewer(imageRef.current, {
        inline: true,
        ready: () => {
          setIsLoading(false);
        },
        error: () => {
          setIsLoading(false);
          setHasError(true);
        },
        toolbar: {
          zoomIn: true,
          zoomOut: true,
          oneToOne: true,
          reset: true,
          prev: false,
          play: false,
          next: false,
          rotateLeft: true,
          rotateRight: true,
          flipHorizontal: true,
          flipVertical: true,
        },
        navbar: false,
        title: false,
        tooltip: true,
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: true,
        transition: true,
        fullscreen: true,
        keyboard: true,
      });
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [show, imageUrl]);

  if (!imageUrl || !show) return null;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="xl"
      modalId={modalId}
    >
      <div style={{ 
        height: '80vh', 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {isLoading && (
          <div className="d-flex align-items-center justify-content-center" style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 1 
          }}>
            <div className="text-center text-white">
              <div className="spinner-border text-light" role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
              <p className="mt-2">Carregando imagem...</p>
            </div>
          </div>
        )}
        {hasError ? (
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="text-center text-white">
              <div className="alert alert-danger" role="alert">
                <h5 className="alert-heading">Erro ao carregar imagem</h5>
                <p>Não foi possível exibir a imagem. Tente novamente.</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              ref={imageRef}
              src={imageUrl}
              alt={title}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                cursor: 'zoom-in',
                display: isLoading ? 'none' : 'block'
              }}
            />
          </div>
        )}
      </div>
    </DraggableModal>
  );
};

export default ImageViewerModal;

