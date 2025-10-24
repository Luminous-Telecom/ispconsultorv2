// Tipos para sistema de formulários unificado

export type ValidationRule = 
  | { type: 'required'; message?: string }
  | { type: 'minLength'; value: number; message?: string }
  | { type: 'maxLength'; value: number; message?: string }
  | { type: 'min'; value: number; message?: string }
  | { type: 'max'; value: number; message?: string }
  | { type: 'pattern'; value: RegExp; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'url'; message?: string }
  | { type: 'number'; message?: string }
  | { type: 'custom'; validator: (value: any) => boolean | string; message?: string };

export interface FieldConfig {
  name: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'time' | 'month' | 'week' | 'select' | 'checkbox' | 'textarea';
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  defaultValue?: any;
  options?: Array<{ value: string | number; label: string; disabled?: boolean; group?: string }>;
  validation?: ValidationRule[];
  description?: string;
  helpText?: string;
  tooltip?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  iconSize?: 'sm' | 'md' | 'lg';
  rows?: number;
  cols?: number;
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  inline?: boolean;
  switch?: boolean;
  indeterminate?: boolean;
}

export interface FormConfig {
  fields: FieldConfig[];
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onReset?: () => void;
  onFieldChange?: (name: string, value: any, allData: Record<string, any>) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  resetOnSubmit?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  layout?: 'vertical' | 'horizontal' | 'inline';
  columns?: number;
  spacing?: 'sm' | 'md' | 'lg';
}

export interface FormState {
  data: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  isPristine: boolean;
}

export interface FormActions {
  setValue: (name: string, value: any) => void;
  setValues: (values: Record<string, any>) => void;
  setError: (name: string, error: string) => void;
  setErrors: (errors: Record<string, string>) => void;
  clearError: (name: string) => void;
  clearErrors: () => void;
  setTouched: (name: string, touched: boolean) => void;
  setTouchedAll: (touched: boolean) => void;
  reset: () => void;
  submit: () => Promise<void>;
  validate: () => boolean;
  validateField: (name: string) => boolean;
}

export interface FormContextValue {
  state: FormState;
  actions: FormActions;
  config: FormConfig;
}

export interface UseFormOptions {
  initialValues?: Record<string, any>;
  validationRules?: Record<string, ValidationRule[]>;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onReset?: () => void;
  onFieldChange?: (name: string, value: any, allData: Record<string, any>) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  resetOnSubmit?: boolean;
}

export interface UseFormReturn {
  state: FormState;
  actions: FormActions;
  fieldProps: (name: string) => {
    value: any;
    onChange: (value: any) => void;
    onBlur: () => void;
    error: string;
    touched: boolean;
    isValid: boolean;
    isInvalid: boolean;
  };
  formProps: {
    onSubmit: (e: React.FormEvent) => void;
    onReset: (e: React.FormEvent) => void;
    className?: string;
  };
}

// Tipos para validação
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface FieldValidationResult {
  isValid: boolean;
  error: string;
}

// Tipos para eventos
export interface FormEvent {
  preventDefault: () => void;
  stopPropagation: () => void;
}

export interface FieldChangeEvent {
  name: string;
  value: any;
  previousValue: any;
  allData: Record<string, any>;
}
