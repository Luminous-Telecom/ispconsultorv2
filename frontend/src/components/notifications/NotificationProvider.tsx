import React, { createContext, useContext } from 'react';
import { NotificationProviderProps, NotificationContextValue } from './types';
import { useNotification } from './useNotification';

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  defaultConfig = {},
  maxNotifications = 5,
  defaultPosition = 'bottom-right',
  defaultDuration = 2000,
  defaultAnimation = 'slide',
  defaultSize = 'md',
  pauseOnHover = true,
  pauseOnFocus = true,
  closeOnClick = false,
  showProgress = true,
  zIndex = 9999,
}) => {
  const {
    notifications,
    addNotification,
    removeNotification,
    updateNotification,
    clearAllNotifications,
    pauseNotification,
    resumeNotification,
    pauseAllNotifications,
    resumeAllNotifications,
    success,
    error,
    warning,
    info,
    loading,
  } = useNotification({
    defaultConfig,
    maxNotifications,
    defaultPosition,
    defaultDuration,
    defaultAnimation,
    defaultSize,
    pauseOnHover,
    pauseOnFocus,
    closeOnClick,
    showProgress,
    zIndex,
  });

  const contextValue: NotificationContextValue = {
    notifications,
    config: defaultConfig,
    addNotification,
    removeNotification,
    updateNotification,
    clearAllNotifications,
    pauseNotification,
    resumeNotification,
    pauseAllNotifications,
    resumeAllNotifications,
    success,
    error,
    warning,
    info,
    loading,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook para usar o contexto de notificações
export const useNotificationContext = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext deve ser usado dentro de um NotificationProvider');
  }
  return context;
};
