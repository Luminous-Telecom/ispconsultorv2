import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar itens ocultos em gráficos
 * Simplifica o gerenciamento de estado de múltiplos gráficos
 */
export const useChartHiddenItems = () => {
  const [hiddenClientes, setHiddenClientes] = useState<Set<number>>(new Set());
  const [hiddenPlanos, setHiddenPlanos] = useState<Set<number>>(new Set());
  const [hiddenPagamentos, setHiddenPagamentos] = useState<Set<number>>(new Set());
  const [hiddenDistribuicao, setHiddenDistribuicao] = useState<Set<number>>(new Set());
  const [hiddenTaxaPagamento, setHiddenTaxaPagamento] = useState<Set<number>>(new Set());
  const [hiddenContratos, setHiddenContratos] = useState<Set<number>>(new Set());

  // Funções de toggle para cada gráfico (memoizadas)
  const toggleCliente = useCallback((index: number) => {
    setHiddenClientes(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(index)) {
        newHidden.delete(index);
      } else {
        newHidden.add(index);
      }
      return newHidden;
    });
  }, []);

  const togglePlano = useCallback((index: number) => {
    setHiddenPlanos(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(index)) {
        newHidden.delete(index);
      } else {
        newHidden.add(index);
      }
      return newHidden;
    });
  }, []);

  const togglePagamento = useCallback((index: number) => {
    setHiddenPagamentos(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(index)) {
        newHidden.delete(index);
      } else {
        newHidden.add(index);
      }
      return newHidden;
    });
  }, []);

  const toggleDistribuicao = useCallback((index: number) => {
    setHiddenDistribuicao(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(index)) {
        newHidden.delete(index);
      } else {
        newHidden.add(index);
      }
      return newHidden;
    });
  }, []);

  const toggleTaxaPagamento = useCallback((index: number) => {
    setHiddenTaxaPagamento(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(index)) {
        newHidden.delete(index);
      } else {
        newHidden.add(index);
      }
      return newHidden;
    });
  }, []);

  const toggleContratos = useCallback((index: number) => {
    setHiddenContratos(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(index)) {
        newHidden.delete(index);
      } else {
        newHidden.add(index);
      }
      return newHidden;
    });
  }, []);

  return {
    hiddenClientes,
    hiddenPlanos,
    hiddenPagamentos,
    hiddenDistribuicao,
    hiddenTaxaPagamento,
    hiddenContratos,
    toggleCliente,
    togglePlano,
    togglePagamento,
    toggleDistribuicao,
    toggleTaxaPagamento,
    toggleContratos,
  };
};

