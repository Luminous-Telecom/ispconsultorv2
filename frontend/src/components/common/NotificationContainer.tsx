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
    <div 
      className="position-fixed top-0 end-0 p-3" 
      style={{ 
        zIndex: 9999, 
        maxWidth: '400px',
        width: '100%'
      }}
    >
      {notifications.map(notification => (
        <div key={notification.id} className="mb-2">
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
