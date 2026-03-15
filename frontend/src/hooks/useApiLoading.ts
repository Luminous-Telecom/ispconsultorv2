import { useEffect } from 'react';
import { useLoading } from 'contexts/LoadingContext';
import { ApiClient } from 'services/core/ApiClient';

/**
 * Hook que registra automaticamente o setLoading do contexto no ApiClient
 * Isso permite que o loading seja gerenciado automaticamente pelas requisições HTTP
 */
export const useApiLoading = (): void => {
  const { setLoading } = useLoading();

  useEffect(() => {
    // Registrar o callback de loading no ApiClient
    const unregister = ApiClient.registerLoadingCallback(setLoading);

    // Limpar o registro quando o componente desmontar
    return () => {
      unregister();
    };
  }, [setLoading]);
};

