import React from 'react';
import { useNotificationContext } from './NotificationProvider';
import NotificationContainer from './NotificationContainer';

/**
 * Container global de notificações.
 * Sempre visível em todas as rotas (login, home, adm, etc).
 */
const GlobalNotificationContainer: React.FC = () => {
  const {
    notifications,
    removeNotification,
    pauseNotification,
    resumeNotification,
  } = useNotificationContext();

  return (
    <NotificationContainer
      position="bottom-right"
      notifications={notifications}
      onRemove={removeNotification}
      onPause={pauseNotification}
      onResume={resumeNotification}
      onActionClick={() => {}}
    />
  );
};

export default GlobalNotificationContainer;
