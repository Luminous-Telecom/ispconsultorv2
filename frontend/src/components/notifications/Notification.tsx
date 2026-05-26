import React, { useState, useEffect } from 'react';
import { NotificationState, NotificationAction } from './types';
import { BulkActionButton, toBulkVariant } from '../ui';
import type { ButtonVariant } from '../ui';
import { usePrefersRealHover } from '../../hooks/usePrefersRealHover';

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

  const { config } = notification;
  const prefersRealHover = usePrefersRealHover();
  const shouldPauseOnHover = Boolean(config.pauseOnHover && prefersRealHover);
  const { onShown } = config;

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
      setIsAnimating(true);
      onShown?.();
    });
  }, [onShown]);

  // Handlers de mouse
  const handleMouseEnter = () => {
    if (shouldPauseOnHover) {
      onPause(notification.id);
    }
  };

  const handleMouseLeave = () => {
    if (shouldPauseOnHover) {
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

  const notificationType = config.type || 'info';
  
  // Obter ícone baseado no tipo
  const getIcon = () => {
    if (config.icon) {
      return config.icon;
    }

    switch (notificationType) {
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
  const getNotificationClasses = (): string[] => {
    const classes = ['notification'];
    
    classes.push(`notification-${notificationType}`);
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
    
    return classes;
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
        {config.actions.map((action) => (
          <BulkActionButton
            key={action.key}
            label={action.label}
            variant={toBulkVariant((action.variant as ButtonVariant) || 'primary')}
            size={action.size || 'sm'}
            onClick={() => handleActionClick(action)}
          />
        ))}
      </div>
    );
  };

  // Barra de progresso por CSS (sem setInterval): duração = tempo até fechar; pausa com .notification-paused
  const renderProgress = () => {
    const duration = config.duration ?? 0;
    if (!config.showProgress || duration <= 0) {
      return null;
    }

    return (
      <div className="notification-progress">
        <div
          className="notification-progress-bar notification-progress-bar--animated"
          style={
            {
              ...(config.progressColor ? { backgroundColor: config.progressColor } : {}),
              '--notification-duration': `${duration}ms`,
            } as React.CSSProperties
          }
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
      className={getNotificationClasses().join(' ')}
      style={getNotificationStyles()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      role="alert"
      aria-live="polite"
      tabIndex={config.closeOnClick ? 0 : -1}
      data-notification-type={notificationType}
    >
      <div className="notification-content">
        {/* Ícone */}
        <div className="notification-icon">
          {notificationType === 'loading' ? (
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

        {config.dismissible !== false && (
          <div className="notification-close">
            <button
              type="button"
              className="notification-close-btn"
              onClick={handleClose}
              aria-label="Fechar"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Barra de progresso */}
      {renderProgress()}
    </div>
  );
};

export default Notification;
