import React from 'react';
import { ModalFooterProps } from './types';

const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className = '',
  align = 'right',
  padding = 'md',
  border = true,
  sticky = false,
}) => {
  const getFooterClasses = () => {
    const classes = ['modal-footer'];
    
    if (border) {
      classes.push('border-top');
    }
    
    if (sticky) {
      classes.push('sticky-bottom');
    }
    
    if (padding !== 'md') {
      classes.push(`p-${padding}`);
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  const getContentClasses = () => {
    const classes = ['modal-footer-content', 'd-flex'];
    
    switch (align) {
      case 'left':
        classes.push('justify-content-start');
        break;
      case 'center':
        classes.push('justify-content-center');
        break;
      case 'right':
        classes.push('justify-content-end');
        break;
      case 'between':
        classes.push('justify-content-between');
        break;
      default:
        classes.push('justify-content-end');
    }
    
    return classes.join(' ');
  };

  return (
    <div className={getFooterClasses()}>
      <div className={getContentClasses()}>
        {children}
      </div>
    </div>
  );
};

export default ModalFooter;
