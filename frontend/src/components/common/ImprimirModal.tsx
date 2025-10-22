import React from 'react';
import DraggableModal from '../common/DraggableModal';

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
  const handleClose = () => {
    onClose();
  };

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={title}
      size="xl"
      modalId={modalId}
    >
      <div style={{ height: '80vh', width: '100%' }}>
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            title="Documento PDF"
          />
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