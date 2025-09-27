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

  // Definir tamanhos padrão
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return { width: 400, height: 300 };
      case 'md': return { width: 600, height: 400 };
      case 'lg': return { width: 800, height: 500 };
      case 'xl': return { width: 1000, height: 600 };
      default: return { width: 800, height: 500 };
    }
  };

  // Centralizar modal na tela
  useEffect(() => {
    if (show && modalRef.current) {
      const { width, height } = getSizeClasses();
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      setPosition({
        x: (screenWidth - width) / 2,
        y: (screenHeight - height) / 2
      });
      
      setModalSize({ width, height });
    }
  }, [show, size]);

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
      
      // Limitar dentro da tela
      const maxX = window.innerWidth - modalSize.width;
      const maxY = window.innerHeight - modalSize.height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
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
          height: `${modalSize.height}px`,
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
            padding: '16px'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default DraggableModal;
