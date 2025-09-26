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
      className={`notification-alert ${getAlertClass()}`} 
      role="alert"
      style={{
        background: type === 'error' ? '#dc3545' : 'var(--bg-primary)',
        color: type === 'error' ? '#ffffff' : 'var(--text-primary)',
        border: type === 'error' ? '1px solid #dc3545' : '1px solid var(--border-color)',
        borderRadius: '6px',
        boxShadow: 'var(--shadow-lg)',
        minWidth: type === 'error' ? '200px' : '280px',
        maxWidth: type === 'error' ? '300px' : '350px',
        padding: type === 'error' ? '0.5rem 0.75rem' : '0.75rem',
        fontSize: type === 'error' ? '0.8rem' : '0.875rem',
        position: 'relative'
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
            color: type === 'error' ? '#ffffff' : 'var(--text-muted)',
            cursor: 'pointer'
          }}
        ></button>
      )}
    </div>
  );
};

export default Alert;
