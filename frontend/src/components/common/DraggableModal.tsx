import React, { useState, useEffect, useRef } from 'react';

interface DraggableModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const DraggableModal: React.FC<DraggableModalProps> = ({
  show,
  onClose,
  title,
  children,
  size = 'lg',
  className = ''
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [modalSize, setModalSize] = useState({ width: 0, height: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Definir larguras padrão (altura será automática)
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return { width: 600 };
      case 'md': return { width: 800 };
      case 'lg': return { width: 1000 };
      case 'xl': return { width: 1200 };
      default: return { width: 1000 };
    }
  };

  // Centralizar modal na tela e ajustar altura automaticamente
  useEffect(() => {
    if (show && modalRef.current) {
      const { width } = getSizeClasses();
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Posição centralizada
      setPosition({
        x: (screenWidth - width) / 2,
        y: Math.max(50, (screenHeight - 400) / 2) // Mínimo de 50px do topo
      });
      
      // Largura fixa, altura será automática
      setModalSize({ width, height: 0 });
    }
  }, [show, size]);

  // Ajustar altura baseada no conteúdo
  useEffect(() => {
    if (show && modalRef.current) {
      const modal = modalRef.current;
      const contentHeight = modal.scrollHeight;
      const maxHeight = window.innerHeight - 100; // Deixar 100px de margem
      const finalHeight = Math.min(contentHeight, maxHeight);
      
      setModalSize(prev => ({
        ...prev,
        height: finalHeight
      }));
    }
  }, [show, children]);

  // Funções de drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === headerRef.current || headerRef.current?.contains(e.target as Node)) {
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
      
      // Permitir arrastar para fora da tela
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

  // Fechar modal com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <>
      {/* Estilos CSS para diferenciação de campos */}
      <style>{`
        .modal-content .form-control:not(:disabled) {
          background-color: #2d3748 !important;
          border-color: #4a5568 !important;
          color: #ffffff !important;
          height: 30px !important;
          padding: 4px 8px !important;
          font-size: 13px !important;
        }
        
        .modal-content .form-control:disabled {
          background-color: #1a202c !important;
          border-color: #2d3748 !important;
          color: #718096 !important;
          cursor: not-allowed !important;
          height: 30px !important;
          padding: 4px 8px !important;
          font-size: 13px !important;
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
        className="modal show d-block" 
        style={{ 
          backgroundColor: 'rgba(0,0,0,0.5)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1050
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
      <div
        ref={modalRef}
        className={`modal-content ${className}`}
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${modalSize.width}px`,
          height: modalSize.height > 0 ? `${modalSize.height}px` : 'auto',
          maxHeight: `${window.innerHeight - 100}px`,
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header arrastável */}
        <div
          ref={headerRef}
          className="modal-header"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            padding: '12px 16px',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: '48px'
          }}
          onMouseDown={handleMouseDown}
        >
          <h5 
            className="modal-title mb-0" 
            style={{ 
              color: 'var(--text-primary)',
              fontSize: '1.1rem',
              fontWeight: '500'
            }}
          >
            {title}
          </h5>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
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
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Body com scroll */}
        <div 
          className="modal-body"
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
            minHeight: 0
          }}
        >
          {children}
        </div>
      </div>
    </div>
    </>
  );
};

export default DraggableModal;
