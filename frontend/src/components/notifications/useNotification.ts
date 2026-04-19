import { useState, useCallback, useRef, useEffect } from 'react';
import { UseNotificationOptions, UseNotificationReturn, NotificationState, NotificationConfig } from './types';

export const useNotification = (options: UseNotificationOptions = {}): UseNotificationReturn => {
  const {
    defaultConfig = {},
    maxNotifications = 5,
    defaultPosition = 'top-right',
    defaultDuration = 5000,
    defaultAnimation = 'slide',
    defaultSize = 'md',
    pauseOnHover = true,
    pauseOnFocus = true,
    closeOnClick = false,
    showProgress = true,
    zIndex = 999999,
  } = options;

  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearDismissTimer = useCallback((id: string) => {
    const timer = dismissTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimersRef.current.delete(id);
    }
  }, []);

  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const removeNotification = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === id);
        if (!notification) {
          return prev;
        }
        notification.config.onHide?.();
        return prev.filter((n) => n.id !== id);
      });
      clearDismissTimer(id);
    },
    [clearDismissTimer]
  );

  const addNotification = useCallback(
    (config: NotificationConfig): string => {
      const id = config.id || generateId();
      const now = Date.now();

      const { type: _defaultType, ...defaultConfigWithoutType } = defaultConfig;

      const notificationState: NotificationState = {
        id,
        config: {
          ...defaultConfigWithoutType,
          position: config.position || defaultPosition,
          animation: config.animation || defaultAnimation,
          size: config.size || defaultSize,
          duration: config.duration !== undefined ? config.duration : defaultDuration,
          pauseOnHover: config.pauseOnHover !== undefined ? config.pauseOnHover : pauseOnHover,
          pauseOnFocus: config.pauseOnFocus !== undefined ? config.pauseOnFocus : pauseOnFocus,
          closeOnClick: config.closeOnClick !== undefined ? config.closeOnClick : closeOnClick,
          showProgress: config.showProgress !== undefined ? config.showProgress : showProgress,
          zIndex: config.zIndex || zIndex,
          ...config,
          type: config.type || 'info',
        },
        isVisible: true,
        isAnimating: false,
        isPaused: false,
        progress: 0,
        timeRemaining: config.duration !== undefined ? config.duration : defaultDuration,
        createdAt: now,
        updatedAt: now,
      };

      setNotifications((prev) => {
        const merged = [...prev, notificationState];
        if (merged.length <= maxNotifications) {
          return merged;
        }
        const sorted = [...merged].sort((a, b) => a.createdAt - b.createdAt);
        const oldest = sorted[0];
        if (oldest) {
          oldest.config.onHide?.();
          clearDismissTimer(oldest.id);
        }
        return sorted.slice(1);
      });

      config.onShow?.();

      const duration = notificationState.config.duration || 0;
      if (duration > 0) {
        const timer = setTimeout(() => {
          removeNotification(id);
        }, duration);
        dismissTimersRef.current.set(id, timer);
      }

      return id;
    },
    [
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
      generateId,
      removeNotification,
      clearDismissTimer,
    ]
  );

  const updateNotification = useCallback((id: string, updates: Partial<NotificationConfig>) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              config: { ...n.config, ...updates },
              updatedAt: Date.now(),
            }
          : n
      )
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    dismissTimersRef.current.forEach((timer) => clearTimeout(timer));
    dismissTimersRef.current.clear();
    setNotifications([]);
  }, []);

  const pauseNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPaused: true } : n))
    );
    clearDismissTimer(id);
  }, [clearDismissTimer]);

  const resumeNotification = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isPaused: false } : n))
      );

      const notification = notifications.find((n) => n.id === id);
      if (notification && (notification.config.duration || 0) > 0) {
        const timer = setTimeout(() => {
          removeNotification(id);
        }, notification.timeRemaining);

        dismissTimersRef.current.set(id, timer);
      }
    },
    [notifications, removeNotification]
  );

  const pauseAllNotifications = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isPaused: true })));
    dismissTimersRef.current.forEach((timer) => clearTimeout(timer));
    dismissTimersRef.current.clear();
  }, []);

  const resumeAllNotifications = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isPaused: false })));

    notifications.forEach((notification) => {
      if ((notification.config.duration || 0) > 0) {
        const timer = setTimeout(() => {
          removeNotification(notification.id);
        }, notification.timeRemaining);

        dismissTimersRef.current.set(notification.id, timer);
      }
    });
  }, [notifications, removeNotification]);

  const success = useCallback(
    (message: string, options: Partial<NotificationConfig> | number = {}) => {
      const opts = typeof options === 'number' ? { duration: options } : options;
      const { type: _type, ...restOpts } = opts;

      return addNotification({
        ...restOpts,
        message,
        type: 'success',
      });
    },
    [addNotification]
  );

  const error = useCallback(
    (message: string, options: Partial<NotificationConfig> | number = {}) => {
      const opts = typeof options === 'number' ? { duration: options } : options;
      return addNotification({
        type: 'error',
        message,
        ...opts,
      });
    },
    [addNotification]
  );

  const warning = useCallback(
    (message: string, options: Partial<NotificationConfig> | number = {}) => {
      const opts = typeof options === 'number' ? { duration: options } : options;
      return addNotification({
        type: 'warning',
        message,
        ...opts,
      });
    },
    [addNotification]
  );

  const info = useCallback(
    (message: string, options: Partial<NotificationConfig> | number = {}) => {
      const opts = typeof options === 'number' ? { duration: options } : options;
      return addNotification({
        type: 'info',
        message,
        ...opts,
      });
    },
    [addNotification]
  );

  const loading = useCallback(
    (message: string, options: Partial<NotificationConfig> = {}) => {
      return addNotification({
        type: 'loading',
        message,
        duration: 0,
        ...options,
      });
    },
    [addNotification]
  );

  useEffect(() => {
    const timers = dismissTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return {
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
  };
};
