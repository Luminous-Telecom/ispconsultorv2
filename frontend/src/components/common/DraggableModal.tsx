/**
 * DraggableModal - Refatorado para usar ResponsiveDialog internamente
 * Mantém a API original do DraggableModal para compatibilidade total
 * Agora usa ResponsiveDialog que adapta automaticamente para mobile/desktop
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useI18n } from 'contexts/I18nContext';
import { modalStack } from 'utils/modalStack';
import ResponsiveDialog from './ResponsiveDialog';

interface DraggableModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'a4'; // Nota: size não é usado diretamente, mas mantido para compatibilidade
  className?: string;
  headerActions?: React.ReactNode;
  modalId?: string;
  isLoading?: boolean;
}

const DraggableModal: React.FC<DraggableModalProps> = ({
  show,
  onClose,
  title,
  children,
  size: _size = 'lg', // Mantido para compatibilidade mas não usado diretamente
  className = '',
  headerActions,
  modalId: propModalId,
  isLoading: _isLoading = false, // Mantido para compatibilidade, mas não usado
}) => {
  const { t } = useI18n();
  const checkIsMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  };

  const [isMobile, setIsMobile] = useState(() => checkIsMobile());

  useEffect(() => {
    const checkMobile = () => setIsMobile(checkIsMobile());
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);
  
  // ID único estável
  const modalId = useMemo(() => {
    return propModalId || `draggable-modal-${Math.random().toString(36).substr(2, 9)}`;
  }, [propModalId]);

  // Calcular posição e tamanho baseado no sidebar (240px) - igual ao original
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [modalSize, setModalSize] = useState({ width: 0, height: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // Função para calcular dimensões e posição
  const calculateDimensions = useCallback(() => {
    if (typeof window === 'undefined') return;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Largura do menu lateral (260px)
    const sidebarWidth = 260;
    
    // Em telas menores, o sidebar pode não estar lá ou ser sobreposto
    // Mas mantemos a lógica original de descontar 240px se for desktop
    // Se a tela for muito estreita mas > 768px, isso pode ser um problema
    // Vamos garantir que availableWidth não seja negativo
    const availableWidth = Math.max(0, screenWidth - sidebarWidth);
    
    // Modal ocupa 95% da largura e 97% da altura para usar mais espaço (tabelas, etc.)
    const modalWidth = Math.floor(availableWidth * 0.95);
    const modalHeight = Math.floor(screenHeight * 0.97);
    
    // Centralizar na área restante (2.5% lateral, 1.5% topo/base)
    const centerX = sidebarWidth + Math.floor(availableWidth * 0.025);
    const centerY = Math.floor(screenHeight * 0.015);
    
    setPosition({
      x: centerX,
      y: centerY
    });
    
    setModalSize({ width: modalWidth, height: modalHeight });
  }, []);

  // Gerenciar pilha de modais (apenas desktop)
  useEffect(() => {
    if (isMobile) return;
    
    if (show) {
      modalStack.push(modalId);
    } else {
      modalStack.remove(modalId);
    }

    return () => {
      modalStack.remove(modalId);
    };
  }, [show, modalId, isMobile]);

  // Posicionar modal na área restante e lidar com resize
  useEffect(() => {
    if (isMobile) {
      setIsVisible(show);
      return;
    }
    
    if (show) {
      // Sempre recalcular ao mostrar ou mudar modo (ex: sair do mobile)
      // Isso garante que o modal tenha o tamanho correto e esteja centralizado
      calculateDimensions();
      
      if (!isInitialized) {
        setIsInitialized(true);
      }
      setIsVisible(true);
    } else {
      if (isInitialized) {
        setIsInitialized(false);
        setIsVisible(false);
      }
    }
  }, [show, isInitialized, isMobile, calculateDimensions]);

  // Listener para resize
  useEffect(() => {
    if (!show || isMobile) return;

    const handleResize = () => {
      calculateDimensions();
    };

    window.addEventListener('resize', handleResize);
    
    // Também recalcular quando a orientação muda
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [show, isMobile, calculateDimensions]);

  // Funções de drag - só permite arrastar pelo título (apenas desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    
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

  useEffect(() => {
    if (isMobile || !isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      
      // Permitir arrastar livremente sem limites
      setPosition(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, isMobile, position]);

  // Handler para tecla ESC (apenas desktop)
  useEffect(() => {
    if (isMobile || !show) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Verificar se este modal está no topo da pilha
        const stack = modalStack.getStack();
        const isTopModal = stack[stack.length - 1] === modalId;
        
        if (isTopModal) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          onClose();
        }
      }
    };

    // Usar capture: true para interceptar o evento antes de outros listeners
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [show, modalId, onClose, isMobile]);

  // Calcular z-index baseado na pilha de modais (apenas desktop)
  // Base 1100: acima da sidebar (1050) para não ficar por baixo ao arrastar
  const MODAL_BASE_Z_INDEX = 1100;
  const zIndex = useMemo(() => {
    if (isMobile) return MODAL_BASE_Z_INDEX;

    const stack = modalStack.getStack();
    const index = stack.indexOf(modalId);
    return MODAL_BASE_Z_INDEX + (index * 10);
  }, [modalId, isMobile]);

  // Em mobile, usar ResponsiveDialog diretamente
  if (isMobile && show) {
    return (
      <ResponsiveDialog
        isOpen={show}
        onClose={onClose}
        title={title}
        size={_size}
        className={className}
        headerActions={headerActions}
        modalId={modalId}
      >
        {children}
      </ResponsiveDialog>
    );
  }
  
  if (isMobile || !show || !isVisible) {
    return null;
  }

  const modalContent = (
    <>

      {/* Backdrop customizado - overlay escuro semitransparente, não cobre a sidebar */}
      <div
        className="draggable-modal-backdrop"
        style={{
          zIndex: zIndex - 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      />

      {/* Overlay para manter eventos de arraste mesmo sobre iframes/PDFs */}
      <div
        className={`draggable-modal-overlay ${isDragging ? 'dragging' : ''}`}
        style={{ zIndex: isDragging ? zIndex + 100 : -1 }}
      />

      {/* Modal */}
      <div
        className={`modal-content draggable-modal-container draggable-modal-container-custom ${className}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${modalSize.width}px`,
          height: modalSize.height > 0 ? `${modalSize.height}px` : 'auto',
          maxHeight: `${window.innerHeight - 32}px`,
          zIndex,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        {/* Header arrastável */}
        <div
          className="modal-header-draggable draggable-modal-header-custom"
          onMouseDown={handleMouseDown}
        >
          {/* Container flex para título e botão */}
          <div className="d-flex align-items-center justify-content-center position-relative">
            {/* Título centralizado */}
            <h6
              className={`modal-title text-center fs-6 ${headerActions ? 'mb-2 with-actions' : 'mb-0'} draggable-modal-title-custom ${isDragging ? 'dragging' : ''}`}
            >
              {title}
            </h6>

            {/* Botão fechar à extrema direita */}
            <button
              type="button"
              className="btn-close position-absolute end-0 top-50 translate-middle-y"
              onClick={onClose}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={t('ui.close')}
            ></button>
          </div>

          {/* Ações do header (botões e filtros) */}
          {headerActions && (
            <div onMouseDown={(e) => e.stopPropagation()}>
              {headerActions}
            </div>
          )}
        </div>

        {/* Body com scroll */}
        <div
          className={`modal-body draggable-modal-body-custom ${className?.includes('no-padding') ? 'no-scroll' : ''} ${className?.includes('list-modal-no-body-scroll') ? 'list-modal-no-body-scroll' : ''}`}
          style={{
            ...(className?.includes('no-padding') || className?.includes('list-modal-no-body-scroll') 
              ? { overflow: 'hidden', overflowY: 'hidden', overflowX: 'hidden', padding: 0 } 
              : {})
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
