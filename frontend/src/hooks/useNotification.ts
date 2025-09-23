import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export const useNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((
    type: Notification['type'],
    message: string,
    duration: number = 5000
  ) => {
    const id = Date.now().toString();
    const notification: Notification = { id, type, message, duration };
    
    setNotifications(prev => [...prev, notification]);

    // Auto remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback((message: string, duration?: number) => {
    return addNotification('success', message, duration);
  }, [addNotification]);

  const error = useCallback((message: string, duration?: number) => {
    return addNotification('error', message, duration);
  }, [addNotification]);

  const warning = useCallback((message: string, duration?: number) => {
    return addNotification('warning', message, duration);
  }, [addNotification]);

  const info = useCallback((message: string, duration?: number) => {
    return addNotification('info', message, duration);
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    success,
    error,
    warning,
    info,
  };
};
