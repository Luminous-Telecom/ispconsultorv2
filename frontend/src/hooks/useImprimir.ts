import { useCallback } from 'react';
import { useNotificationContext } from '../components/notifications/NotificationProvider';

interface UseImprimirProps {
  itemType: 'contrato' | 'titulo' | 'recibo' | 'carta';
  filterCondition?: (item: unknown) => boolean;
  filterLabel?: string;
}

export const useImprimir = ({ itemType, filterCondition: _filterCondition, filterLabel = 'Todos' }: UseImprimirProps) => {
  const { error } = useNotificationContext();

  const getApiUrl = useCallback(() => {
    switch (itemType) {
      case 'contrato':
        return '/contrato/web/multiplos';
      case 'titulo':
        return '/boleto/web/multiplos';
      case 'recibo':
        return '/recibo/web/multiplos';
      case 'carta':
        return '/carta/web/multiplos';
      default:
        return '/documento/web/multiplos';
    }
  }, [itemType]);

  const getBaseUrl = useCallback(() => {
    // Usar configuração dinâmica injetada pelo backend
    const appConfig = typeof window !== 'undefined' && window.__APP_CONFIG__ 
      ? window.__APP_CONFIG__ 
      : { REACT_APP_API_URL: process.env.REACT_APP_API_URL || '' };
    
    const apiUrl = appConfig.REACT_APP_API_URL || '';
    // Remover /api do final se existir
    return apiUrl.replace('/api', '');
  }, []);

  const handleImprimirSelecionados = useCallback((ids: string) => {
    if (!ids) {
      error( `Nenhum ${itemType} selecionado`);
      return;
    }

    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${getApiUrl()}?ids=${ids}&print=true`;
    window.open(url, '_blank');
  }, [itemType, getApiUrl, getBaseUrl, error]);

  const handleImprimirTodos = useCallback((ids: string) => {
    if (!ids) {
      error( `Não há ${itemType}s ${filterLabel.toLowerCase()} para imprimir`);
      return;
    }

    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${getApiUrl()}?ids=${ids}&print=true`;
    window.open(url, '_blank');
  }, [itemType, filterLabel, getApiUrl, getBaseUrl, error]);

  return {
    handleImprimirSelecionados,
    handleImprimirTodos
  };
};
