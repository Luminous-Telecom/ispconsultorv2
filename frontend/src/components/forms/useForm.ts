import { useState, useCallback, useMemo, useEffect } from 'react';
import { UseFormOptions, UseFormReturn, FormState, FormActions, ValidationRule, FieldValidationResult } from './types';
import { validateField } from './ValidationRules';

export const useForm = (options: UseFormOptions = {}): UseFormReturn => {
  const {
    initialValues = {},
    validationRules = {},
    onSubmit,
    onReset,
    onFieldChange,
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
    resetOnSubmit = false,
  } = options;

  // Estado do formulário
  const [data, setData] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Atualizar dados quando initialValues mudarem
  useEffect(() => {
    setData(initialValues);
  }, [initialValues]);

  // Calcular estado derivado
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0 && Object.values(errors).every(error => !error);
  }, [errors]);

  const isDirty = useMemo(() => {
    return Object.keys(data).some(key => data[key] !== initialValues[key]);
  }, [data, initialValues]);

  const isPristine = useMemo(() => {
    return !isDirty;
  }, [isDirty]);

  const state: FormState = {
    data,
    errors,
    touched,
    isValid,
    isSubmitting,
    isDirty,
    isPristine,
  };

  // Função para validar um campo específico
  const validateFieldValue = useCallback((name: string, value: any): boolean => {
    const rules = validationRules[name] || [];
    const result = validateField(value, rules);
    
    setErrors(prev => ({
      ...prev,
      [name]: result.error,
    }));

    return result.isValid;
  }, [validationRules]);

  // Função para validar todos os campos
  const validateAll = useCallback((): boolean => {
    let allValid = true;
    const newErrors: Record<string, string> = {};

    Object.keys(data).forEach(name => {
      const rules = validationRules[name] || [];
      const result = validateField(data[name], rules);
      
      if (!result.isValid) {
        allValid = false;
        newErrors[name] = result.error;
      }
    });

    setErrors(newErrors);
    return allValid;
  }, [data, validationRules]);

  // Ações do formulário
  const actions: FormActions = {
    setValue: useCallback((name: string, value: any) => {
      setData(prev => ({ ...prev, [name]: value }));
      
      if (validateOnChange) {
        validateFieldValue(name, value);
      }

      if (onFieldChange) {
        onFieldChange(name, value, { ...data, [name]: value });
      }
    }, [validateOnChange, validateFieldValue, onFieldChange, data]),

    setValues: useCallback((values: Record<string, any>) => {
      setData(prev => ({ ...prev, ...values }));
      
      if (validateOnChange) {
        Object.keys(values).forEach(name => {
          validateFieldValue(name, values[name]);
        });
      }
    }, [validateOnChange, validateFieldValue]),

    setError: useCallback((name: string, error: string) => {
      setErrors(prev => ({ ...prev, [name]: error }));
    }, []),

    setErrors: useCallback((newErrors: Record<string, string>) => {
      setErrors(newErrors);
    }, []),

    clearError: useCallback((name: string) => {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }, []),

    clearErrors: useCallback(() => {
      setErrors({});
    }, []),

    setTouched: useCallback((name: string, touchedValue: boolean) => {
      setTouched(prev => ({ ...prev, [name]: touchedValue }));
    }, []),

    setTouchedAll: useCallback((touchedValue: boolean) => {
      const newTouched: Record<string, boolean> = {};
      Object.keys(data).forEach(name => {
        newTouched[name] = touchedValue;
      });
      setTouched(newTouched);
    }, [data]),

    reset: useCallback(() => {
      setData(initialValues);
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
      
      if (onReset) {
        onReset();
      }
    }, [initialValues, onReset]),

    submit: useCallback(async () => {
      setIsSubmitting(true);
      
      try {
        // Validar antes de submeter
        if (validateOnSubmit) {
          const isValid = validateAll();
          if (!isValid) {
            setIsSubmitting(false);
            return;
          }
        }

        if (onSubmit) {
          await onSubmit(data);
        }

        if (resetOnSubmit) {
          setData(initialValues);
          setErrors({});
          setTouched({});
          setIsSubmitting(false);
          
          if (onReset) {
            onReset();
          }
        }
      } catch (error) {
        console.error('Erro ao submeter formulário:', error);
      } finally {
        setIsSubmitting(false);
      }
    }, [validateOnSubmit, validateAll, onSubmit, data, resetOnSubmit, initialValues, onReset]),

    validate: validateAll,
    validateField: (name: string) => validateFieldValue(name, data[name]),
  };

  // Props para campos
  const fieldProps = useCallback((name: string) => {
    const value = data[name];
    const error = errors[name] || '';
    const touchedValue = touched[name] || false;
    const isValid = !error;
    const isInvalid = !!error;

    return {
      value,
      onChange: (newValue: any) => actions.setValue(name, newValue),
      onBlur: () => {
        actions.setTouched(name, true);
        if (validateOnBlur) {
          actions.validateField(name);
        }
      },
      error,
      touched: touchedValue,
      isValid,
      isInvalid,
    };
  }, [data, errors, touched, actions, validateOnBlur]);

  // Props para o formulário
  const formProps = useMemo(() => ({
    onSubmit: (e: React.FormEvent) => {
      e.preventDefault();
      actions.submit();
    },
    onReset: (e: React.FormEvent) => {
      e.preventDefault();
      actions.reset();
    },
  }), [actions]);

  return {
    state,
    actions,
    fieldProps,
    formProps,
  };
};
