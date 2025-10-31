import React from 'react';
import { BaseComponentProps, LoadingProps, IconProps, TooltipProps, ButtonVariant, ButtonSize } from './types';

interface ButtonProps extends BaseComponentProps, LoadingProps, IconProps, TooltipProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  block?: boolean;
  outline?: boolean;
  active?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  disabled = false,
  loading = false,
  loadingText = 'Carregando...',
  icon,
  iconPosition = 'left',
  iconSize = 'md',
  tooltip,
  tooltipPosition = 'top',
  onClick,
  children,
  block = false,
  outline = false,
  active = false,
  href,
  target,
  rel,
  style,
  id,
  'data-testid': dataTestId,
}) => {
  // Construir classes CSS
  const getButtonClasses = () => {
    const classes = ['btn'];
    
    // Variant
    if (outline) {
      classes.push(`btn-outline-${variant}`);
    } else {
      classes.push(`btn-${variant}`);
    }
    
    // Size
    if (size !== 'md') {
      classes.push(`btn-${size}`);
    }
    
    // Block
    if (block) {
      classes.push('btn-block');
    }
    
    // Active
    if (active) {
      classes.push('active');
    }
    
    // Custom className
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  // Renderizar ícone
  const renderIcon = () => {
    if (!icon) return null;
    
    const iconClasses = ['bi', `bi-${icon}`];
    if (iconSize !== 'md') {
      iconClasses.push(`fs-${iconSize}`);
    }
    
    return <i className={iconClasses.join(' ')}></i>;
  };

  // Renderizar conteúdo do botão
  const renderContent = () => {
    if (loading) {
      return (
        <>
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          {loadingText}
        </>
      );
    }

    if (icon) {
      return (
        <>
          {iconPosition === 'left' && renderIcon()}
          {iconPosition === 'left' && <span className="ms-1">{children}</span>}
          {iconPosition === 'right' && <span className="me-1">{children}</span>}
          {iconPosition === 'right' && renderIcon()}
        </>
      );
    }

    return children;
  };

  // Se for um link
  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={getButtonClasses()}
        style={style}
        id={id}
        data-testid={dataTestId}
        title={tooltip}
        aria-label={tooltip || (icon && (!children || (typeof children === 'string' && children.trim() === '')) ? `Botão ${icon}` : undefined)}
        data-bs-toggle={tooltip ? 'tooltip' : undefined}
        data-bs-placement={tooltip ? tooltipPosition : undefined}
        data-bs-title={tooltip}
      >
        {renderContent()}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={getButtonClasses()}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
      id={id}
      data-testid={dataTestId}
      title={tooltip}
      aria-label={tooltip || (icon && (!children || (typeof children === 'string' && children.trim() === '')) ? `Botão ${icon}` : undefined)}
      data-bs-toggle={tooltip ? 'tooltip' : undefined}
      data-bs-placement={tooltip ? tooltipPosition : undefined}
      data-bs-title={tooltip}
    >
      {renderContent()}
    </button>
  );
};

export default Button;
