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
    zIndex = 9999,
  } = options;

  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const progressTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Gerar ID único para notificação
  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Remover notificação
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (!notification) return prev;

      // Chamar callback onHide
      notification.config.onHide?.();

      // Limpar timers
      const timer = timersRef.current.get(id);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }

      const progressTimer = progressTimersRef.current.get(id);
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimersRef.current.delete(id);
      }

      return prev.filter(n => n.id !== id);
    });
  }, []);

  // Adicionar notificação
  const addNotification = useCallback((config: NotificationConfig): string => {
    const id = config.id || generateId();
    const now = Date.now();
    
    const notificationState: NotificationState = {
      id,
      config: {
        ...defaultConfig,
        ...config,
        position: config.position || defaultPosition,
        animation: config.animation || defaultAnimation,
        size: config.size || defaultSize,
        duration: config.duration !== undefined ? config.duration : defaultDuration,
        pauseOnHover: config.pauseOnHover !== undefined ? config.pauseOnHover : pauseOnHover,
        pauseOnFocus: config.pauseOnFocus !== undefined ? config.pauseOnFocus : pauseOnFocus,
        closeOnClick: config.closeOnClick !== undefined ? config.closeOnClick : closeOnClick,
        showProgress: config.showProgress !== undefined ? config.showProgress : showProgress,
        zIndex: config.zIndex || zIndex,
      },
      isVisible: true,
      isAnimating: false,
      isPaused: false,
      progress: 0,
      timeRemaining: config.duration !== undefined ? config.duration : defaultDuration,
      createdAt: now,
      updatedAt: now,
    };

    setNotifications(prev => {
      // Verificar se já existe notificação com mesma mensagem e tipo
      const existingNotification = prev.find(n => 
        n.config.message === config.message && 
        n.config.type === config.type &&
        n.config.position === notificationState.config.position
      );
      
      if (existingNotification) {
        return prev;
      }

      // Limitar número máximo de notificações
      const newNotifications = [...prev, notificationState];
      if (newNotifications.length > maxNotifications) {
        // Remover a mais antiga
        newNotifications.sort((a, b) => a.createdAt - b.createdAt);
        newNotifications.shift();
      }

      return newNotifications;
    });

    // Chamar callback onShow
    config.onShow?.();

    // Configurar timer de remoção automática
    if ((notificationState.config.duration || 0) > 0) {
      const timer = setTimeout(() => {
        removeNotification(id);
      }, notificationState.config.duration || 0);
      
      timersRef.current.set(id, timer);
    }

    // Configurar timer de progresso
    if (notificationState.config.showProgress && (notificationState.config.duration || 0) > 0) {
      const progressInterval = 50; // Atualizar a cada 50ms
      const totalSteps = (notificationState.config.duration || 0) / progressInterval;
      let currentStep = 0;

      const progressTimer = setInterval(() => {
        currentStep++;
        const progress = (currentStep / totalSteps) * 100;
        
        setNotifications(prev => 
          prev.map(n => 
            n.id === id 
              ? { 
                  ...n, 
                  progress: Math.min(progress, 100),
                  timeRemaining: Math.max(0, (n.config.duration || 0) - (currentStep * progressInterval))
                }
              : n
          )
        );

        if (currentStep >= totalSteps) {
          clearInterval(progressTimer);
          progressTimersRef.current.delete(id);
        }
      }, progressInterval);

      progressTimersRef.current.set(id, progressTimer);
    }

    return id;
  }, [defaultConfig, maxNotifications, defaultPosition, defaultDuration, defaultAnimation, defaultSize, pauseOnHover, pauseOnFocus, closeOnClick, showProgress, zIndex, generateId, removeNotification]);

  // Atualizar notificação
  const updateNotification = useCallback((id: string, updates: Partial<NotificationConfig>) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === id 
          ? { 
              ...n, 
              config: { ...n.config, ...updates },
              updatedAt: Date.now()
            }
          : n
      )
    );
  }, []);

  // Limpar todas as notificações
  const clearAllNotifications = useCallback(() => {
    // Limpar todos os timers
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();
    
    progressTimersRef.current.forEach(timer => clearInterval(timer));
    progressTimersRef.current.clear();

    setNotifications([]);
  }, []);

  // Pausar notificação
  const pauseNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === id 
          ? { ...n, isPaused: true }
          : n
      )
    );

    // Pausar timers
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    const progressTimer = progressTimersRef.current.get(id);
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimersRef.current.delete(id);
    }
  }, []);

  // Retomar notificação
  const resumeNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === id 
          ? { ...n, isPaused: false }
          : n
      )
    );

    // Recriar timers
    const notification = notifications.find(n => n.id === id);
    if (notification && (notification.config.duration || 0) > 0) {
      const timer = setTimeout(() => {
        removeNotification(id);
      }, notification.timeRemaining);
      
      timersRef.current.set(id, timer);
    }
  }, [notifications, removeNotification]);

  // Pausar todas as notificações
  const pauseAllNotifications = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isPaused: true }))
    );

    // Pausar todos os timers
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();
    
    progressTimersRef.current.forEach(timer => clearInterval(timer));
    progressTimersRef.current.clear();
  }, []);

  // Retomar todas as notificações
  const resumeAllNotifications = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isPaused: false }))
    );

    // Recriar timers para todas as notificações
    notifications.forEach(notification => {
      if ((notification.config.duration || 0) > 0) {
        const timer = setTimeout(() => {
          removeNotification(notification.id);
        }, notification.timeRemaining);
        
        timersRef.current.set(notification.id, timer);
      }
    });
  }, [notifications, removeNotification]);

  // Métodos de conveniência
  const success = useCallback((message: string, options: Partial<NotificationConfig> = {}) => {
    return addNotification({
      type: 'success',
      message,
      ...options,
    });
  }, [addNotification]);

  const error = useCallback((message: string, options: Partial<NotificationConfig> = {}) => {
    return addNotification({
      type: 'error',
      message,
      ...options,
    });
  }, [addNotification]);

  const warning = useCallback((message: string, options: Partial<NotificationConfig> = {}) => {
    return addNotification({
      type: 'warning',
      message,
      ...options,
    });
  }, [addNotification]);

  const info = useCallback((message: string, options: Partial<NotificationConfig> = {}) => {
    return addNotification({
      type: 'info',
      message,
      ...options,
    });
  }, [addNotification]);

  const loading = useCallback((message: string, options: Partial<NotificationConfig> = {}) => {
    return addNotification({
      type: 'loading',
      message,
      duration: 0, // Não remove automaticamente
      ...options,
    });
  }, [addNotification]);

  // Limpar timers ao desmontar
  useEffect(() => {
    const timers = timersRef.current;
    const progressTimers = progressTimersRef.current;
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      progressTimers.forEach(timer => clearInterval(timer));
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
