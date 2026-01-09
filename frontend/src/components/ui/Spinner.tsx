import React from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export type SpinnerVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';

export interface SpinnerProps {
  /**
   * Tamanho do spinner
   * @default 'md'
   */
  size?: SpinnerSize;
  
  /**
   * Variante visual do spinner
   * @default 'primary'
   */
  variant?: SpinnerVariant;
  
  /**
   * Classes CSS customizadas
   */
  className?: string;
  
  /**
   * Texto para acessibilidade (será usado como aria-label)
   */
  'aria-label'?: string;
  
  /**
   * Se true, mostra um texto abaixo do spinner
   */
  text?: string;
}

/**
 * Componente Spinner reutilizável seguindo padrão Bootstrap
 * 
 * @example
 * ```tsx
 * <Spinner size="sm" variant="primary" />
 * <Spinner size="lg" variant="success" text="Carregando..." />
 * ```
 */
const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className = '',
  'aria-label': ariaLabel,
  text,
}) => {
  // Construir classes CSS do Bootstrap
  const getSpinnerClasses = (): string => {
    const classes: string[] = ['spinner-border'];
    
    // Size
    if (size === 'sm') {
      classes.push('spinner-border-sm');
    }
    // 'md' é o padrão, não precisa adicionar classe
    // 'lg' não tem classe específica no Bootstrap, mas podemos adicionar estilo customizado
    
    // Variant
    classes.push(`text-${variant}`);
    
    // Custom className
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };
  
  // Resolver aria-label
  const resolvedAriaLabel = ariaLabel || text || 'Carregando...';
  
  // Renderizar spinner
  return (
    <div className="d-flex flex-column align-items-center">
      <div
        className={getSpinnerClasses()}
        role="status"
        aria-label={resolvedAriaLabel}
        style={size === 'lg' ? { width: '3rem', height: '3rem', borderWidth: '0.25rem' } : undefined}
      >
        <span className="visually-hidden">{resolvedAriaLabel}</span>
      </div>
      {text && (
        <span className="mt-2 small text-muted">{text}</span>
      )}
    </div>
  );
};

export default Spinner;
