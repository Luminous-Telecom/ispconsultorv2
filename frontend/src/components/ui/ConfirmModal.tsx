import React from 'react';
import { BaseComponentProps, ButtonVariant } from './types';
import Button from './Button';

interface ConfirmModalProps extends BaseComponentProps {
  show: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ButtonVariant;
  cancelVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
  onClose?: () => void;
  loading?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  show,
  title = 'Confirmar Ação',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'primary',
  cancelVariant = 'secondary',
  onConfirm,
  onCancel,
  onClose: _onClose,
  loading = false,
  icon,
  size = 'md',
  className = '',
  style,
  id,
  'data-testid': dataTestId,
}) => {
  if (!show) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  // Construir classes CSS para tamanho
  const getModalSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'modal-sm';
      case 'lg':
        return 'modal-lg';
      default:
        return '';
    }
  };

  return (
    <div
      className={`modal fade ${show ? 'show' : ''}`}
      style={{ 
        display: show ? 'block' : 'none',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1055,
        ...style 
      }}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmModalLabel"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      id={id}
      data-testid={dataTestId}
    >
      <div className={`modal-dialog ${getModalSizeClass()} ${className}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="confirmModalLabel">
              {icon && <span className="me-2">{icon}</span>}
              {title}
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onCancel}
            ></button>
          </div>
          
          <div className="modal-body">
            <p className="mb-0">{message}</p>
          </div>
          
          <div className="modal-footer">
            <Button
              variant={cancelVariant}
              onClick={handleCancel}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              variant={confirmVariant}
              onClick={handleConfirm}
              loading={loading}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
