import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: Notification['type'], message: string, duration?: number) => string | null;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  success: (message: string, duration?: number) => string | null;
  error: (message: string, duration?: number) => string | null;
  warning: (message: string, duration?: number) => string | null;
  info: (message: string, duration?: number) => string | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((
    type: Notification['type'],
    message: string,
    duration: number = 5000
  ) => {
    let notificationId: string | null = null;
    
    setNotifications(prev => {
      const existingNotification = prev.find(n => n.message === message && n.type === type);
      if (existingNotification) {
        return prev;
      }
      
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      notificationId = id;
      const notification: Notification = { id, type, message, duration };
      return [...prev, notification];
    });

    // Auto remove notification after duration
    if (duration > 0 && notificationId) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }, duration);
    }

    return notificationId;
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

  const contextValue = useMemo(() => ({
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    success,
    error,
    warning,
    info,
  }), [notifications, addNotification, removeNotification, clearAllNotifications, success, error, warning, info]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};
