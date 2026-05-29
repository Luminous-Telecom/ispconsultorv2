import React from 'react';
import { NotificationContainer } from 'components/notifications';

export interface CentralAssinanteNotificationsProps {
  notifications: Parameters<typeof NotificationContainer>[0]['notifications'];
  removeNotification: (id: string) => void;
  pauseNotification: (id: string) => void;
  resumeNotification: (id: string) => void;
}

const CentralAssinanteNotifications: React.FC<CentralAssinanteNotificationsProps> = ({
  notifications,
  removeNotification,
  pauseNotification,
  resumeNotification,
}) => (
  <NotificationContainer
    position="bottom-right"
    notifications={notifications}
    onRemove={removeNotification}
    onPause={pauseNotification}
    onResume={resumeNotification}
    onActionClick={() => {}}
  />
);

export default CentralAssinanteNotifications;
