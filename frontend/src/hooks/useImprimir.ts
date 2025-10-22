import { useCallback } from 'react';
import { useNotificationContext } from '../contexts/NotificationContext';

interface UseImprimirProps {
  itemType: 'contrato' | 'titulo' | 'recibo' | 'carta';
  filterCondition?: (item: any) => boolean;
  filterLabel?: string;
}

export const useImprimir = ({ itemType, filterCondition, filterLabel = 'Todos' }: UseImprimirProps) => {
  const { addNotification } = useNotificationContext();

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

  const handleImprimirSelecionados = useCallback((ids: string) => {
    if (!ids) {
      addNotification('error', `Nenhum ${itemType} selecionado`);
      return;
    }

    const url = `${process.env.REACT_APP_API_URL?.replace('/api', '')}${getApiUrl()}?ids=${ids}&print=true`;
    window.open(url, '_blank');
  }, [itemType, getApiUrl, addNotification]);

  const handleImprimirTodos = useCallback((ids: string) => {
    if (!ids) {
      addNotification('error', `Não há ${itemType}s ${filterLabel.toLowerCase()} para imprimir`);
      return;
    }

    const url = `${process.env.REACT_APP_API_URL?.replace('/api', '')}${getApiUrl()}?ids=${ids}&print=true`;
    window.open(url, '_blank');
  }, [itemType, filterLabel, getApiUrl, addNotification]);

  return {
    handleImprimirSelecionados,
    handleImprimirTodos
  };
};
