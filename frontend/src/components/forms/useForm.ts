import { useState, useCallback, useMemo, useEffect } from 'react';
import { UseFormOptions, UseFormReturn, FormState, FormActions } from './types';
import { FormValue } from '../../types/common';
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
  const [data, setData] = useState<Record<string, FormValue>>(initialValues);
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
  const validateFieldValue = useCallback((name: string, value: FormValue): boolean => {
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
  const actions: FormActions = useMemo(() => ({
    setValue: (name: string, value: FormValue) => {
      setData(prev => ({ ...prev, [name]: value }));
      
      if (validateOnChange) {
        validateFieldValue(name, value);
      }

      if (onFieldChange) {
        onFieldChange(name, value, { ...data, [name]: value });
      }
    },

    setValues: (values: Record<string, FormValue>) => {
      setData(prev => ({ ...prev, ...values }));
      
      if (validateOnChange) {
        Object.keys(values).forEach(name => {
          validateFieldValue(name, values[name]);
        });
      }
    },

    setError: (name: string, error: string) => {
      setErrors(prev => ({ ...prev, [name]: error }));
    },

    setErrors: (newErrors: Record<string, string>) => {
      setErrors(newErrors);
    },

    clearError: (name: string) => {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    },

    clearErrors: () => {
      setErrors({});
    },

    setTouched: (name: string, touchedValue: boolean) => {
      setTouched(prev => ({ ...prev, [name]: touchedValue }));
    },

    setTouchedAll: (touchedValue: boolean) => {
      const newTouched: Record<string, boolean> = {};
      Object.keys(data).forEach(name => {
        newTouched[name] = touchedValue;
      });
      setTouched(newTouched);
    },

    reset: () => {
      setData(initialValues);
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
      
      if (onReset) {
        onReset();
      }
    },

    submit: async () => {
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
    },

    validate: validateAll,
    validateField: (name: string) => validateFieldValue(name, data[name]),
  }), [validateOnChange, validateFieldValue, onFieldChange, data, onReset, initialValues, validateOnSubmit, validateAll, onSubmit, resetOnSubmit]);

  // Props para campos
  const fieldProps = useCallback((name: string) => {
    const value = data[name];
    const error = errors[name] || '';
    const touchedValue = touched[name] || false;
    const isValid = !error;
    const isInvalid = !!error;

    return {
      value,
      onChange: (newValue: FormValue) => actions.setValue(name, newValue),
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
