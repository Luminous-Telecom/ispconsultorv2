import React from 'react';
import DraggableModal from './DraggableModal';
import { Loading } from 'components/ui';

interface TextPreviewModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  content: string | null;
  isLoading?: boolean;
  error?: string | null;
  modalId?: string;
}

const TextPreviewModal: React.FC<TextPreviewModalProps> = ({
  show,
  onClose,
  title,
  content,
  isLoading = false,
  error = null,
  modalId = 'text-preview-modal',
}) => {
  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="xl"
      modalId={modalId}
      className="no-padding text-preview-modal"
    >
      <div className="text-preview-content text-preview-container">
        {isLoading ? (
          <Loading variant="modal" />
        ) : error ? (
          <div className="alert alert-danger mb-0 m-3">{error}</div>
        ) : content != null ? (
          <pre className="mb-0 p-3 font-monospace text-preview-body">
            {content}
          </pre>
        ) : (
          <p className="text-muted mb-0 p-3">Nenhum conteúdo.</p>
        )}
      </div>
    </DraggableModal>
  );
};

export default TextPreviewModal;
