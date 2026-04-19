import React, { useState, useEffect } from 'react';
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

  const { config } = notification;
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

  // Garantir que o tipo seja sempre o correto (forçar se necessário)
  // Se o config.type não existir ou for diferente do esperado, usar 'info' como padrão
  // Mas SEMPRE respeitar o config.type se ele existir
  const notificationType = (config.type || 'info') as 'success' | 'error' | 'warning' | 'info' | 'loading';
  
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

  const notificationClasses = getNotificationClasses();
  
  // Verificar se a classe está correta baseada no tipo
  const expectedClass = `notification-${notificationType}`;
  const hasCorrectClass = notificationClasses.includes(expectedClass);
  
  // Se não tiver a classe correta, adicionar
  const finalClasses = hasCorrectClass 
    ? notificationClasses 
    : notificationClasses.filter((c: string) => !c.startsWith('notification-')).concat(expectedClass);

  return (
    <div
      className={finalClasses.join(' ')}
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

        {/* Botão de fechar */}
        {config.dismissible !== false && (
          <div className="notification-close">
            <Button
              variant="outline-primary"
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
