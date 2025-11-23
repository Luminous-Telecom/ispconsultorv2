import React from 'react';
import DraggableModal from './DraggableModal';

interface ConfirmModalProps {
  show: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'warning' | 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  show,
  title,
  message,
  confirmText,
  cancelText,
  type,
  onConfirm,
  onCancel
}) => {
  const getIconClass = () => {
    switch (type) {
      case 'warning':
        return 'bi-exclamation-triangle text-warning';
      case 'danger':
        return 'bi-exclamation-triangle text-danger';
      case 'info':
        return 'bi-info-circle text-info';
      default:
        return 'bi-question-circle text-warning';
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'warning':
        return 'btn btn-warning';
      case 'danger':
        return 'btn btn-danger';
      case 'info':
        return 'btn btn-info';
      default:
        return 'btn btn-warning';
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onCancel}
      title={title}
      size="sm"
    >
      <div className="text-center">
        <div className="mb-3">
          <i className={`bi ${getIconClass()}`} style={{ fontSize: '3rem' }}></i>
        </div>
        <p className="text-muted mb-2">
          {message}
        </p>
        
        <div className="d-flex justify-content-center gap-2">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={getConfirmButtonClass()}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </DraggableModal>
  );
};

export default ConfirmModal;
