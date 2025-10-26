import React, { createContext, useContext, ReactNode } from 'react';
import { FormContextValue, FormConfig } from './types';
import { useForm } from './useForm';

interface FormProviderProps {
  children: ReactNode;
  config: FormConfig;
  initialValues?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onReset?: () => void;
  onFieldChange?: (name: string, value: any, allData: Record<string, any>) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  resetOnSubmit?: boolean;
}

const FormContext = createContext<FormContextValue | null>(null);

export const FormProvider: React.FC<FormProviderProps> = ({
  children,
  config,
  initialValues = {},
  onSubmit,
  onReset,
  onFieldChange,
  validateOnChange = true,
  validateOnBlur = true,
  validateOnSubmit = true,
  resetOnSubmit = false,
}) => {
  console.log('🟡 FormProvider - initialValues recebido:', initialValues);
  Object.keys(initialValues).forEach(key => {
    console.log(`🟡 FormProvider - ${key}:`, initialValues[key], 'type:', typeof initialValues[key]);
  });
  
  // Converter FieldConfig para validationRules
  const validationRules = config.fields.reduce((rules, field) => {
    if (field.validation) {
      rules[field.name] = field.validation;
    }
    return rules;
  }, {} as Record<string, any>);

  // Usar o hook useForm
  const formHook = useForm({
    initialValues,
    validationRules,
    onSubmit: onSubmit || config.onSubmit,
    onReset: onReset || config.onReset,
    onFieldChange: onFieldChange || config.onFieldChange,
    validateOnChange: validateOnChange ?? config.validateOnChange,
    validateOnBlur: validateOnBlur ?? config.validateOnBlur,
    validateOnSubmit: validateOnSubmit ?? config.validateOnSubmit,
    resetOnSubmit: resetOnSubmit ?? config.resetOnSubmit,
  });

  console.log('🟡 FormProvider - state.data:', formHook.state.data);
  Object.keys(formHook.state.data).forEach(key => {
    console.log(`🟡 FormProvider - state.data.${key}:`, formHook.state.data[key], 'type:', typeof formHook.state.data[key]);
  });

  const contextValue: FormContextValue = {
    state: formHook.state,
    actions: formHook.actions,
    config,
  };

  return (
    <FormContext.Provider value={contextValue}>
      {children}
    </FormContext.Provider>
  );
};

// Hook para usar o contexto do formulário
export const useFormContext = (): FormContextValue => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext deve ser usado dentro de um FormProvider');
  }
  return context;
};

// Hook para usar o formulário diretamente
export const useFormField = (name: string) => {
  const { state, actions } = useFormContext();
  
  return {
    value: state.data[name],
    error: state.errors[name] || '',
    touched: state.touched[name] || false,
    isValid: !state.errors[name],
    isInvalid: !!state.errors[name],
    onChange: (value: any) => actions.setValue(name, value),
    onBlur: () => {
      actions.setTouched(name, true);
      actions.validateField(name);
    },
  };
};
