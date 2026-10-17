import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTitulosFinanceiro } from 'hooks/useTitulosFinanceiro';
import { Titulo, TituloFilters } from 'types';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { TituloItemUnion } from './contasReceberListTypes';

interface UseContasReceberListDataParams {
  show: boolean;
  isSaas: boolean;
  initialFilters?: Partial<TituloFilters>;
  list: ReturnType<typeof useEntityListModal<TituloItemUnion>>;
}

export function useContasReceberListData({
  show,
  isSaas: _isSaas,
  initialFilters,
  list,
}: UseContasReceberListDataParams) {
  const queryClient = useQueryClient();
  const { setPage, clearSearch } = list.tableFilters;

  const [selectedItems, setSelectedItems] = useState<TituloItemUnion[]>([]);
  const [showCancelados, setShowCancelados] = useState(false);
  const [dataVencimentoInicio, setDataVencimentoInicio] = useState<string>('');
  const [dataVencimentoFim, setDataVencimentoFim] = useState<string>('');

  const prevShowRef = useRef(false);
  useEffect(() => {
    if (show && !prevShowRef.current) {
      setPage(1);
      if (initialFilters?.data_pagamento_inicio || initialFilters?.data_pagamento_fim) {
        setDataVencimentoInicio(initialFilters.data_pagamento_inicio ?? '');
        setDataVencimentoFim(initialFilters.data_pagamento_fim ?? '');
      } else if (initialFilters?.data_vencimento_inicio || initialFilters?.data_vencimento_fim) {
        setDataVencimentoInicio(initialFilters.data_vencimento_inicio ?? '');
        setDataVencimentoFim(initialFilters.data_vencimento_fim ?? '');
      } else if (initialFilters?.status) {
        setDataVencimentoInicio('');
        setDataVencimentoFim('');
      }
    }
    prevShowRef.current = show;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setPage estável; só reset na abertura do modal
  }, [
    show,
    initialFilters?.status,
    initialFilters?.data_vencimento_inicio,
    initialFilters?.data_vencimento_fim,
    initialFilters?.data_pagamento_inicio,
    initialFilters?.data_pagamento_fim,
  ]);

  useEffect(() => {
    if (!showCancelados && selectedItems.length > 0) {
      const canceladosSelecionados = selectedItems.filter(
        (item) => item.status?.toLowerCase() === 'cancelado'
      );

      if (canceladosSelecionados.length > 0) {
        const itensNaoCancelados = selectedItems.filter(
          (item) => item.status?.toLowerCase() !== 'cancelado'
        );
        setSelectedItems(itensNaoCancelados);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCancelados]);

  const statusFilter = initialFilters?.status ?? (showCancelados ? undefined : '!cancelado');
  const filterByPaymentDate =
    initialFilters?.data_pagamento_inicio != null || initialFilters?.data_pagamento_fim != null;
  const pagamentoInicio = dataVencimentoInicio || initialFilters?.data_pagamento_inicio || '';
  const pagamentoFim = dataVencimentoFim || initialFilters?.data_pagamento_fim || '';
  const vencimentoInicio = dataVencimentoInicio || initialFilters?.data_vencimento_inicio || '';
  const vencimentoFim = dataVencimentoFim || initialFilters?.data_vencimento_fim || '';

  const filters: TituloFilters = {
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    ...(statusFilter && { status: statusFilter }),
    ...(filterByPaymentDate
      ? {
          ...(pagamentoInicio ? { data_pagamento_inicio: pagamentoInicio } : {}),
          ...(pagamentoFim ? { data_pagamento_fim: pagamentoFim } : {}),
        }
      : {
          ...(vencimentoInicio ? { data_vencimento_inicio: vencimentoInicio } : {}),
          ...(vencimentoFim ? { data_vencimento_fim: vencimentoFim } : {}),
        }),
    sortColumn: list.tableFilters.apiParams.sortColumn,
    sortDirection: list.tableFilters.apiParams.sortDirection,
  };

  const { data: titulosData, isLoading, refetch } = useTitulosFinanceiro(filters, show);
  const isLoadingData = isLoading;
  const refetchData = refetch;

  const handleRefreshData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['titulos-financeiro'] });
    await refetch();
  }, [queryClient, refetch]);

  const titulos = useMemo(() => titulosData?.data || [], [titulosData?.data]);
  const pagination = titulosData?.pagination;

  useEffect(() => {
    if (!show) {
      setDataVencimentoInicio('');
      setDataVencimentoFim('');
      clearSearch();
      setPage(1);
      setSelectedItems([]);
    }
  }, [show, clearSearch, setPage]);

  useEffect(() => {
    if (titulosData?.data && selectedItems.length > 0) {
      const selectedIds = selectedItems.map((item) => item.id);
      const currentIds = titulosData.data.map((titulo: Titulo) => titulo.id);
      const hasInvalidSelection = selectedIds.some((id) => !currentIds.includes(id));

      if (hasInvalidSelection) {
        setSelectedItems([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulosData?.data]);

  const filteredData = titulos;

  const handleShowCanceladosChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setShowCancelados(e.target.checked);
      setPage(1);
    },
    [setPage]
  );

  const handleDataVencimentoInicioChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDataVencimentoInicio(e.target.value);
      setPage(1);
    },
    [setPage]
  );

  const handleDataVencimentoFimChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDataVencimentoFim(e.target.value);
      setPage(1);
    },
    [setPage]
  );

  return {
    selectedItems,
    setSelectedItems,
    showCancelados,
    dataVencimentoInicio,
    dataVencimentoFim,
    handleShowCanceladosChange,
    handleDataVencimentoInicioChange,
    handleDataVencimentoFimChange,
    titulos,
    filteredData,
    pagination,
    isLoadingData,
    refetchData,
    handleRefreshData,
    titulosData,
  };
}
