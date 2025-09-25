import React from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  dismissible?: boolean;
}

const Alert: React.FC<AlertProps> = ({ type, message, onClose, dismissible = true }) => {
  const getAlertClass = () => {
    switch (type) {
      case 'success':
        return 'alert-success';
      case 'error':
        return 'alert-danger';
      case 'warning':
        return 'alert-warning';
      case 'info':
        return 'alert-info';
      default:
        return 'alert-info';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'bi-check-circle';
      case 'error':
        return 'bi-exclamation-triangle';
      case 'warning':
        return 'bi-exclamation-triangle';
      case 'info':
        return 'bi-info-circle';
      default:
        return 'bi-info-circle';
    }
  };

  return (
    <div 
      className={`alert ${getAlertClass()} alert-dismissible fade show`} 
      role="alert"
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-lg)',
        minWidth: '300px',
        maxWidth: '400px',
        padding: '1rem'
      }}
    >
      <i className={`bi ${getIcon()} me-2`}></i>
      {message}
      {dismissible && onClose && (
        <button
          type="button"
          className="btn-close"
          onClick={onClose}
          aria-label="Close"
          style={{ 
            background: 'none',
            border: 'none',
            fontSize: '1.2rem',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        ></button>
      )}
    </div>
  );
};

export default Alert;
