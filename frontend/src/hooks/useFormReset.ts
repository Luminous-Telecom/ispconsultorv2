import { useEffect, useRef } from 'react';

interface UseFormResetOptions<T> {
  show: boolean;
  initialData: T;
  setFormData: (data: T) => void;
  setErrors?: (errors: any) => void;
  customData?: T;
}

/**
 * Hook personalizado para resetar formulários quando modais abrem/fecham
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

  useEffect(() => {
    // Só executa quando show muda
    if (show !== previousShow.current) {
      hasLoadedCustomData.current = false;
      
      if (show) {
        // Se há dados customizados, carrega eles; senão usa os iniciais
        const dataToLoad = customData || initialData;
        setFormData(dataToLoad);
        hasLoadedCustomData.current = true;
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
  }, [show]);
  
  // Atualizar customData quando ele estiver disponível após o modal abrir
  useEffect(() => {
    if (show && customData && !hasLoadedCustomData.current) {
      setFormData(customData);
      hasLoadedCustomData.current = true;
    }
  }, [show, customData]);
}

export default useFormReset;
