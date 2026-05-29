import { useState, useEffect } from 'react';
import { ContaPagar } from 'types';
import type { PagamentoData } from '../types';
import { getInitialPagamentoData, calculatePagamentoTotals } from '../utils';
import { formatCurrency } from 'utils/formatters';
import type { useContaPagarQueries } from './useContaPagarQueries';

interface UseContaPagarPagamentoParams {
  show: boolean;
  showPagamentoOnOpen: boolean;
  contaPagarId: number | null;
  contaPagar: ContaPagar | undefined;
  pagarMutation: ReturnType<typeof useContaPagarQueries>['pagarMutation'];
  refetchContaPagar: ReturnType<typeof useContaPagarQueries>['refetchContaPagar'];
  onSuccess?: () => void;
}

export const useContaPagarPagamento = ({
  show,
  showPagamentoOnOpen,
  contaPagarId,
  contaPagar,
  pagarMutation,
  refetchContaPagar,
  onSuccess
}: UseContaPagarPagamentoParams) => {
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [pagamentoData, setPagamentoData] = useState<PagamentoData>(getInitialPagamentoData);

  const { valorAberto, valorTotalCalculado, valorTotal } = calculatePagamentoTotals(contaPagar, pagamentoData);

  useEffect(() => {
    if (!show) {
      setShowPagamentoModal(false);
    }
  }, [show]);

  useEffect(() => {
    if (show && showPagamentoOnOpen && contaPagarId && contaPagar) {
      setShowPagamentoModal(true);
    }
  }, [show, showPagamentoOnOpen, contaPagarId, contaPagar]);

  useEffect(() => {
    if (showPagamentoModal && contaPagar && !pagamentoData.valor_total) {
      setPagamentoData(prev => ({
        ...prev,
        valor_total: formatCurrency(valorTotalCalculado, false)
      }));
    }
  }, [showPagamentoModal, contaPagar, valorTotalCalculado, pagamentoData.valor_total]);

  const closePagamentoModal = () => {
    setShowPagamentoModal(false);
    setPagamentoData(getInitialPagamentoData());
  };

  const handlePagarManual = async () => {
    if (!contaPagarId || !contaPagar || valorTotal <= 0) {
      return;
    }

    try {
      await pagarMutation.mutateAsync({
        id: contaPagarId,
        data: {
          data: pagamentoData.data_pagamento,
          valor: valorTotal,
          tipo_pagamento: pagamentoData.tipo_pagamento,
          observacao: pagamentoData.observacao || undefined
        }
      });

      setPagamentoData(getInitialPagamentoData());
      if (contaPagarId) {
        await refetchContaPagar();
      }
      onSuccess?.();
    } catch {
      // Erro já tratado pelo hook
    }
  };

  return {
    showPagamentoModal,
    pagamentoData,
    setPagamentoData,
    valorAberto,
    valorTotalCalculado,
    valorTotal,
    closePagamentoModal,
    handlePagarManual
  };
};
