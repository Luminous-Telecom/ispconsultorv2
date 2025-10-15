import React, { useState, useEffect } from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  dismissible?: boolean;
  duration?: number;
}

const Alert: React.FC<AlertProps> = ({ type, message, onClose, dismissible = true, duration = 3000 }) => {
  const [progress, setProgress] = useState(100);

  // Atualizar barra de progresso
  useEffect(() => {
    if (duration <= 0) return;

    const interval = 50; // Atualiza a cada 50ms
    const decrement = (interval / duration) * 100;
    
    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - decrement;
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [duration]);
  
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
      className={`notification-alert ${getAlertClass()} fade-in`} 
      role="alert"
      style={{
        background: type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : 'var(--bg-primary)',
        color: type === 'error' || type === 'success' ? '#ffffff' : 'var(--text-primary)',
        border: type === 'error' ? '1px solid #dc3545' : type === 'success' ? '1px solid #28a745' : '1px solid var(--border-color)',
        borderRadius: '6px',
        boxShadow: 'var(--shadow-lg)',
        minWidth: type === 'error' || type === 'success' ? '200px' : '280px',
        maxWidth: type === 'error' || type === 'success' ? '300px' : '350px',
        padding: type === 'error' || type === 'success' ? '0.5rem 0.75rem' : '0.75rem',
        fontSize: type === 'error' || type === 'success' ? '0.8rem' : '0.875rem',
        position: 'relative',
        marginBottom: '0.5rem',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <i className={`bi ${getIcon()} me-2`}></i>
          <span>{message}</span>
        </div>
        {dismissible && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar notificação"
            style={{ 
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              color: type === 'error' || type === 'success' ? '#ffffff' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0 0 0 0.5rem',
              lineHeight: 1,
              opacity: 0.8,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        )}
      </div>
      
      {/* Barra de progresso */}
      {duration > 0 && (
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'rgba(255, 255, 255, 0.3)',
            overflow: 'hidden'
          }}
        >
          <div 
            style={{
              height: '100%',
              width: `${progress}%`,
              background: type === 'error' || type === 'success' ? '#ffffff' : 'var(--primary-color)',
              transition: 'width 50ms linear',
              boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Alert;
