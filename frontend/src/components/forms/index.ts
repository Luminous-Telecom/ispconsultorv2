// Exportar todos os componentes do sistema de formulários
export { default as Form } from './Form';
export { FormProvider } from './FormProvider';
export { default as FormFieldWrapper } from './FormFieldWrapper';

// Exportar exemplo de uso
export { default as FormsExample } from './FormsExample';

// Exportar hooks
export { useForm } from './useForm';
export { useFormContext, useFormField } from './FormProvider';

// Exportar validações
export { ValidationRules, Patterns, CTMValidationRules, validateField, validateRule } from './ValidationRules';

// Exportar tipos
export * from './types';
