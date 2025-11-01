import React, { useState, useEffect, useRef } from 'react';
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
  size: _size = 'lg',
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

  // Gerenciar pilha de modais
  useEffect(() => {
    const currentModalId = modalId || `modal-${Date.now()}`;
    if (show) {
      modalStack.push(currentModalId);
    } else {
      modalStack.remove(currentModalId);
    }

    return () => {
      modalStack.remove(currentModalId);
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
    // Garantir que o cursor volte ao normal
    document.body.style.cursor = '';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  // Limpar estado de dragging quando modal fechar
  useEffect(() => {
    if (!show) {
      setIsDragging(false);
      // Garantir que o cursor volte ao normal
      document.body.style.cursor = '';
    }
    
    // Cleanup quando componente desmontar
    return () => {
      setIsDragging(false);
      document.body.style.cursor = '';
    };
  }, [show]);

  // Fechar modal com ESC - apenas o modal no topo da pilha
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        const currentModalId = modalId || `modal-${Date.now()}`;
        // Verificar se este modal está no topo da pilha
        if (modalStack.isTop(currentModalId)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          onClose();
        }
      }
    };

    if (show) {
      // Usar capture phase para interceptar antes de outros modais
      document.addEventListener('keydown', handleKeyDown, true);
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
          padding: 4px 2.5rem 4px 8px !important;
          font-size: 13px !important;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m1 6 7 7 7-7'/%3e%3c/svg%3e") !important;
          background-repeat: no-repeat !important;
          background-position: right 0.75rem center !important;
          background-size: 16px 12px !important;
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
          padding: 4px 2.5rem 4px 8px !important;
          font-size: 13px !important;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m1 6 7 7 7-7'/%3e%3c/svg%3e") !important;
          background-repeat: no-repeat !important;
          background-position: right 0.75rem center !important;
          background-size: 16px 12px !important;
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
          padding: 4px 2.5rem 4px 8px !important;
          font-size: 13px !important;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23718096' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m1 6 7 7 7-7'/%3e%3c/svg%3e") !important;
          background-repeat: no-repeat !important;
          background-position: right 0.75rem center !important;
          background-size: 16px 12px !important;
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
          className="modal-body"
          style={{
            flex: 1,
            overflow: className?.includes('no-padding') ? 'hidden' : 'auto',
            padding: 0,
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
