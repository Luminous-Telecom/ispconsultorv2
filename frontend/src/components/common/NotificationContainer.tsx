import React from 'react';
import Alert from './Alert';
import { Notification } from '../../hooks/useNotification';

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
        <div key={notification.id} className="notification fade-in">
          <Alert
            type={notification.type}
            message={notification.message}
            onClose={() => onRemove(notification.id)}
            dismissible={true}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
