import React, { useState, useRef, useEffect } from 'react';
import { BaseComponentProps, ButtonVariant, ButtonSize } from './types';
import Button from './Button';

export interface DropdownItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger' | 'warning';
}

interface DropdownProps extends BaseComponentProps {
  label: string;
  items: DropdownItem[];
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  trigger?: 'click' | 'hover';
  closeOnItemClick?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  items,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'right',
  placement = 'bottom-start',
  trigger = 'click',
  closeOnItemClick = true,
  className = '',
  style,
  id,
  'data-testid': dataTestId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (trigger === 'click') {
      setIsOpen(!isOpen);
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsOpen(false);
    }
  };

  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled) {
      item.onClick();
      if (closeOnItemClick) {
        setIsOpen(false);
      }
    }
  };

  // Construir classes CSS para posicionamento
  const getDropdownMenuClasses = () => {
    const classes = ['dropdown-menu'];
    
    if (isOpen) {
      classes.push('show');
    }
    
    // Adicionar classes de posicionamento
    switch (placement) {
      case 'bottom-end':
        classes.push('dropdown-menu-end');
        break;
      case 'top-start':
        classes.push('dropup');
        break;
      case 'top-end':
        classes.push('dropup', 'dropdown-menu-end');
        break;
      default:
        break;
    }
    
    return classes.join(' ');
  };

  const getDropdownMenuStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 1050,
      display: isOpen ? 'block' : 'none',
      minWidth: '200px',
    };

    // Ajustar posicionamento baseado na placement
    switch (placement) {
      case 'bottom-end':
        baseStyle.right = 0;
        baseStyle.left = 'auto';
        break;
      case 'top-start':
        baseStyle.bottom = '100%';
        baseStyle.top = 'auto';
        break;
      case 'top-end':
        baseStyle.bottom = '100%';
        baseStyle.top = 'auto';
        baseStyle.right = 0;
        baseStyle.left = 'auto';
        break;
      default:
        baseStyle.left = 0;
        baseStyle.right = 'auto';
        break;
    }

    return { ...baseStyle, ...style };
  };

  return (
    <div
      ref={dropdownRef}
      className={`dropdown ${className}`}
      style={{ position: 'relative', ...style }}
      id={id}
      data-testid={dataTestId}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        size={size}
        variant={variant}
        disabled={disabled || loading}
        loading={loading}
        onClick={handleToggle}
        className="dropdown-toggle"
      >
        {icon && <span className="me-2">{icon}</span>}
        {label}
        <i className="bi bi-chevron-down ms-1"></i>
      </Button>

      <ul className={getDropdownMenuClasses()} style={getDropdownMenuStyle()}>
        {items.map((item, index) => (
          <li key={index}>
            <button
              className={`dropdown-item ${item.variant === 'danger' ? 'text-danger' : ''} ${item.variant === 'warning' ? 'text-warning' : ''}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                background: 'none',
                padding: '8px 16px',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                opacity: item.disabled ? 0.5 : 1,
              }}
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dropdown;
