import { useEffect, useState } from 'react';
import { ensureString } from '../utils/stringUtils';

/**
 * Hook para carregar dados de formulário garantindo que valores sejam strings
 * Evita problemas de [object Object] em formulários
 */
export const useFormDataLoader = <T extends Record<string, any>>(
  data: T | undefined,
  defaultValues: T,
  setFormData: (data: T) => void
) => {
  useEffect(() => {
    if (data) {
      const processedData = Object.keys(defaultValues).reduce((acc, key) => {
        const value = data[key];
        
        // Garantir que valores string sejam sempre strings
        if (typeof defaultValues[key] === 'string') {
          acc[key] = ensureString(value);
        } else if (typeof defaultValues[key] === 'boolean') {
          acc[key] = value ?? false;
        } else if (typeof defaultValues[key] === 'number') {
          acc[key] = value ?? 0;
        } else {
          acc[key] = value || defaultValues[key];
        }
        
        return acc;
      }, {} as T);
      
      setFormData(processedData);
    }
  }, [data]);
};

