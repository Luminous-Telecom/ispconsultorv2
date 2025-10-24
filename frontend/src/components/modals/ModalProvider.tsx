import React, { createContext, useContext, ReactNode, useState, useCallback, useRef, useEffect } from 'react';
import { ModalProviderProps, ModalContextValue, ModalState, ModalConfig } from './types';

const ModalContext = createContext<ModalContextValue | null>(null);

export const ModalProvider: React.FC<ModalProviderProps> = ({
  children,
  defaultConfig = {},
  maxZIndex = 1050,
  stackModals = true,
  preventBodyScroll = true,
  restoreFocusOnClose = true,
}) => {
  const [modals, setModals] = useState<Map<string, ModalState>>(new Map());
  const [config] = useState<ModalConfig>({
    size: 'lg',
    variant: 'default',
    animation: 'fade',
    backdrop: true,
    keyboard: true,
    scrollable: false,
    centered: true,
    fullscreen: false,
    draggable: true,
    resizable: false,
    closable: true,
    autoFocus: true,
    restoreFocus: true,
    focusTrap: true,
    showCloseButton: true,
    closeOnEscape: true,
    closeOnBackdropClick: true,
    closeOnOutsideClick: false,
    preventScroll: true,
    lockScroll: true,
    restoreScroll: true,
    ...defaultConfig,
  });

  const modalStack = useRef<string[]>([]);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Mostrar modal
  const showModal = useCallback((id: string, modalConfig?: Partial<ModalConfig>) => {
    setModals(prev => {
      const newModals = new Map(prev);
      
      // Calcular z-index baseado na pilha
      let zIndex = maxZIndex;
      if (stackModals) {
        zIndex = maxZIndex + modalStack.current.length;
      }

      // Salvar elemento ativo anterior
      if (restoreFocusOnClose) {
        previousActiveElement.current = document.activeElement as HTMLElement;
      }

      // Bloquear scroll do body
      if (preventBodyScroll) {
        document.body.style.overflow = 'hidden';
      }

      // Adicionar à pilha
      if (stackModals) {
        modalStack.current.push(id);
      }

      const modalState: ModalState = {
        isOpen: true,
        isVisible: true,
        isAnimating: false,
        isDragging: false,
        isResizing: false,
        position: { x: 0, y: 0 },
        size: { width: 0, height: 0 },
        zIndex,
        backdrop: Boolean(modalConfig?.backdrop ?? config.backdrop),
        keyboard: Boolean(modalConfig?.keyboard ?? config.keyboard),
        scrollable: Boolean(modalConfig?.scrollable ?? config.scrollable),
        centered: Boolean(modalConfig?.centered ?? config.centered),
        fullscreen: Boolean(modalConfig?.fullscreen ?? config.fullscreen),
        draggable: Boolean(modalConfig?.draggable ?? config.draggable),
        resizable: Boolean(modalConfig?.resizable ?? config.resizable),
        closable: Boolean(modalConfig?.closable ?? config.closable),
        autoFocus: Boolean(modalConfig?.autoFocus ?? config.autoFocus),
        restoreFocus: Boolean(modalConfig?.restoreFocus ?? config.restoreFocus),
        focusTrap: Boolean(modalConfig?.focusTrap ?? config.focusTrap),
        showCloseButton: Boolean(modalConfig?.showCloseButton ?? config.showCloseButton),
        closeOnEscape: Boolean(modalConfig?.closeOnEscape ?? config.closeOnEscape),
        closeOnBackdropClick: Boolean(modalConfig?.closeOnBackdropClick ?? config.closeOnBackdropClick),
        closeOnOutsideClick: Boolean(modalConfig?.closeOnOutsideClick ?? config.closeOnOutsideClick),
        preventScroll: Boolean(modalConfig?.preventScroll ?? config.preventScroll),
        lockScroll: Boolean(modalConfig?.lockScroll ?? config.lockScroll),
        restoreScroll: Boolean(modalConfig?.restoreScroll ?? config.restoreScroll),
      };

      newModals.set(id, modalState);
      return newModals;
    });

    // Chamar callback onShow
    modalConfig?.onShow?.();
  }, [maxZIndex, stackModals, restoreFocusOnClose, preventBodyScroll, config]);

  // Esconder modal
  const hideModal = useCallback((id: string) => {
    setModals(prev => {
      const newModals = new Map(prev);
      newModals.delete(id);
      return newModals;
    });

    // Remover da pilha
    if (stackModals) {
      modalStack.current = modalStack.current.filter(modalId => modalId !== id);
    }

    // Restaurar scroll do body se não há mais modais
    if (preventBodyScroll && modalStack.current.length === 0) {
      document.body.style.overflow = '';
    }

    // Restaurar foco se não há mais modais
    if (restoreFocusOnClose && modalStack.current.length === 0 && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [stackModals, preventBodyScroll, restoreFocusOnClose]);

  // Alternar modal
  const toggleModal = useCallback((id: string) => {
    const modalState = modals.get(id);
    if (modalState?.isOpen) {
      hideModal(id);
    } else {
      showModal(id);
    }
  }, [modals, showModal, hideModal]);

  // Fechar modal
  const closeModal = useCallback((id: string) => {
    const modalState = modals.get(id);
    if (modalState) {
      // Chamar callback onClose
      // TODO: Implementar callback onClose
      hideModal(id);
    }
  }, [modals, hideModal]);

  // Atualizar configuração do modal
  const updateModalConfig = useCallback((id: string, newConfig: Partial<ModalConfig>) => {
    setModals(prev => {
      const newModals = new Map(prev);
      const modalState = newModals.get(id);
      
      if (modalState) {
        const updatedState: ModalState = {
          ...modalState,
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
        };
        newModals.set(id, updatedState);
      }
      
      return newModals;
    });
  }, []);

  // Obter estado do modal
  const getModalState = useCallback((id: string) => {
    return modals.get(id);
  }, [modals]);

  // Obter modal do topo
  const getTopModal = useCallback(() => {
    if (modalStack.current.length === 0) return undefined;
    return modalStack.current[modalStack.current.length - 1];
  }, []);

  // Fechar todos os modais
  const closeAllModals = useCallback(() => {
    setModals(new Map());
    modalStack.current = [];
    
    // Restaurar scroll do body
    if (preventBodyScroll) {
      document.body.style.overflow = '';
    }

    // Restaurar foco
    if (restoreFocusOnClose && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [preventBodyScroll, restoreFocusOnClose]);

  // Gerenciar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const topModal = getTopModal();
        if (topModal) {
          const modalState = getModalState(topModal);
          if (modalState?.closeOnEscape) {
            closeModal(topModal);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [getTopModal, getModalState, closeModal]);

  const contextValue: ModalContextValue = {
    modals,
    config,
    showModal,
    hideModal,
    toggleModal,
    closeModal,
    updateModalConfig,
    getModalState,
    getTopModal,
    closeAllModals,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  );
};

// Hook para usar o contexto do modal
export const useModalContext = (): ModalContextValue => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext deve ser usado dentro de um ModalProvider');
  }
  return context;
};
