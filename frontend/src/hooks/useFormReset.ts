import { useEffect, useRef, useCallback } from 'react';
import { ensureString } from '../utils/stringUtils';

interface UseFormResetOptions<T> {
  show: boolean;
  initialData: T;
  setFormData: (data: T) => void;
  setErrors?: (errors: Record<string, string> | Record<string, unknown>) => void;
  customData?: T;
}

/**
 * Hook personalizado para resetar formulários quando modais abrem/fecham
 * Garante que valores string sejam sempre strings (evita [object Object])
 * @param show - Estado de visibilidade do modal
 * @param initialData - Dados iniciais do formulário
 * @param setFormData - Função para definir os dados do formulário
 * @param setErrors - Função para limpar erros (opcional)
 * @param customData - Dados customizados para carregar (opcional)
 */
export function useFormReset<T>({
  show,
  initialData,
  setFormData,
  setErrors,
  customData
}: UseFormResetOptions<T>) {
  const previousShow = useRef(show);
  const hasLoadedCustomData = useRef(false);
  const previousCustomDataStr = useRef<string>('');

  // Função para garantir que valores string sejam sempre strings
  const processData = useCallback((data: T): T => {
    const typedData = data as Record<string, unknown>;
    const typedInitialData = initialData as Record<string, unknown>;
    
    // Começar com os dados iniciais para garantir que todos os campos sejam preservados
    const result = { ...typedInitialData } as Record<string, unknown>;
    
    // Sobrescrever com os dados recebidos
    Object.keys(typedData).forEach((key) => {
      const value = typedData[key];
      const initialValue = typedInitialData[key];
      
      // Se o valor inicial é string, garantir que seja string
      if (typeof initialValue === 'string') {
        result[key] = ensureString(value);
      } else {
        // Preservar o valor recebido
        result[key] = value;
      }
    });
    
    return result as T;
  }, [initialData]);

  useEffect(() => {
    // Só executa quando show muda
    if (show !== previousShow.current) {
      hasLoadedCustomData.current = false;
      previousCustomDataStr.current = '';
      
      if (show) {
        // Se há dados customizados disponíveis, carrega eles; senão usa os iniciais
        if (customData) {
          const customDataStr = JSON.stringify(customData);
          setFormData(processData(customData));
          hasLoadedCustomData.current = true;
          previousCustomDataStr.current = customDataStr;
        } else {
          // Se não há customData, carrega dados iniciais
          setFormData(initialData);
        }
        
        if (setErrors) {
          setErrors({});
        }
      } else {
        // Limpar quando modal fechar
        setFormData(initialData);
        if (setErrors) {
          setErrors({});
        }
      }
      
      previousShow.current = show;
    }
  }, [show, customData, initialData, processData, setFormData, setErrors]);
  
  // Atualizar customData quando ele estiver disponível após o modal abrir
  useEffect(() => {
    if (show && customData && !hasLoadedCustomData.current) {
      const currentCustomDataStr = JSON.stringify(customData);
      // Só atualiza se o conteúdo realmente mudou e ainda não foi carregado
      if (currentCustomDataStr !== previousCustomDataStr.current) {
        setFormData(processData(customData));
        hasLoadedCustomData.current = true;
        previousCustomDataStr.current = currentCustomDataStr;
      }
    }
  }, [show, customData, processData, setFormData]);
}

export default useFormReset;
