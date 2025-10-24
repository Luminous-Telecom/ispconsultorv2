import React, { useState, useEffect, useRef } from 'react';
import { NotificationState, NotificationAction } from './types';
import Button from '../ui/Button';

interface NotificationProps {
  notification: NotificationState;
  onRemove: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onActionClick: (action: NotificationAction) => void;
  className?: string;
}

const Notification: React.FC<NotificationProps> = ({
  notification,
  onRemove,
  onPause,
  onResume,
  onActionClick,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const { config } = notification;

  // Animar entrada
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Chamar callback onShown
      config.onShown?.();
    }, 100);

    return () => clearTimeout(timer);
  }, [config.onShown]);

  // Handlers de mouse
  const handleMouseEnter = () => {
    if (config.pauseOnHover) {
      onPause(notification.id);
    }
  };

  const handleMouseLeave = () => {
    if (config.pauseOnHover) {
      onResume(notification.id);
    }
  };

  const handleFocus = () => {
    if (config.pauseOnFocus) {
      onPause(notification.id);
    }
  };

  const handleBlur = () => {
    if (config.pauseOnFocus) {
      onResume(notification.id);
    }
  };

  const handleClick = () => {
    if (config.closeOnClick) {
      onRemove(notification.id);
    }
    config.onClick?.();
  };

  const handleClose = () => {
    onRemove(notification.id);
    config.onClose?.();
  };

  const handleActionClick = (action: NotificationAction) => {
    onActionClick(action);
    config.onActionClick?.(action);
  };

  // Obter ícone baseado no tipo
  const getIcon = () => {
    if (config.icon) {
      return config.icon;
    }

    switch (config.type) {
      case 'success':
        return 'check-circle-fill';
      case 'error':
        return 'exclamation-triangle-fill';
      case 'warning':
        return 'exclamation-triangle-fill';
      case 'info':
        return 'info-circle-fill';
      case 'loading':
        return 'arrow-clockwise';
      default:
        return 'info-circle-fill';
    }
  };

  // Obter classes CSS
  const getNotificationClasses = () => {
    const classes = ['notification'];
    
    classes.push(`notification-${config.type}`);
    classes.push(`notification-${config.size}`);
    classes.push(`notification-${config.animation}`);
    
    if (isVisible) {
      classes.push('notification-visible');
    }
    
    if (isAnimating) {
      classes.push('notification-animating');
    }
    
    if (notification.isPaused) {
      classes.push('notification-paused');
    }
    
    if (config.closeOnClick) {
      classes.push('notification-clickable');
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  // Obter estilos
  const getNotificationStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {
      zIndex: config.zIndex,
    };
    
    if (config.maxWidth) {
      styles.maxWidth = typeof config.maxWidth === 'number' ? `${config.maxWidth}px` : config.maxWidth;
    }
    
    if (config.maxHeight) {
      styles.maxHeight = typeof config.maxHeight === 'number' ? `${config.maxHeight}px` : config.maxHeight;
    }
    
    if (config.style) {
      Object.assign(styles, config.style);
    }
    
    return styles;
  };

  // Renderizar ações
  const renderActions = () => {
    if (!config.actions || config.actions.length === 0) {
      return null;
    }

    return (
      <div className="notification-actions">
        {config.actions.map(action => (
          <Button
            key={action.key}
            variant={action.variant || 'outline-primary'}
            size={action.size || 'sm'}
            icon={action.icon}
            onClick={() => handleActionClick(action)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    );
  };

  // Renderizar progresso
  const renderProgress = () => {
    if (!config.showProgress || config.duration === 0) {
      return null;
    }

    return (
      <div className="notification-progress">
        <div 
          className="notification-progress-bar"
          style={{ 
            width: `${notification.progress}%`,
            backgroundColor: config.progressColor || 'var(--bs-primary)'
          }}
        />
      </div>
    );
  };

  // Renderizar imagem
  const renderImage = () => {
    if (!config.image) {
      return null;
    }

    return (
      <div className="notification-image">
        <img src={config.image} alt={config.title || config.message} />
      </div>
    );
  };

  return (
    <div
      ref={notificationRef}
      className={getNotificationClasses()}
      style={getNotificationStyles()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      role="alert"
      aria-live="polite"
      tabIndex={config.closeOnClick ? 0 : -1}
    >
      <div className="notification-content">
        {/* Ícone */}
        <div className="notification-icon">
          {config.type === 'loading' ? (
            <i className={`bi bi-${getIcon()} notification-loading-icon`}></i>
          ) : (
            <i className={`bi bi-${getIcon()}`}></i>
          )}
        </div>

        {/* Conteúdo principal */}
        <div className="notification-body">
          {/* Título */}
          {config.title && (
            <div className="notification-title">
              {config.title}
            </div>
          )}

          {/* Mensagem */}
          <div className="notification-message">
            {config.message}
          </div>

          {/* Descrição */}
          {config.description && (
            <div className="notification-description">
              {config.description}
            </div>
          )}

          {/* Ações */}
          {renderActions()}
        </div>

        {/* Imagem */}
        {renderImage()}

        {/* Botão de fechar */}
        {config.dismissible !== false && (
          <div className="notification-close">
            <Button
              variant="outline-secondary"
              size="sm"
              icon="x"
              onClick={handleClose}
              tooltip="Fechar"
            >
              {''}
            </Button>
          </div>
        )}
      </div>

      {/* Barra de progresso */}
      {renderProgress()}
    </div>
  );
};

export default Notification;
