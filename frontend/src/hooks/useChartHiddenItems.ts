import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar itens ocultos em gráficos
 * Simplifica o gerenciamento de estado de múltiplos gráficos
 */
export const useChartHiddenItems = () => {
  const [hiddenClientes, setHiddenClientes] = useState<Set<number>>(new Set());
  const [hiddenPlanos, setHiddenPlanos] = useState<Set<number>>(new Set());
  const [hiddenPagamentos, setHiddenPagamentos] = useState<Set<number>>(new Set());
  const [hiddenPagamentosMesAtual, setHiddenPagamentosMesAtual] = useState<Set<number>>(new Set());
  const [hiddenDistribuicao, setHiddenDistribuicao] = useState<Set<number>>(new Set());
  const [hiddenContratos, setHiddenContratos] = useState<Set<number>>(new Set());
  /** Chaves do gráfico de status de backups (ex.: sucesso, falha) — mesma ideia da legenda dos pizzas. */
  const [hiddenBackupStatus, setHiddenBackupStatus] = useState<Set<string>>(new Set());

  // Funções de toggle para cada gráfico (memoizadas)
  const toggleCliente = useCallback((index: number) => {
    setHiddenClientes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
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

  const togglePagamentoMesAtual = useCallback((index: number) => {
    setHiddenPagamentosMesAtual((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
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

  const toggleBackupStatus = useCallback((key: string) => {
    setHiddenBackupStatus((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return {
    hiddenClientes,
    hiddenPlanos,
    hiddenPagamentos,
    hiddenPagamentosMesAtual,
    hiddenDistribuicao,
    hiddenContratos,
    hiddenBackupStatus,
    toggleCliente,
    togglePlano,
    togglePagamento,
    togglePagamentoMesAtual,
    toggleDistribuicao,
    toggleContratos,
    toggleBackupStatus,
  };
};

