import { useCallback } from 'react';
import { CarneParcela } from '../../types';
import { TituloItem } from '../../types/cliente';
import { mapCarneParcelaToTituloItem } from './utils';

interface UsePrintActionsParams {
  handleImprimirRecibos: (selectedItems: TituloItem[]) => Promise<void>;
}

export function usePrintActions({ handleImprimirRecibos }: UsePrintActionsParams) {
  const handleImprimirRecibosWrapper = useCallback(
    async (items: CarneParcela[]) => {
      const tituloItems = items.map(mapCarneParcelaToTituloItem);
      await handleImprimirRecibos(tituloItems);
    },
    [handleImprimirRecibos]
  );

  return { handleImprimirRecibosWrapper };
}
