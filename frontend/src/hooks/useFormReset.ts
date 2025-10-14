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

  useEffect(() => {
    // Só executa quando show muda
    if (show !== previousShow.current) {
      if (show) {
        // Resetar quando modal abrir
        setFormData(initialData);
        if (setErrors) {
          setErrors({});
        }
        
        // Se há dados customizados, carrega após reset
        if (customData) {
          // Usar setTimeout para garantir que o reset aconteça primeiro
          setTimeout(() => {
            setFormData(customData);
          }, 0);
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
  
  // Atualizar dados customizados quando mudarem (mas modal já está aberto)
  useEffect(() => {
    if (show && customData && previousShow.current === show) {
      setFormData(customData);
    }
  }, [customData]);
}

export default useFormReset;
