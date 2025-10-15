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
  const previousCustomDataStr = useRef<string>('');

  useEffect(() => {
    // Debug: Log para identificar piscar
    console.log(`🔄 useFormReset: show=${show}, previousShow=${previousShow.current}, customData=${!!customData}`);
    
    // Só executa quando show muda
    if (show !== previousShow.current) {
      console.log(`📝 useFormReset: Modal state changed - show: ${previousShow.current} → ${show}`);
      hasLoadedCustomData.current = false;
      previousCustomDataStr.current = '';
      
      if (show) {
        // Se há dados customizados disponíveis, carrega eles; senão usa os iniciais
        if (customData) {
          const customDataStr = JSON.stringify(customData);
          console.log(`✅ useFormReset: Loading custom data`, customData);
          setFormData(customData);
          hasLoadedCustomData.current = true;
          previousCustomDataStr.current = customDataStr;
        } else {
          console.log(`⚠️ useFormReset: Loading initial data (no customData)`);
          // Se não há customData, carrega dados iniciais
          setFormData(initialData);
        }
        
        if (setErrors) {
          setErrors({});
        }
      } else {
        console.log(`🧹 useFormReset: Clearing form data (modal closing)`);
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
      const currentCustomDataStr = JSON.stringify(customData);
      // Só atualiza se o conteúdo realmente mudou e ainda não foi carregado
      if (currentCustomDataStr !== previousCustomDataStr.current) {
        setFormData(customData);
        hasLoadedCustomData.current = true;
        previousCustomDataStr.current = currentCustomDataStr;
      }
    }
  }, [show, customData]);
}

export default useFormReset;
