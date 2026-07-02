/** Primitivo interno — use apenas `components/ui/buttons`. Não exportar via `components/ui`. */
import React from 'react';
import { ButtonHTMLAttributes } from 'react';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useI18n } from 'contexts/I18nContext';

export type ButtonVariant =
  | 'unstyled'
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
   * Desabilita o botão durante operação (loading global fica na barra superior).
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
   * Se true, sempre exibe o ícone mesmo no desktop
   * @default false
   */
  alwaysShowIcon?: boolean;

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
 * <Button variant="primary" leftIcon={<i className="bi bi-x-lg"></i>} isLoading={isSubmitting}>
 *   Cancelar
 * </Button>
 * 
 * <Button variant="danger" rightIcon={<i className="bi bi-trash"></i>} alwaysShowIcon>
 *   Deletar
 * </Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
  variant = 'primary',
  size = 'md',
  type = 'button',
  isLoading = false,
  leftIcon,
  rightIcon,
  icon,
  children,
  iconOnlyOnMobile = false,
  alwaysShowIcon = false,
  className = '',
  disabled = false,
  tooltip,
  title,
  'aria-label': ariaLabel,
  ...rest
  },
  ref,
) {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  
  // Converter prop icon (string) para leftIcon (ReactNode) se necessário
  const resolvedLeftIcon = leftIcon || (icon ? <i className={`bi bi-${icon}`}></i> : null);
  
  // Construir classes CSS do Bootstrap
  const getButtonClasses = (): string => {
    const classes: string[] = variant === 'unstyled' ? [] : ['btn'];

    // Variant
    if (variant === 'unstyled') {
      // Apenas className customizada (accordion, nav-link, page-link, etc.)
    } else if (variant === 'ghost') {
      classes.push('btn-link');
    } else {
      classes.push(`btn-${variant}`);
    }
    
    // Size
    if (variant !== 'unstyled' && size !== 'md') {
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
    // Se for mobile e iconOnlyOnMobile, mostrar apenas ícone
    if (shouldShowIconOnly) {
      return resolvedLeftIcon || rightIcon;
    }
    
    // Renderizar com ícones
    if (resolvedLeftIcon || rightIcon) {
      // Se for desktop e não tiver texto, permitir ícone para o botão não ficar vazio
      const childrenArray = React.Children.toArray(children);
      const hasText = childrenArray.length > 0 && childrenArray.some(child => {
        if (typeof child === 'string') return child.trim().length > 0;
        if (typeof child === 'number') return true;
        return !!child;
      });
      const showIcons = isMobile || !hasText || alwaysShowIcon;

      return (
        <>
          {(resolvedLeftIcon && showIcons) && (
            <span className={hasText ? 'me-2' : ''}>
              {resolvedLeftIcon}
            </span>
          )}
          {hasText && <span>{children}</span>}
          {(rightIcon && showIcons) && (
            <span className={hasText ? 'ms-2' : ''}>
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
    ariaProps['aria-label'] = typeof children === 'string' ? children : t('messages.loading');
  }
  return (
    <button
      ref={ref}
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
});

export default Button;
