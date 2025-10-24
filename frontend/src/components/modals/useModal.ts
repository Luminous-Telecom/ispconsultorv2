import { useState, useCallback, useRef, useEffect } from 'react';
import { UseModalOptions, UseModalReturn, ModalState, ModalActions, ModalConfig } from './types';

export const useModal = (options: UseModalOptions = {}): UseModalReturn => {
  const {
    id,
    title,
    size = 'lg',
    variant = 'default',
    animation = 'fade',
    backdrop = true,
    keyboard = true,
    scrollable = false,
    centered = false,
    fullscreen = false,
    draggable = true,
    resizable = false,
    closable = true,
    className = '',
    headerClassName = '',
    bodyClassName = '',
    footerClassName = '',
    contentClassName = '',
    zIndex = 1050,
    autoFocus = true,
    restoreFocus = true,
    focusTrap = true,
    showCloseButton = true,
    closeOnEscape = true,
    closeOnBackdropClick = true,
    closeOnOutsideClick = false,
    preventScroll = true,
    lockScroll = true,
    restoreScroll = true,
    defaultOpen = false,
    onShow,
    onHide,
    onShown,
    onHidden,
    onClose,
    onConfirm,
    onCancel,
  } = options;

  // Estado do modal
  const [state, setState] = useState<ModalState>({
    isOpen: defaultOpen,
    isVisible: defaultOpen,
    isAnimating: false,
    isDragging: false,
    isResizing: false,
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    zIndex,
    backdrop: Boolean(backdrop),
    keyboard,
    scrollable,
    centered,
    fullscreen: Boolean(fullscreen),
    draggable,
    resizable,
    closable,
    autoFocus,
    restoreFocus,
    focusTrap,
    showCloseButton,
    closeOnEscape,
    closeOnBackdropClick,
    closeOnOutsideClick,
    preventScroll,
    lockScroll,
    restoreScroll,
  });

  // Referências
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Configuração do modal
  const config: ModalConfig = {
    id,
    title,
    size,
    variant,
    animation,
    backdrop,
    keyboard,
    scrollable,
    centered,
    fullscreen,
    draggable,
    resizable,
    closable,
    className,
    headerClassName,
    bodyClassName,
    footerClassName,
    contentClassName,
    zIndex,
    autoFocus,
    restoreFocus,
    focusTrap,
    showCloseButton,
    closeOnEscape,
    closeOnBackdropClick,
    closeOnOutsideClick,
    preventScroll,
    lockScroll,
    restoreScroll,
    onShow,
    onHide,
    onShown,
    onHidden,
    onClose,
    onConfirm,
    onCancel,
  };

  // Calcular tamanho do modal baseado no tipo
  const getModalSize = useCallback(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    switch (size) {
      case 'sm':
        return { width: Math.min(400, screenWidth * 0.9), height: 'auto' };
      case 'md':
        return { width: Math.min(600, screenWidth * 0.9), height: 'auto' };
      case 'lg':
        return { width: Math.min(800, screenWidth * 0.9), height: 'auto' };
      case 'xl':
        return { width: Math.min(1000, screenWidth * 0.9), height: 'auto' };
      case 'a4':
        return { width: 980, height: 'auto' };
      case 'fullscreen':
        return { width: screenWidth, height: screenHeight };
      default:
        return { width: Math.min(800, screenWidth * 0.9), height: 'auto' };
    }
  }, [size]);

  // Calcular posição centralizada
  const getCenteredPosition = useCallback(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const modalSize = getModalSize();
    
    const modalWidth = typeof modalSize.width === 'number' ? modalSize.width : 800;
    const modalHeight = typeof modalSize.height === 'number' ? modalSize.height : 600;
    
    return {
      x: (screenWidth - modalWidth) / 2,
      y: (screenHeight - modalHeight) / 2,
    };
  }, [getModalSize]);

  // Mostrar modal
  const show = useCallback(() => {
    if (state.isOpen) return;

    // Salvar elemento ativo anterior
    if (restoreFocus) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }

    // Bloquear scroll do body
    if (preventScroll || lockScroll) {
      document.body.style.overflow = 'hidden';
    }

    // Calcular posição e tamanho
    const modalSize = getModalSize();
    const position = centered ? getCenteredPosition() : { x: 0, y: 0 };

    // Converter altura para número se necessário
    const size = {
      width: typeof modalSize.width === 'number' ? modalSize.width : 800,
      height: typeof modalSize.height === 'number' ? modalSize.height : 600,
    };

    setState(prev => ({
      ...prev,
      isOpen: true,
      isAnimating: true,
      position,
      size,
    }));

    // Chamar callback onShow
    onShow?.();

    // Aguardar animação de entrada
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    animationTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isVisible: true,
        isAnimating: false,
      }));
      
      // Chamar callback onShown
      onShown?.();
      
      // Focar no modal
      if (autoFocus && modalRef.current) {
        modalRef.current.focus();
      }
    }, 100);
  }, [state.isOpen, restoreFocus, preventScroll, lockScroll, centered, getModalSize, getCenteredPosition, onShow, onShown, autoFocus, animation]);

  // Esconder modal
  const hide = useCallback(() => {
    if (!state.isOpen) return;

    setState(prev => ({
      ...prev,
      isVisible: false,
      isAnimating: true,
    }));

    // Chamar callback onHide
    onHide?.();

    // Aguardar animação de saída
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    animationTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isOpen: false,
        isAnimating: false,
      }));

      // Restaurar scroll do body
      if (preventScroll || lockScroll) {
        document.body.style.overflow = '';
      }

      // Restaurar foco
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }

      // Chamar callback onHidden
      onHidden?.();
    }, 300);
  }, [state.isOpen, onHide, onHidden, preventScroll, lockScroll, restoreFocus]);

  // Alternar modal
  const toggle = useCallback(() => {
    if (state.isOpen) {
      hide();
    } else {
      show();
    }
  }, [state.isOpen, show, hide]);

  // Fechar modal
  const close = useCallback(() => {
    hide();
    onClose?.();
  }, [hide, onClose]);

  // Confirmar modal
  const confirm = useCallback(() => {
    onConfirm?.();
    close();
  }, [onConfirm, close]);

  // Cancelar modal
  const cancel = useCallback(() => {
    onCancel?.();
    close();
  }, [onCancel, close]);

  // Definir posição
  const setPosition = useCallback((position: { x: number; y: number }) => {
    setState(prev => ({ ...prev, position }));
  }, []);

  // Definir tamanho
  const setSize = useCallback((size: { width: number; height: number }) => {
    setState(prev => ({ ...prev, size }));
  }, []);

  // Definir z-index
  const setZIndex = useCallback((zIndex: number) => {
    setState(prev => ({ ...prev, zIndex }));
  }, []);

  // Centralizar modal
  const center = useCallback(() => {
    const position = getCenteredPosition();
    setPosition(position);
  }, [getCenteredPosition, setPosition]);

  // Maximizar modal
  const maximize = useCallback(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    setSize({ width: screenWidth, height: screenHeight });
    setPosition({ x: 0, y: 0 });
  }, [setSize, setPosition]);

  // Minimizar modal
  const minimize = useCallback(() => {
    // Implementar lógica de minimização se necessário
  }, []);

  // Restaurar modal
  const restore = useCallback(() => {
    const modalSize = getModalSize();
    const position = centered ? getCenteredPosition() : { x: 0, y: 0 };
    
    // Converter altura para número se necessário
    const size = {
      width: typeof modalSize.width === 'number' ? modalSize.width : 800,
      height: typeof modalSize.height === 'number' ? modalSize.height : 600,
    };
    
    setSize(size);
    setPosition(position);
  }, [getModalSize, getCenteredPosition, centered, setSize, setPosition]);

  // Focar no modal
  const focus = useCallback(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  // Remover foco do modal
  const blur = useCallback(() => {
    if (modalRef.current) {
      modalRef.current.blur();
    }
  }, []);

  // Atualizar configuração
  const updateConfig = useCallback((newConfig: Partial<ModalConfig>) => {
    setState(prev => ({
      ...prev,
      // Filtrar apenas propriedades que existem em ModalState
      ...(newConfig.backdrop !== undefined && { backdrop: Boolean(newConfig.backdrop) }),
      ...(newConfig.keyboard !== undefined && { keyboard: Boolean(newConfig.keyboard) }),
      ...(newConfig.scrollable !== undefined && { scrollable: Boolean(newConfig.scrollable) }),
      ...(newConfig.centered !== undefined && { centered: Boolean(newConfig.centered) }),
      ...(newConfig.fullscreen !== undefined && { fullscreen: Boolean(newConfig.fullscreen) }),
      ...(newConfig.draggable !== undefined && { draggable: Boolean(newConfig.draggable) }),
      ...(newConfig.resizable !== undefined && { resizable: Boolean(newConfig.resizable) }),
      ...(newConfig.closable !== undefined && { closable: Boolean(newConfig.closable) }),
      ...(newConfig.autoFocus !== undefined && { autoFocus: Boolean(newConfig.autoFocus) }),
      ...(newConfig.restoreFocus !== undefined && { restoreFocus: Boolean(newConfig.restoreFocus) }),
      ...(newConfig.focusTrap !== undefined && { focusTrap: Boolean(newConfig.focusTrap) }),
      ...(newConfig.showCloseButton !== undefined && { showCloseButton: Boolean(newConfig.showCloseButton) }),
      ...(newConfig.closeOnEscape !== undefined && { closeOnEscape: Boolean(newConfig.closeOnEscape) }),
      ...(newConfig.closeOnBackdropClick !== undefined && { closeOnBackdropClick: Boolean(newConfig.closeOnBackdropClick) }),
      ...(newConfig.closeOnOutsideClick !== undefined && { closeOnOutsideClick: Boolean(newConfig.closeOnOutsideClick) }),
      ...(newConfig.preventScroll !== undefined && { preventScroll: Boolean(newConfig.preventScroll) }),
      ...(newConfig.lockScroll !== undefined && { lockScroll: Boolean(newConfig.lockScroll) }),
      ...(newConfig.restoreScroll !== undefined && { restoreScroll: Boolean(newConfig.restoreScroll) }),
      ...(newConfig.zIndex !== undefined && { zIndex: newConfig.zIndex }),
    }));
  }, []);

  // Ações do modal
  const actions: ModalActions = {
    show,
    hide,
    toggle,
    close,
    confirm,
    cancel,
    setPosition,
    setSize,
    setZIndex,
    center,
    maximize,
    minimize,
    restore,
    focus,
    blur,
    updateConfig,
  };

  // Limpar timeouts ao desmontar
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    actions,
    config,
    isOpen: state.isOpen,
    isVisible: state.isVisible,
    isAnimating: state.isAnimating,
    show,
    hide,
    toggle,
    close,
    confirm,
    cancel,
  };
};
