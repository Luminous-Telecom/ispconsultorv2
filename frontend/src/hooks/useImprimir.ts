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

  const handleImprimirSelecionados = useCallback((ids: string) => {
    if (!ids) {
      error( `Nenhum ${itemType} selecionado`);
      return;
    }

    const url = `${getApiUrl()}?ids=${ids}&print=true`;
    window.open(url, '_blank');
  }, [itemType, getApiUrl, error]);

  const handleImprimirTodos = useCallback((ids: string) => {
    if (!ids) {
      error( `Não há ${itemType}s ${filterLabel.toLowerCase()} para imprimir`);
      return;
    }

    const url = `${getApiUrl()}?ids=${ids}&print=true`;
    window.open(url, '_blank');
  }, [itemType, filterLabel, getApiUrl, error]);

  return {
    handleImprimirSelecionados,
    handleImprimirTodos
  };
};
