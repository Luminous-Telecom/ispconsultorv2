import { useMemo } from 'react';

/**
 * Hook para gerar IDs únicos para campos de formulário
 * Baseado no nome do componente e nome do campo
 */
export const useFormId = (componentName: string, fieldName: string): string => {
  return useMemo(() => {
    // Converter nome do componente para formato kebab-case
    const componentId = componentName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
    
    return `${componentId}-${fieldName}`;
  }, [componentName, fieldName]);
};

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
