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
    // Debug: log para identificar duplicações
    console.log('addNotification called:', { type, message, duration });
    
    // Verificar se já existe uma notificação com a mesma mensagem e tipo
    let notificationId: string | null = null;
    
    setNotifications(prev => {
      console.log('Current notifications:', prev.length);
      const existingNotification = prev.find(n => n.message === message && n.type === type);
      if (existingNotification) {
        console.log('Duplicate notification prevented:', message);
        return prev; // Não adicionar duplicata
      }
      
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      notificationId = id;
      const notification: Notification = { id, type, message, duration };
      console.log('Adding new notification:', notification);
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
