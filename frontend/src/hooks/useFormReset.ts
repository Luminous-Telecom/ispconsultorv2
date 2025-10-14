import { useEffect } from 'react';

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
  useEffect(() => {
    if (show) {
      // Resetar quando modal abrir
      setFormData(initialData);
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
  }, [show, setFormData, setErrors, initialData]);

  useEffect(() => {
    // Carregar dados customizados após reset (se fornecido)
    if (show && customData) {
      setFormData(customData);
    }
  }, [show, customData, setFormData]);
}

export default useFormReset;
