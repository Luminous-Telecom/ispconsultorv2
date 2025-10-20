import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { modalStack } from '../../utils/modalStack';

interface DraggableModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'a4';
  className?: string;
  headerActions?: React.ReactNode;
  modalId?: string; // ID opcional para modais específicos
}

const DraggableModal: React.FC<DraggableModalProps> = ({
  show,
  onClose,
  title,
  children,
  size = 'lg',
  className = '',
  headerActions,
  modalId: propModalId
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 }); // Inicializar com posição válida
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [modalSize, setModalSize] = useState({ width: 0, height: 0 });
  const [isInitialized, setIsInitialized] = useState(false); // Controlar se já foi inicializado
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // ID único para este modal - usar prop se fornecida, senão gerar um estável
  const modalIdRef = useRef<string>(propModalId || `modal-${Math.random().toString(36).substr(2, 9)}`);
  const modalId = modalIdRef.current;

  // Definir larguras padrão (altura será automática)
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return { width: 600 };
      case 'md': return { width: 800 };
      case 'lg': return { width: 1000 };
      case 'xl': return { width: 1200 };
      case 'a4': return { width: 980 }; // Largura para impressão de boletos
      default: return { width: 1000 }; // Tamanho padrão bom para todos
    }
  };

  // Gerenciar pilha de modais
  useEffect(() => {
    if (show) {
      modalStack.push(modalId);
    } else {
      modalStack.remove(modalId);
    }

    return () => {
      modalStack.remove(modalId);
    };
  }, [show, modalId]);

  // Posicionar modal na área restante (excluindo menu) - 95% da dashboard
  // Recalcula posição toda vez que o modal abrir
  useEffect(() => {
    if (show && !isInitialized) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Largura do menu lateral (240px)
      const sidebarWidth = 240;
      const availableWidth = screenWidth - sidebarWidth;
      
      // Modal ocupa 95% da largura e altura disponíveis
      const modalWidth = Math.floor(availableWidth * 0.95);
      const modalHeight = Math.floor(screenHeight * 0.95);
      
      // Centralizar na área restante (2.5% de margem em cada lado)
      const centerX = sidebarWidth + Math.floor(availableWidth * 0.025);
      const centerY = Math.floor(screenHeight * 0.025);
      
      setPosition({
        x: centerX,
        y: centerY
      });
      
      setModalSize({ width: modalWidth, height: modalHeight });
      setIsInitialized(true);
    } else if (!show && isInitialized) {
      // Resetar quando fechar para recalcular na próxima abertura
      setIsInitialized(false);
    }
  }, [show, isInitialized]);

  // Funções de drag - só permite arrastar pelo título
  const handleMouseDown = (e: React.MouseEvent) => {
    // Só permite arrastar se clicar diretamente no título ou na área do header (exceto botões)
    const target = e.target as HTMLElement;
    const isTitle = target.classList.contains('modal-title') || target.closest('.modal-title');
    const isHeader = target.closest('.modal-header-draggable');
    const isButton = target.closest('button') || target.tagName === 'BUTTON';
    const isInput = target.closest('input') || target.tagName === 'INPUT';
    const isSelect = target.closest('select') || target.tagName === 'SELECT';
    
    // Só permite arrastar se for o título ou header, mas não botões/inputs
    if ((isTitle || isHeader) && !isButton && !isInput && !isSelect) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Permitir arrastar para qualquer lugar, incluindo sobre o menu
      setPosition({
        x: newX,
        y: newY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Adicionar listeners para drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position, modalSize]);

  // Fechar modal com ESC - apenas o modal no topo da pilha
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        // Verificar se este modal está no topo da pilha
        if (modalStack.isTop(modalId)) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [show, onClose, modalId]);

  // Estado para controlar transição de fade
  const [isVisible, setIsVisible] = useState(show);
  const [shouldRender, setShouldRender] = useState(show);

  // Controlar fade in/out e renderização
  useEffect(() => {
    if (show) {
      // Renderizar e depois fazer fade in
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      // Fade out e depois parar de renderizar
      setIsVisible(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 150); // Tempo da transição
      return () => clearTimeout(timer);
    }
  }, [show]);

  // Não renderizar se shouldRender for false
  if (!shouldRender) {
    return null;
  }

  const modalContent = (
    <>
      {/* Estilos CSS para diferenciação de campos */}
      <style>{`
        /* Estilos para modo claro */
        [data-theme="light"] .modal-content .form-control:not(:disabled):not(textarea) {
          background-color: #ffffff !important;
          border-color: #ced4da !important;
          color: #000000 !important;
          height: 30px !important;
          padding: 4px 8px !important;
          font-size: 13px !important;
        }
        
        [data-theme="light"] .modal-content .form-select:not(:disabled) {
          background-color: #ffffff !important;
          border-color: #ced4da !important;
          color: #000000 !important;
          height: 30px !important;
          padding: 4px 8px !important;
          font-size: 13px !important;
        }
        
        [data-theme="light"] .modal-content textarea.form-control:not(:disabled) {
          background-color: #ffffff !important;
          border-color: #ced4da !important;
          color: #000000 !important;
          height: auto !important;
          min-height: 30px !important;
          padding: 4px 8px !important;
          font-size: 13px !important;
          resize: vertical !important;
          overflow: auto !important;
          max-height: none !important;
          width: 100% !important;
        }
        
        /* Estilos para modo escuro */
        [data-theme="dark"] .modal-content .form-control:not(:disabled):not(textarea) {
          background-color: #2d3748 !important;
          border-color: #4a5568 !important;
          color: #ffffff !important;
          height: 30px !important;
          padding: 4px 8px !important;
          font-size: 13px !important;
        }
        
        [data-theme="dark"] .modal-content .form-select:not(:disabled) {
          background-color: #2d3748 !important;
          border-color: #4a5568 !important;
          color: #ffffff !important;
          height: 30px !important;
          padding: 4px 8px !important;
          font-size: 13px !important;
        }
        
        [data-theme="dark"] .modal-content textarea.form-control:not(:disabled) {
          background-color: #2d3748 !important;
          border-color: #4a5568 !important;
          color: #ffffff !important;
          height: auto !important;
          min-height: 30px !important;
          padding: 4px 8px !important;
          font-size: 13px !important;
          resize: vertical !important;
          overflow: auto !important;
          max-height: none !important;
          width: 100% !important;
        }
        
        /* Sobrescrever qualquer CSS do Bootstrap */
        .modal-content textarea {
          resize: vertical !important;
          height: auto !important;
          min-height: 30px !important;
          overflow: auto !important;
        }
        
        .modal-content .form-control:disabled:not(textarea) {
          background-color: #1a202c !important;
          border-color: #2d3748 !important;
          color: #718096 !important;
          cursor: not-allowed !important;
          height: 30px !important;
          padding: 4px 8px !important;
          font-size: 13px !important;
        }
        
        .modal-content textarea.form-control:disabled {
          background-color: #1a202c !important;
          border-color: #2d3748 !important;
          color: #718096 !important;
          cursor: not-allowed !important;
          height: auto !important;
          min-height: 30px !important;
          padding: 4px 8px !important;
          font-size: 13px !important;
          resize: vertical !important;
          overflow: auto !important;
        }
        
        .modal-content .form-select:not(:disabled) {
          background-color: #2d3748 !important;
          border-color: #4a5568 !important;
          color: #ffffff !important;
          height: 30px !important;
          padding: 4px 8px !important;
          font-size: 13px !important;
        }
        
        .modal-content .form-select:disabled {
          background-color: #1a202c !important;
          border-color: #2d3748 !important;
          color: #718096 !important;
          cursor: not-allowed !important;
          height: 30px !important;
          padding: 4px 8px !important;
          font-size: 13px !important;
        }
        
        .modal-content .form-control:focus:not(:disabled) {
          background-color: #2d3748 !important;
          border-color: #3182ce !important;
          box-shadow: 0 0 0 0.2rem rgba(49, 130, 206, 0.25) !important;
        }
        
        .modal-content textarea.form-control {
          height: auto !important;
          min-height: 30px !important;
        }
      `}</style>
      
      <div
        ref={modalRef}
        className={`modal-content draggable-modal-container ${className}`}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${modalSize.width}px`,
          height: modalSize.height > 0 ? `${modalSize.height}px` : 'auto',
          maxHeight: `${window.innerHeight - 100}px`,
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: '0 6px 12px 10px rgba(0, 0, 0, 0.3)',
          zIndex: 1050,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 0.15s ease-out, transform 0.15s ease-out'
        }}
      >
        {/* Header arrastável */}
        <div
          ref={headerRef}
          className="modal-header-draggable"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            padding: '16px',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '48px',
            position: 'relative'
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Título centralizado */}
          <h5 
            className="modal-title mb-0" 
            style={{ 
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: '500',
              textAlign: 'center',
              margin: 0,
              paddingRight: '40px', // Espaço para o botão X
              paddingLeft: '40px',  // Espaço simétrico
              marginBottom: headerActions ? '8px' : '0',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
          >
            {title}
          </h5>
          
          {/* Botão fechar à extrema direita */}
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ 
              filter: 'var(--btn-close-filter)',
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              right: '12px',
              top: '12px',
              zIndex: 10,
              userSelect: 'none'
            }}
          >
            ×
          </button>

          {/* Ações do header (botões e filtros) */}
          {headerActions && (
            <div onMouseDown={(e) => e.stopPropagation()}>
              {headerActions}
            </div>
          )}
        </div>

        {/* Body com scroll */}
        <div 
          className={`modal-body ${className?.includes('no-padding') ? '' : ''}`}
          style={{
            flex: 1,
            overflow: className?.includes('no-padding') ? 'hidden' : 'auto',
            padding: className?.includes('no-padding') ? '0' : '16px',
            minHeight: 0,
            height: 'calc(100% - 48px)' // Altura total menos header
          }}
        >
          {children}
        </div>
      </div>
    </>
  );

  // Renderizar o modal usando portal para garantir que ele apareça no nível raiz do DOM
  return ReactDOM.createPortal(modalContent, document.body);
};

export default DraggableModal;
