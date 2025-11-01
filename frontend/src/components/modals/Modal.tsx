import React, { useRef, useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ModalConfig, ModalAction } from './types';
import { useModal } from './useModal';
import ModalHeader from './ModalHeader';
import ModalBody from './ModalBody';
import ModalFooter from './ModalFooter';
import Button from '../ui/Button';

interface ModalProps {
  config: ModalConfig;
  children?: React.ReactNode;
  header?: React.ReactNode;
  body?: React.ReactNode;
  footer?: React.ReactNode;
  actions?: ModalAction[];
  onActionClick?: (action: ModalAction) => void;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  config,
  children,
  header,
  body,
  footer,
  actions = [],
  onActionClick,
  className = '',
}) => {
  const {
    state,
    actions: modalActions,
    isOpen,
    isVisible,
    isAnimating: _isAnimating,
    show,
    hide,
    close,
    confirm: _confirm,
    cancel: _cancel,
  } = useModal(config);

  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [_initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });

  // Mostrar modal quando config.show mudar
  useEffect(() => {
    if (config.show && !isOpen) {
      show();
    } else if (!config.show && isOpen) {
      hide();
    }
  }, [config.show, isOpen, show, hide]);

  // Calcular tamanho do modal baseado no tipo
  const getModalSize = useCallback(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    switch (config.size) {
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
  }, [config.size]);

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

  // Inicializar posição e tamanho
  useEffect(() => {
    if (isOpen && !isDragging) {
      const modalSize = getModalSize();
      const position = config.centered ? getCenteredPosition() : { x: 0, y: 0 };
      
      // Converter altura para número se necessário
      const size = {
        width: typeof modalSize.width === 'number' ? modalSize.width : 800,
        height: typeof modalSize.height === 'number' ? modalSize.height : 600,
      };
      
      modalActions.setSize(size);
      modalActions.setPosition(position);
      setInitialPosition(position);
    }
  }, [isOpen, isDragging, config.centered, getModalSize, getCenteredPosition, modalActions]);

  // Handlers de drag
  const handleDragStart = (e: React.MouseEvent) => {
    if (!config.draggable) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - state.position.x,
      y: e.clientY - state.position.y,
    });
    
    e.preventDefault();
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (!isDragging || !config.draggable) return;
    
    const newPosition = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    };
    
    modalActions.setPosition(newPosition);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Handler de clique no backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current && config.closeOnBackdropClick) {
      close();
    }
  };

  // Handler de clique fora do modal
  const handleOutsideClick = (e: React.MouseEvent) => {
    if (config.closeOnOutsideClick && !modalRef.current?.contains(e.target as Node)) {
      close();
    }
  };

  // Construir classes do modal
  const getModalClasses = () => {
    const classes = ['modal', 'fade'];
    
    if (isVisible) {
      classes.push('show');
    }
    
    if (config.variant !== 'default') {
      classes.push(`modal-${config.variant}`);
    }
    
    if (config.size !== 'lg') {
      classes.push(`modal-${config.size}`);
    }
    
    if (config.fullscreen) {
      classes.push('modal-fullscreen');
    }
    
    if (config.scrollable) {
      classes.push('modal-scrollable');
    }
    
    if (config.centered) {
      classes.push('modal-centered');
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  // Construir classes do dialog
  const getDialogClasses = () => {
    const classes = ['modal-dialog'];
    
    if (config.variant === 'centered') {
      classes.push('modal-dialog-centered');
    }
    
    if (config.scrollable) {
      classes.push('modal-dialog-scrollable');
    }
    
    if (config.fullscreen) {
      classes.push('modal-dialog-fullscreen');
    }
    
    return classes.join(' ');
  };

  // Construir estilos do modal
  const getModalStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {
      zIndex: state.zIndex,
    };
    
    if (config.draggable && !config.centered) {
      styles.position = 'fixed';
      styles.left = `${state.position.x}px`;
      styles.top = `${state.position.y}px`;
      styles.transform = 'none';
    }
    
    return styles;
  };

  // Construir estilos do dialog
  const getDialogStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};
    
    if (config.draggable && !config.centered) {
      styles.width = typeof state.size.width === 'number' ? `${state.size.width}px` : state.size.width;
      styles.height = typeof state.size.height === 'number' ? `${state.size.height}px` : state.size.height;
    }
    
    return styles;
  };

  // Renderizar ações do footer
  const renderFooterActions = () => {
    if (actions.length === 0) return null;

    return actions.map(action => {
      const isDisabled = action.disabled || action.loading;
      const isHidden = action.hidden;

      if (isHidden) return null;

      return (
        <Button
          key={action.key}
          variant={action.variant || 'primary'}
          size={action.size || 'md'}
          icon={action.icon}
          disabled={isDisabled}
          loading={action.loading}
          onClick={() => {
            if (action.confirm) {
              // TODO: Implementar modal de confirmação
              if (window.confirm(action.confirm.message)) {
                onActionClick?.(action);
              }
            } else {
              onActionClick?.(action);
            }
          }}
        >
          {action.label}
        </Button>
      );
    });
  };

  // Renderizar conteúdo do modal
  const renderModalContent = () => {
    if (children) {
      return children;
    }

    return (
      <div className="modal-content">
        {/* Header */}
        {header || (
          <ModalHeader
            title={config.title}
            closeButton={config.showCloseButton}
            onClose={close}
            draggable={config.draggable}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className={config.headerClassName}
          />
        )}
        
        {/* Body */}
        {body || (
          <ModalBody
            scrollable={config.scrollable}
            className={config.bodyClassName}
          >
            {null}
          </ModalBody>
        )}
        
        {/* Footer */}
        {(footer || actions.length > 0) && (
          <ModalFooter
            className={config.footerClassName}
          >
            {footer || renderFooterActions()}
          </ModalFooter>
        )}
      </div>
    );
  };

  // Se não está aberto, não renderizar
  if (!isOpen) return null;

  // Renderizar modal usando portal
  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      {config.backdrop && (
        <div
          ref={backdropRef}
          className={`modal-backdrop fade ${isVisible ? 'show' : ''}`}
          onClick={handleBackdropClick}
          style={{ zIndex: state.zIndex - 1 }}
        />
      )}
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={getModalClasses()}
        style={getModalStyles()}
        onClick={handleOutsideClick}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={config.title ? 'modal-title' : undefined}
      >
        <div
          className={getDialogClasses()}
          style={getDialogStyles()}
        >
          {renderModalContent()}
        </div>
      </div>
    </>,
    document.body
  );
};

export default Modal;
