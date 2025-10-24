import React from 'react';
import { ModalHeaderProps } from './types';
import Button from '../ui/Button';

const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  closeButton = true,
  onClose,
  className = '',
  draggable = false,
  onDragStart,
  onDrag,
  onDragEnd,
}) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggable && onDragStart) {
      onDragStart(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggable && onDrag) {
      onDrag(e);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggable && onDragEnd) {
      onDragEnd(e);
    }
  };

  const getHeaderClasses = () => {
    const classes = ['modal-header'];
    
    if (draggable) {
      classes.push('draggable');
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  return (
    <div
      className={getHeaderClasses()}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: draggable ? 'move' : 'default' }}
    >
      <div className="modal-header-content d-flex align-items-center justify-content-between">
        <div className="modal-title-section d-flex align-items-center">
          {icon && (
            <div className="modal-title-icon me-2">
              <i className={`bi bi-${icon}`}></i>
            </div>
          )}
          
          <div className="modal-title-content">
            {title && (
              <h5 className="modal-title mb-0">
                {title}
              </h5>
            )}
            
            {subtitle && (
              <p className="modal-subtitle mb-0 text-muted small">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        <div className="modal-header-actions d-flex align-items-center gap-2">
          {actions && (
            <div className="modal-header-custom-actions">
              {actions}
            </div>
          )}
          
          {closeButton && onClose && (
            <Button
              variant="outline-secondary"
              size="sm"
              icon="x"
              onClick={onClose}
              tooltip="Fechar"
            >
              {''}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalHeader;
