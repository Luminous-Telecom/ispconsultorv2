import React from 'react';
import DraggableModal from './DraggableModal';
import { Spinner } from 'components/ui';

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
      <div
        className="text-preview-content"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <div className="alert alert-danger mb-0 m-3">{error}</div>
        ) : content != null ? (
          <pre
            className="mb-0 p-3 font-monospace"
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 0,
              fontSize: '11px',
              lineHeight: 1.4,
            }}
          >
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
