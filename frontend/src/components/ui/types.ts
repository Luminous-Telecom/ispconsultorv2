// Tipos para componentes UI base
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger' | 'outline-warning' | 'outline-info' | 'outline-light' | 'outline-dark';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'time' | 'month' | 'week';
export type InputSize = 'sm' | 'md' | 'lg';
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'a4';
export type ValidationStatus = 'valid' | 'invalid' | 'pending';

// Interface base para todos os componentes UI
export interface BaseComponentProps {
  className?: string;
  disabled?: boolean;
  id?: string;
  'data-testid'?: string;
}

// Interface para componentes com validação
export interface ValidationProps {
  isValid?: boolean;
  isInvalid?: boolean;
  validationMessage?: string;
  validationStatus?: ValidationStatus;
}

// Interface para componentes com loading
export interface LoadingProps {
  loading?: boolean;
  loadingText?: string;
}

// Interface para componentes com ícones
export interface IconProps {
  icon?: string;
  iconPosition?: 'left' | 'right';
  iconSize?: 'sm' | 'md' | 'lg';
}

// Interface para componentes com tooltip
export interface TooltipProps {
  tooltip?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

// Interface para opções de select
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
}

// Interface para eventos de mudança
export interface ChangeEvent<T = string | string[]> {
  value: T;
  name?: string;
  event?: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
}
