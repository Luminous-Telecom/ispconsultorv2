import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface ResponsiveDialogProps {
  /**
   * Controla se o dialog está aberto
   */
  isOpen: boolean;
  
  /**
   * Callback chamado quando o dialog deve ser fechado
   */
  onClose: () => void;
  
  /**
   * Título exibido no header do dialog
   */
  title: string;
  
  /**
   * Conteúdo do dialog
   */
  children: React.ReactNode;
  
  /**
   * Tamanho do modal (apenas para desktop)
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'a4';
  
  /**
   * Classes CSS adicionais
   */
  className?: string;
  
  /**
   * Ações customizadas no header (botões, filtros, etc)
   */
  headerActions?: React.ReactNode;
  
  /**
   * ID único do modal (opcional, gerado automaticamente se não fornecido)
   */
  modalId?: string;
}

/**
 * ResponsiveDialog - Componente responsivo que adapta o comportamento baseado no dispositivo
 * 
 * Desktop (>= 768px): Renderiza como modal centralizado usando DraggableModal
 * Mobile (< 768px): Renderiza como página fullscreen com header fixo e botão voltar
 */
const ResponsiveDialog: React.FC<ResponsiveDialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size: _size = 'lg',
  className = '',
  headerActions,
  modalId: _modalId,
}) => {
  // ResponsiveDialog só deve ser chamado quando é mobile (DraggableModal já verifica)
  // Mas vamos verificar novamente por segurança
  // Usar função helper para verificar mobile de forma síncrona
  const checkIsMobile = (): boolean => {
    if (typeof window === 'undefined') return true; // Assume mobile se não tiver window
    return window.innerWidth < 768;
  };

  const [isMobile, setIsMobile] = useState(() => checkIsMobile());

  useEffect(() => {
    const checkMobile = () => {
      const mobile = checkIsMobile();
      setIsMobile(mobile);
    };
    
    // Verificar imediatamente
    checkMobile();
    
    // Listener para mudanças de tamanho
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // Prevenir scroll do body quando dialog estiver aberto
  useEffect(() => {
    if (isOpen && isMobile) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isMobile]);

  // Handler para tecla ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen, onClose]);

  // Verificar mobile de forma síncrona no momento da renderização para garantir detecção correta
  const currentIsMobile = checkIsMobile();

  // Se não for mobile, não renderizar (DraggableModal cuida do desktop)
  if (!currentIsMobile) {
    return null;
  }

  // Se não estiver aberto, não renderizar
  if (!isOpen) {
    return null;
  }

  const mobileContent = (
    <div
      className="responsive-dialog-mobile"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideInRight 0.3s ease',
      }}
    >
      {/* Header fixo com botão voltar */}
      <div
        className="d-flex align-items-center border-bottom"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          padding: '12px 16px',
          minHeight: '56px',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        {/* Botão voltar */}
        <button
          type="button"
          className="btn btn-link p-0 me-3"
          onClick={onClose}
          style={{
            color: 'var(--text-primary)',
            textDecoration: 'none',
            border: 'none',
            background: 'none',
            fontSize: '1.25rem',
            lineHeight: 1,
            padding: '4px 8px',
            minWidth: '36px',
            minHeight: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            cursor: 'pointer',
            flexShrink: 0,
            alignSelf: 'flex-start',
            marginTop: '2px',
          }}
          aria-label="Voltar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Título */}
        <h5
          className="mb-0 flex-grow-1 text-truncate"
          style={{
            color: 'var(--text-primary)',
            fontSize: '1.125rem',
            fontWeight: 600,
            margin: 0,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h5>

        {/* Ações do header (se houver) */}
        {headerActions && (
          <div className="ms-2 d-flex align-items-center flex-shrink-0">
            {headerActions}
          </div>
        )}
      </div>

      {/* Conteúdo com scroll */}
      <div
        className={`responsive-dialog-mobile-content ${className}`}
        style={{
          flex: 1,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: className?.includes('no-padding') ? 0 : '16px',
          minHeight: 0,
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );

  // Renderizar usando portal para garantir que apareça no nível raiz
  return ReactDOM.createPortal(mobileContent, document.body);
};

export default ResponsiveDialog;

