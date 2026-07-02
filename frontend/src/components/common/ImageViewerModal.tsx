import React, { useEffect, useRef, useState } from 'react';
import Viewer from 'viewerjs';
import 'viewerjs/dist/viewer.css';
import DraggableModal from './DraggableModal';
import { Loading } from 'components/ui';

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
  title = 'Imagem',
  modalId = 'image-viewer-modal',
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (show && imageUrl && imageRef.current) {
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
      <div className="image-viewer-frame">
        {isLoading && (
          <div className="d-flex align-items-center justify-content-center image-viewer-loading-overlay">
            <div className="text-center text-white">
              <Loading variant="centered" message="Carregando imagem..." spinnerVariant="light" />
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
          <div className="image-viewer-center">
            <img
              ref={imageRef}
              src={imageUrl}
              alt={title}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              className={`image-viewer-img${isLoading ? ' image-viewer-img--loading' : ''}`}
            />
          </div>
        )}
      </div>
    </DraggableModal>
  );
};

export default ImageViewerModal;
