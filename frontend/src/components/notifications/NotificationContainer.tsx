import React from 'react';
import { NotificationContainerProps, NotificationState, NotificationAction } from './types';
import Notification from './Notification';

interface NotificationContainerComponentProps extends NotificationContainerProps {
  notifications: NotificationState[];
  onRemove: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onActionClick: (action: NotificationAction) => void;
}

const NotificationContainer: React.FC<NotificationContainerComponentProps> = ({
  position,
  maxNotifications = 5,
  spacing = 8,
  className = '',
  style = {},
  notifications,
  onRemove,
  onPause,
  onResume,
  onActionClick,
}) => {
  // Filtrar notificações por posição
  const filteredNotifications = notifications
    .filter(notification => notification.config.position === position)
    .slice(0, maxNotifications);

  // Se não há notificações, não renderizar
  if (filteredNotifications.length === 0) {
    return null;
  }

  // Obter classes CSS baseadas na posição
  const getContainerClasses = () => {
    const classes = ['notification-container'];
    
    classes.push(`notification-container-${position}`);
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  // Obter estilos baseados na posição
  const getContainerStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      ...style,
    };

    // Posicionamento baseado na posição
    switch (position) {
      case 'top-left':
        styles.top = '1rem';
        styles.left = '1rem';
        break;
      case 'top-center':
        styles.top = '1rem';
        styles.left = '50%';
        styles.transform = 'translateX(-50%)';
        break;
      case 'top-right':
        styles.top = '1rem';
        styles.right = '1rem';
        break;
      case 'bottom-left':
        styles.bottom = '1rem';
        styles.left = '1rem';
        break;
      case 'bottom-center':
        styles.bottom = '1rem';
        styles.left = '50%';
        styles.transform = 'translateX(-50%)';
        break;
      case 'bottom-right':
        styles.bottom = '1rem';
        styles.right = '1rem';
        break;
      default:
        styles.top = '1rem';
        styles.right = '1rem';
    }

    return styles;
  };

  // Obter estilos para cada notificação
  const getNotificationStyles = (index: number): React.CSSProperties => {
    const styles: React.CSSProperties = {};
    
    if (index > 0) {
      styles.marginTop = `${spacing}px`;
    }
    
    return styles;
  };

  return (
    <div
      className={getContainerClasses()}
      style={getContainerStyles()}
    >
      {filteredNotifications.map((notification, index) => (
        <div
          key={notification.id}
          style={getNotificationStyles(index)}
        >
          <Notification
            notification={notification}
            onRemove={onRemove}
            onPause={onPause}
            onResume={onResume}
            onActionClick={onActionClick}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
