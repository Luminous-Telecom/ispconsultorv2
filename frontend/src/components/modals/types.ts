// Tipos para sistema de modais unificado

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'a4' | 'fullscreen';
export type ModalVariant = 'default' | 'centered' | 'scrollable' | 'static';
export type ModalAnimation = 'fade' | 'slide' | 'zoom' | 'none';

export interface ModalConfig {
  id?: string;
  show?: boolean;
  title?: string;
  size?: ModalSize;
  variant?: ModalVariant;
  animation?: ModalAnimation;
  backdrop?: boolean | 'static';
  keyboard?: boolean;
  scrollable?: boolean;
  centered?: boolean;
  fullscreen?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  draggable?: boolean;
  resizable?: boolean;
  closable?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  contentClassName?: string;
  zIndex?: number;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  focusTrap?: boolean;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnOutsideClick?: boolean;
  preventScroll?: boolean;
  lockScroll?: boolean;
  restoreScroll?: boolean;
  onShow?: () => void;
  onHide?: () => void;
  onShown?: () => void;
  onHidden?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface ModalHeaderProps {
  title?: string;
  subtitle?: string;
  icon?: string;
  actions?: React.ReactNode;
  closeButton?: boolean;
  onClose?: () => void;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.MouseEvent) => void;
  onDrag?: (e: React.MouseEvent) => void;
  onDragEnd?: (e: React.MouseEvent) => void;
}

export interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  maxHeight?: string | number;
  overflow?: 'auto' | 'hidden' | 'scroll' | 'visible';
}

export interface ModalFooterProps {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  sticky?: boolean;
}

export interface ModalAction {
  key: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger' | 'outline-warning' | 'outline-info' | 'outline-light' | 'outline-dark';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  hidden?: boolean;
  onClick: () => void;
  confirm?: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  };
}

export interface ModalState {
  isOpen: boolean;
  isVisible: boolean;
  isAnimating: boolean;
  isDragging: boolean;
  isResizing: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  backdrop: boolean;
  keyboard: boolean;
  scrollable: boolean;
  centered: boolean;
  fullscreen: boolean | string;
  draggable: boolean;
  resizable: boolean;
  closable: boolean;
  autoFocus: boolean;
  restoreFocus: boolean;
  focusTrap: boolean;
  showCloseButton: boolean;
  closeOnEscape: boolean;
  closeOnBackdropClick: boolean;
  closeOnOutsideClick: boolean;
  preventScroll: boolean;
  lockScroll: boolean;
  restoreScroll: boolean;
}

export interface ModalActions {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  close: () => void;
  confirm: () => void;
  cancel: () => void;
  setPosition: (position: { x: number; y: number }) => void;
  setSize: (size: { width: number; height: number }) => void;
  setZIndex: (zIndex: number) => void;
  center: () => void;
  maximize: () => void;
  minimize: () => void;
  restore: () => void;
  focus: () => void;
  blur: () => void;
  updateConfig: (config: Partial<ModalConfig>) => void;
}

export interface UseModalOptions extends Partial<ModalConfig> {
  defaultOpen?: boolean;
  onShow?: () => void;
  onHide?: () => void;
  onShown?: () => void;
  onHidden?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface UseModalReturn {
  state: ModalState;
  actions: ModalActions;
  config: ModalConfig;
  isOpen: boolean;
  isVisible: boolean;
  isAnimating: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  close: () => void;
  confirm: () => void;
  cancel: () => void;
}

export interface ModalProviderProps {
  children: React.ReactNode;
  defaultConfig?: Partial<ModalConfig>;
  maxZIndex?: number;
  stackModals?: boolean;
  preventBodyScroll?: boolean;
  restoreFocusOnClose?: boolean;
}

export interface ModalContextValue {
  modals: Map<string, ModalState>;
  config: ModalConfig;
  showModal: (id: string, config?: Partial<ModalConfig>) => void;
  hideModal: (id: string) => void;
  toggleModal: (id: string) => void;
  closeModal: (id: string) => void;
  updateModalConfig: (id: string, config: Partial<ModalConfig>) => void;
  getModalState: (id: string) => ModalState | undefined;
  getTopModal: () => string | undefined;
  closeAllModals: () => void;
}

// Tipos para eventos
export interface ModalEvent {
  type: 'show' | 'hide' | 'shown' | 'hidden' | 'close' | 'confirm' | 'cancel' | 'drag' | 'resize';
  modalId: string;
  data?: unknown;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
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
}

// Tipos para configuração de posicionamento
export interface PositionConfig {
  x: number | 'center' | 'left' | 'right';
  y: number | 'center' | 'top' | 'bottom';
  offset?: { x: number; y: number };
  constraint?: 'viewport' | 'parent' | 'none';
  margin?: { top: number; right: number; bottom: number; left: number };
}

// Tipos para configuração de redimensionamento
export interface ResizeConfig {
  enabled: boolean;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  handles?: ('n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw')[];
  aspectRatio?: number;
  grid?: { x: number; y: number };
}

// Tipos para configuração de arrastar
export interface DragConfig {
  enabled: boolean;
  handle?: string;
  cursor?: string;
  constraint?: 'viewport' | 'parent' | 'none';
  grid?: { x: number; y: number };
  snap?: { x: number; y: number };
  inertia?: boolean;
  threshold?: number;
}
