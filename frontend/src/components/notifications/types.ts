// Tipos para sistema de notificações unificado

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type NotificationPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type NotificationAnimation = 'slide' | 'fade' | 'zoom' | 'bounce' | 'none';
export type NotificationSize = 'sm' | 'md' | 'lg';

export interface NotificationAction {
  key: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger' | 'outline-warning' | 'outline-info' | 'outline-light' | 'outline-dark';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  onClick: () => void;
}

export interface NotificationConfig {
  id?: string;
  type: NotificationType;
  title?: string;
  message: string;
  description?: string;
  icon?: string;
  image?: string;
  actions?: NotificationAction[];
  position?: NotificationPosition;
  animation?: NotificationAnimation;
  size?: NotificationSize;
  duration?: number; // 0 = não remove automaticamente
  dismissible?: boolean;
  pauseOnHover?: boolean;
  pauseOnFocus?: boolean;
  closeOnClick?: boolean;
  showProgress?: boolean;
  progressColor?: string;
  className?: string;
  style?: React.CSSProperties;
  zIndex?: number;
  maxWidth?: string | number;
  maxHeight?: string | number;
  onShow?: () => void;
  onHide?: () => void;
  onShown?: () => void;
  onHidden?: () => void;
  onClose?: () => void;
  onClick?: () => void;
  onActionClick?: (action: NotificationAction) => void;
}

export interface NotificationState {
  id: string;
  config: NotificationConfig;
  isVisible: boolean;
  isAnimating: boolean;
  isPaused: boolean;
  progress: number;
  timeRemaining: number;
  createdAt: number;
  updatedAt: number;
}

export interface NotificationContainerProps {
  position: NotificationPosition;
  maxNotifications?: number;
  spacing?: number;
  className?: string;
  style?: React.CSSProperties;
}

export interface NotificationProviderProps {
  children: React.ReactNode;
  defaultConfig?: Partial<NotificationConfig>;
  maxNotifications?: number;
  defaultPosition?: NotificationPosition;
  defaultDuration?: number;
  defaultAnimation?: NotificationAnimation;
  defaultSize?: NotificationSize;
  pauseOnHover?: boolean;
  pauseOnFocus?: boolean;
  closeOnClick?: boolean;
  showProgress?: boolean;
  zIndex?: number;
}

export interface NotificationContextValue {
  notifications: NotificationState[];
  config: Partial<NotificationConfig>;
  addNotification: (config: NotificationConfig) => string;
  removeNotification: (id: string) => void;
  updateNotification: (id: string, updates: Partial<NotificationConfig>) => void;
  clearAllNotifications: () => void;
  pauseNotification: (id: string) => void;
  resumeNotification: (id: string) => void;
  pauseAllNotifications: () => void;
  resumeAllNotifications: () => void;
  // Métodos de conveniência
  success: (message: string, options?: Partial<NotificationConfig>) => string;
  error: (message: string, options?: Partial<NotificationConfig>) => string;
  warning: (message: string, options?: Partial<NotificationConfig>) => string;
  info: (message: string, options?: Partial<NotificationConfig>) => string;
  loading: (message: string, options?: Partial<NotificationConfig>) => string;
}

export interface UseNotificationOptions {
  defaultConfig?: Partial<NotificationConfig>;
  maxNotifications?: number;
  defaultPosition?: NotificationPosition;
  defaultDuration?: number;
  defaultAnimation?: NotificationAnimation;
  defaultSize?: NotificationSize;
  pauseOnHover?: boolean;
  pauseOnFocus?: boolean;
  closeOnClick?: boolean;
  showProgress?: boolean;
  zIndex?: number;
}

export interface UseNotificationReturn {
  notifications: NotificationState[];
  addNotification: (config: NotificationConfig) => string;
  removeNotification: (id: string) => void;
  updateNotification: (id: string, updates: Partial<NotificationConfig>) => void;
  clearAllNotifications: () => void;
  pauseNotification: (id: string) => void;
  resumeNotification: (id: string) => void;
  pauseAllNotifications: () => void;
  resumeAllNotifications: () => void;
  // Métodos de conveniência
  success: (message: string, options?: Partial<NotificationConfig>) => string;
  error: (message: string, options?: Partial<NotificationConfig>) => string;
  warning: (message: string, options?: Partial<NotificationConfig>) => string;
  info: (message: string, options?: Partial<NotificationConfig>) => string;
  loading: (message: string, options?: Partial<NotificationConfig>) => string;
}

// Tipos para eventos
export interface NotificationEvent {
  type: 'add' | 'remove' | 'update' | 'pause' | 'resume' | 'clear' | 'click' | 'action';
  notificationId: string;
  data?: any;
  action?: NotificationAction;
}

// Tipos para configuração de posicionamento
export interface PositionConfig {
  position: NotificationPosition;
  offset: { x: number; y: number };
  spacing: number;
  maxWidth: string | number;
  maxHeight: string | number;
  zIndex: number;
}

// Tipos para configuração de animações
export interface AnimationConfig {
  enter: {
    duration: number;
    timing: string;
    delay?: number;
  };
  exit: {
    duration: number;
    timing: string;
    delay?: number;
  };
  pause?: {
    duration: number;
    timing: string;
  };
}

// Tipos para configuração de progresso
export interface ProgressConfig {
  enabled: boolean;
  color: string;
  height: number;
  showPercentage: boolean;
  format?: (progress: number) => string;
}

// Tipos para configuração de agrupamento
export interface GroupConfig {
  enabled: boolean;
  maxGroupSize: number;
  groupBy: 'type' | 'position' | 'time';
  collapseThreshold: number;
  showCount: boolean;
}

// Tipos para configuração de persistência
export interface PersistenceConfig {
  enabled: boolean;
  storage: 'localStorage' | 'sessionStorage' | 'memory';
  key: string;
  maxAge: number;
  encrypt: boolean;
}

// Tipos para configuração de acessibilidade
export interface AccessibilityConfig {
  announce: boolean;
  announceDelay: number;
  role: string;
  ariaLabel: string;
  ariaDescription: string;
  focusable: boolean;
  tabIndex: number;
}

// Tipos para configuração de tema
export interface ThemeConfig {
  light: {
    background: string;
    text: string;
    border: string;
    shadow: string;
  };
  dark: {
    background: string;
    text: string;
    border: string;
    shadow: string;
  };
  custom?: {
    background: string;
    text: string;
    border: string;
    shadow: string;
  };
}
