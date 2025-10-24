import React from 'react';
import { ModalBodyProps } from './types';

const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className = '',
  scrollable = false,
  padding = 'md',
  maxHeight,
  overflow = 'auto',
}) => {
  const getBodyClasses = () => {
    const classes = ['modal-body'];
    
    if (scrollable) {
      classes.push('scrollable');
    }
    
    if (padding !== 'md') {
      classes.push(`p-${padding}`);
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  const getBodyStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};
    
    if (maxHeight) {
      styles.maxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;
    }
    
    if (overflow) {
      styles.overflow = overflow;
    }
    
    return styles;
  };

  return (
    <div
      className={getBodyClasses()}
      style={getBodyStyles()}
    >
      {children}
    </div>
  );
};

export default ModalBody;
