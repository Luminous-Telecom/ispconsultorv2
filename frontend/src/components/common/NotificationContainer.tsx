import React from 'react';
import Alert from './Alert';
import { Notification } from '../../contexts/NotificationContext';

interface NotificationContainerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({ 
  notifications, 
  onRemove 
}) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <Alert
          key={notification.id}
          type={notification.type}
          message={notification.message}
          onClose={() => onRemove(notification.id)}
          dismissible={true}
          duration={notification.duration || 3000}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
