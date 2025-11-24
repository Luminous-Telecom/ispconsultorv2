import React from 'react';
import { ButtonHTMLAttributes } from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'danger' 
  | 'ghost' 
  | 'info' 
  | 'success' 
  | 'warning'
  | 'dark'
  | 'light'
  | 'outline-primary'
  | 'outline-secondary'
  | 'outline-success'
  | 'outline-danger'
  | 'outline-warning'
  | 'outline-info'
  | 'outline-light'
  | 'outline-dark';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /**
   * Variante visual do botão
   * @default 'primary'
   */
  variant?: ButtonVariant;
  
  /**
   * Tamanho do botão
   * @default 'md'
   */
  size?: ButtonSize;
  
  /**
   * Tipo do botão HTML
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset';
  
  /**
   * Mostra um spinner e desabilita o botão
   * @default false
   */
  isLoading?: boolean;
  
  /**
   * Ícone a ser exibido à esquerda do texto
   */
  leftIcon?: React.ReactNode;
  
  /**
   * Ícone a ser exibido à direita do texto
   */
  rightIcon?: React.ReactNode;
  
  /**
   * Ícone como string (compatibilidade com código legado)
   * Será convertido para leftIcon automaticamente
   * Ex: icon="check" → <i className="bi bi-check"></i>
   */
  icon?: string;
  
  /**
   * Texto do botão. No mobile, será exibido junto com o ícone se houver
   */
  children: React.ReactNode;
  
  /**
   * Se true, no mobile mostra apenas o ícone (sem texto)
   * @default false
   */
  iconOnlyOnMobile?: boolean;
  
  /**
   * Tooltip do botão (compatibilidade com código legado)
   * Será usado como title e aria-label
   */
  tooltip?: string;
}

/**
 * Componente Button reutilizável e acessível
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Salvar
 * </Button>
 * 
 * <Button variant="secondary" leftIcon={<i className="bi bi-x-lg"></i>} isLoading={isSubmitting}>
 *   Cancelar
 * </Button>
 * 
 * <Button variant="danger" rightIcon={<i className="bi bi-trash"></i>}>
 *   Excluir
 * </Button>
 * ```
 */
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  type = 'button',
  isLoading = false,
  leftIcon,
  rightIcon,
  icon,
  children,
  iconOnlyOnMobile = false,
  className = '',
  disabled = false,
  tooltip,
  title,
  'aria-label': ariaLabel,
  ...rest
}) => {
  const isMobile = useIsMobile();
  
  // Converter prop icon (string) para leftIcon (ReactNode) se necessário
  const resolvedLeftIcon = leftIcon || (icon ? <i className={`bi bi-${icon}`}></i> : null);
  
  // Construir classes CSS do Bootstrap
  const getButtonClasses = (): string => {
    const classes: string[] = ['btn'];
    
    // Variant
    if (variant === 'ghost') {
      classes.push('btn-link');
    } else {
      classes.push(`btn-${variant}`);
    }
    
    // Size
    if (size !== 'md') {
      classes.push(`btn-${size}`);
    }
    
    // Custom className
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };
  
  // Determinar se deve mostrar apenas ícone no mobile
  const shouldShowIconOnly = iconOnlyOnMobile && isMobile && (resolvedLeftIcon || rightIcon);
  
  // Renderizar conteúdo do botão
  const renderContent = (): React.ReactNode => {
    // Se estiver carregando, mostrar spinner
    if (isLoading) {
      return (
        <>
          <span 
            className="spinner-border spinner-border-sm me-2" 
            role="status" 
            aria-hidden="true"
          />
          {!shouldShowIconOnly && <span>{children}</span>}
        </>
      );
    }
    
    // Se for mobile e iconOnlyOnMobile, mostrar apenas ícone
    if (shouldShowIconOnly) {
      return resolvedLeftIcon || rightIcon;
    }
    
    // Renderizar com ícones
    if (resolvedLeftIcon || rightIcon) {
      return (
        <>
          {resolvedLeftIcon && (
            <span className={isMobile ? 'me-2' : 'me-1'}>
              {resolvedLeftIcon}
            </span>
          )}
          <span>{children}</span>
          {rightIcon && (
            <span className={isMobile ? 'ms-2' : 'ms-1'}>
              {rightIcon}
            </span>
          )}
        </>
      );
    }
    
    // Apenas texto
    return children;
  };
  
  // Determinar se o botão está desabilitado
  const isDisabled = disabled || isLoading;
  
  // Resolver title e aria-label (tooltip tem prioridade)
  const resolvedTitle = tooltip || title;
  const resolvedAriaLabel = ariaLabel || tooltip || (typeof children === 'string' ? children : undefined);
  
  // Atributos de acessibilidade
  const ariaProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
    'aria-busy': isLoading,
    'aria-disabled': isDisabled,
  };
  
  // Adicionar aria-label se necessário
  if (resolvedAriaLabel) {
    ariaProps['aria-label'] = resolvedAriaLabel;
  }
  
  // Se estiver carregando e não houver texto visível, garantir aria-label
  if (isLoading && shouldShowIconOnly && !resolvedAriaLabel) {
    ariaProps['aria-label'] = typeof children === 'string' ? children : 'Carregando...';
  }
  
  return (
    <button
      type={type}
      className={getButtonClasses()}
      disabled={isDisabled}
      title={resolvedTitle}
      {...ariaProps}
      {...rest}
    >
      {renderContent()}
    </button>
  );
};

export default Button;
