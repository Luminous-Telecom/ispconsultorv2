import React, { useState, useEffect, useRef } from 'react';
import { useElementProperties } from 'hooks/useElementProperties';
import { NotificationState, NotificationAction } from './types';
import { BulkActionButton, IconOnlyButton, toBulkVariant } from '../ui';
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
  const notificationRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const { config } = notification;
  const prefersRealHover = usePrefersRealHover();
  const shouldPauseOnHover = Boolean(config.pauseOnHover && prefersRealHover);
  const { onShown } = config;

  const notificationProperties = {
    zIndex: config.zIndex != null ? String(config.zIndex) : undefined,
    maxWidth: config.maxWidth != null
      ? typeof config.maxWidth === 'number'
        ? `${config.maxWidth}px`
        : config.maxWidth
      : undefined,
    maxHeight: config.maxHeight != null
      ? typeof config.maxHeight === 'number'
        ? `${config.maxHeight}px`
        : config.maxHeight
      : undefined,
    ...(config.style ?? {}),
  };

  useElementProperties(notificationRef, notificationProperties, [
    config.zIndex,
    config.maxWidth,
    config.maxHeight,
    config.style,
  ]);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
      setIsAnimating(true);
      onShown?.();
    });
  }, [onShown]);

  const duration = config.duration ?? 0;
  useElementProperties(
    progressRef,
    {
      ...(config.progressColor ? { backgroundColor: config.progressColor } : {}),
      '--notification-duration': duration > 0 ? `${duration}ms` : undefined,
    },
    [config.progressColor, duration],
  );

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

  const renderProgress = () => {
    if (!config.showProgress || duration <= 0) {
      return null;
    }

    return (
      <div className="notification-progress">
        <div
          ref={progressRef}
          className="notification-progress-bar notification-progress-bar--animated"
        />
      </div>
    );
  };

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
      className={getNotificationClasses().join(' ')}
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
        <div className="notification-icon">
          {notificationType === 'loading' ? (
            <i className={`bi bi-${getIcon()} notification-loading-icon`}></i>
          ) : (
            <i className={`bi bi-${getIcon()}`}></i>
          )}
        </div>

        <div className="notification-body">
          {config.title && <div className="notification-title">{config.title}</div>}
          <div className="notification-message">{config.message}</div>
          {config.description && <div className="notification-description">{config.description}</div>}
          {renderActions()}
        </div>

        {renderImage()}

        {config.dismissible !== false && (
          <div className="notification-close">
            <IconOnlyButton
              className="notification-close-btn"
              onClick={handleClose}
              label="Fechar"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </IconOnlyButton>
          </div>
        )}
      </div>

      {renderProgress()}
    </div>
  );
};

export default Notification;
