import { useMemo } from 'react';

/**
 * Hook para gerar prefixo de formulário baseado no nome do componente
 */
export const useFormPrefix = (componentName: string): string => {
  return useMemo(() => {
    return componentName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }, [componentName]);
};
