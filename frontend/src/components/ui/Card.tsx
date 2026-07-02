import React from 'react';

export type CardVariant = 'default' | 'outline' | 'elevated';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  /**
   * Conteúdo do card
   */
  children: React.ReactNode;
  
  /**
   * Classes CSS customizadas
   */
  className?: string;
  
  /**
   * Variante visual do card
   * @default 'default'
   */
  variant?: CardVariant;
  
  /**
   * Padding interno do card
   * @default 'md'
   */
  padding?: CardPadding;
  
  /**
   * Cabeçalho do card (renderizado no topo)
   */
  header?: React.ReactNode;
  
  /**
   * Rodapé do card (renderizado no final)
   */
  footer?: React.ReactNode;
  
  /**
   * Se true, o card terá um hover effect
   * @default false
   */
  hover?: boolean;
  
  /**
   * Se true, o card será clicável
   * @default false
   */
  clickable?: boolean;
  
  /**
   * Callback quando o card é clicado (requer clickable=true)
   */
  onClick?: () => void;
}

/**
 * Componente Card reutilizável seguindo padrão Bootstrap
 * 
 * @example
 * ```tsx
 * <Card variant="elevated" header={<h5>Título</h5>} footer={<Button>Salvar</Button>}>
 *   Conteúdo do card
 * </Card>
 * ```
 */
const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  header,
  footer,
  hover = false,
  clickable = false,
  onClick,
}) => {
  // Construir classes CSS do Bootstrap
  const getCardClasses = (): string => {
    const classes: string[] = ['card'];
    
    // Variant
    if (variant === 'outline') {
      classes.push('border');
    } else if (variant === 'elevated') {
      classes.push('shadow-sm');
    }
    
    // Padding
    if (padding === 'none') {
      classes.push('p-0');
    } else if (padding === 'sm') {
      classes.push('p-2');
    } else if (padding === 'md') {
      // Padrão do Bootstrap card já tem padding
    } else if (padding === 'lg') {
      classes.push('p-4');
    }
    
    // Hover effect
    if (hover) {
      classes.push('card-hover');
    }
    
    // Clickable
    if (clickable) {
      classes.push('card-clickable');
    }
    
    // Custom className
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };
  
  // Renderizar card
  return (
    <div
      className={getCardClasses()}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable && onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Header */}
      {header && (
        <div className="card-header">
          {header}
        </div>
      )}
      
      {/* Body */}
      <div className={padding === 'none' ? '' : 'card-body'}>
        {children}
      </div>
      
      {/* Footer */}
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
