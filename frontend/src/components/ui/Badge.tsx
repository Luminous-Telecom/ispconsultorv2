import React from 'react';

export type BadgeVariant = 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'danger' 
  | 'warning' 
  | 'info'
  | 'light'
  | 'dark';

export interface BadgeProps {
  /**
   * Conteúdo do badge
   */
  children: React.ReactNode;
  
  /**
   * Variante visual do badge
   * @default 'primary'
   */
  variant?: BadgeVariant;
  
  /**
   * Se true, o badge terá formato pill (arredondado)
   * @default false
   */
  pill?: boolean;
  
  /**
   * Classes CSS customizadas
   */
  className?: string;
  
  /**
   * Se true, o badge será clicável
   * @default false
   */
  clickable?: boolean;
  
  /**
   * Callback quando o badge é clicado (requer clickable=true)
   */
  onClick?: () => void;
}

/**
 * Componente Badge reutilizável seguindo padrão Bootstrap
 * 
 * @example
 * ```tsx
 * <Badge variant="success" pill>Ativo</Badge>
 * <Badge variant="danger">Inativo</Badge>
 * ```
 */
const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  pill = false,
  className = '',
  clickable = false,
  onClick,
}) => {
  // Construir classes CSS do Bootstrap
  const getBadgeClasses = (): string => {
    const classes: string[] = ['badge'];
    
    // Variant
    classes.push(`bg-${variant}`);
    
    // Pill
    if (pill) {
      classes.push('rounded-pill');
    }
    
    // Clickable
    if (clickable) {
      classes.push('badge-clickable');
    }
    
    // Custom className
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };
  
  // Renderizar badge
  return (
    <span
      className={getBadgeClasses()}
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
      {children}
    </span>
  );
};

export default Badge;
