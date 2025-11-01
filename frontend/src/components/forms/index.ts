// Exportar todos os componentes do sistema de formulários
export { default as Form } from './Form';
export { FormProvider } from './FormProvider';
export { default as FormFieldWrapper } from './FormFieldWrapper';

// Componentes específicos
export { default as AddressFields } from './AddressFields';
export { default as ContactFields } from './ContactFields';

// Exportar hooks
export { useForm } from './useForm';
export { useFormContext, useFormField } from './FormProvider';

// Exportar validações
export { ValidationRules, Patterns, BackNetValidationRules, validateField, validateRule } from './ValidationRules';

// Exportar tipos
export * from './types';
