import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import { useElementProperties } from 'hooks/useElementProperties';
import { NotificationContainerProps, NotificationState, NotificationAction } from './types';
import Notification from './Notification';

interface NotificationContainerComponentProps extends NotificationContainerProps {
  notifications: NotificationState[];
  onRemove: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onActionClick: (action: NotificationAction) => void;
}

const NotificationStackItem: React.FC<{
  spacing: number;
  isFirst: boolean;
  children: React.ReactNode;
}> = ({ spacing, isFirst, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useElementProperties(ref, { marginTop: isFirst ? undefined : `${spacing}px` }, [spacing, isFirst]);

  return <div ref={ref}>{children}</div>;
};

const NotificationContainer: React.FC<NotificationContainerComponentProps> = ({
  position,
  maxNotifications = 5,
  spacing = 8,
  className = '',
  style = {},
  notifications,
  onRemove,
  onPause,
  onResume,
  onActionClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredNotifications = notifications
    .filter((notification) => notification.config.position === position)
    .slice(0, maxNotifications);

  useElementProperties(containerRef, style as Record<string, string | number | undefined>, [style]);

  if (filteredNotifications.length === 0) {
    return null;
  }

  const getContainerClasses = () => {
    const classes = ['notification-container'];
    classes.push(`notification-container-${position}`);
    if (className) {
      classes.push(className);
    }
    return classes.join(' ');
  };

  const containerContent = (
    <div ref={containerRef} className={getContainerClasses()}>
      {filteredNotifications.map((notification, index) => (
        <NotificationStackItem key={notification.id} spacing={spacing} isFirst={index === 0}>
          <Notification
            notification={notification}
            onRemove={onRemove}
            onPause={onPause}
            onResume={onResume}
            onActionClick={onActionClick}
          />
        </NotificationStackItem>
      ))}
    </div>
  );

  return ReactDOM.createPortal(containerContent, document.body);
};

export default NotificationContainer;
