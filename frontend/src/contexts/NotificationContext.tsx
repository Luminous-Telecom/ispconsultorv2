import React, { createContext, useContext, ReactNode } from 'react';
import { useNotification } from '../hooks/useNotification';

interface NotificationContextType {
  notifications: ReturnType<typeof useNotification>['notifications'];
  addNotification: ReturnType<typeof useNotification>['addNotification'];
  removeNotification: ReturnType<typeof useNotification>['removeNotification'];
  clearAllNotifications: ReturnType<typeof useNotification>['clearAllNotifications'];
  success: ReturnType<typeof useNotification>['success'];
  error: ReturnType<typeof useNotification>['error'];
  warning: ReturnType<typeof useNotification>['warning'];
  info: ReturnType<typeof useNotification>['info'];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const notificationHook = useNotification();

  return (
    <NotificationContext.Provider value={notificationHook}>
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
