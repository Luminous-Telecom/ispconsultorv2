import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTitulosFinanceiro } from 'hooks/useTitulosFinanceiro';
import { Titulo, TituloFilters } from 'types';
import { saasTituloService, type SaasTitulo } from 'services/saas/saasCrudService';
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
  isSaas,
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
  }, [
    show,
    initialFilters?.status,
    initialFilters?.data_vencimento_inicio,
    initialFilters?.data_vencimento_fim,
    initialFilters?.data_pagamento_inicio,
    initialFilters?.data_pagamento_fim,
  ]);

  useEffect(() => {
    setPage(1);
  }, [showCancelados, dataVencimentoInicio, dataVencimentoFim, setPage]);

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

  const { data: titulosData, isLoading, refetch } = useTitulosFinanceiro(filters, !isSaas);
  const {
    data: saasData,
    isLoading: saasLoading,
    refetch: saasRefetch,
  } = useQuery({
    queryKey: [
      'saas-titulos',
      list.tableFilters.page,
      list.tableFilters.limit,
      list.tableFilters.debouncedSearch,
      list.tableFilters.sortColumn,
      list.tableFilters.sortDirection,
      showCancelados,
      pagamentoInicio,
      pagamentoFim,
      vencimentoInicio,
      vencimentoFim,
      statusFilter,
      filterByPaymentDate,
    ],
    queryFn: () =>
      saasTituloService.list({
        page: list.tableFilters.page,
        limit: list.tableFilters.limit,
        search: list.tableFilters.debouncedSearch || undefined,
        sortColumn: list.tableFilters.sortColumn,
        sortDirection: list.tableFilters.sortDirection,
        ...(statusFilter && { status: statusFilter }),
        ...(filterByPaymentDate
          ? {
              ...(pagamentoInicio && { data_pagamento_inicio: pagamentoInicio }),
              ...(pagamentoFim && { data_pagamento_fim: pagamentoFim }),
            }
          : {
              ...(vencimentoInicio && { data_vencimento_inicio: vencimentoInicio }),
              ...(vencimentoFim && { data_vencimento_fim: vencimentoFim }),
            }),
      }),
    enabled: isSaas && show,
    staleTime: 0,
  });

  const isLoadingData = isSaas ? saasLoading : isLoading;
  const refetchData = isSaas ? saasRefetch : refetch;

  const handleRefreshData = useCallback(async () => {
    if (isSaas) {
      await queryClient.invalidateQueries({ queryKey: ['saas-titulos'] });
      await saasRefetch();
    } else {
      await queryClient.invalidateQueries({ queryKey: ['titulos-financeiro'] });
      await refetch();
    }
  }, [isSaas, queryClient, refetch, saasRefetch]);

  const titulos = useMemo(() => {
    if (isSaas) {
      const listRes = saasData?.data as { data?: SaasTitulo[] } | undefined;
      return listRes?.data || [];
    }
    return titulosData?.data || [];
  }, [isSaas, saasData?.data, titulosData?.data]);

  const pagination = useMemo(() => {
    if (isSaas) {
      const listRes = saasData?.data as
        | { pagination?: { total: number; page: number; limit: number; totalPages: number } }
        | undefined;
      const p = listRes?.pagination;
      if (!p) return undefined;
      const currentPage = p.page;
      const perPage = p.limit;
      const total = p.total;
      const lastPage = p.totalPages;
      const from = total > 0 ? (currentPage - 1) * perPage + 1 : 0;
      const to = total > 0 ? Math.min(currentPage * perPage, total) : 0;
      return { current_page: currentPage, last_page: lastPage, per_page: perPage, total, from, to };
    }
    if (!titulosData || !titulosData.pagination) return undefined;
    const pag = titulosData.pagination;
    const currentPage =
      typeof pag.current_page === 'number' ? pag.current_page : list.tableFilters.page;
    const perPage = list.tableFilters.limit;
    const total = typeof pag.total === 'number' ? pag.total : 0;
    const lastPage = total > 0 ? Math.ceil(total / perPage) : 1;
    const from = total > 0 ? (currentPage - 1) * perPage + 1 : 0;
    const to = total > 0 ? Math.min(currentPage * perPage, total) : 0;
    return { current_page: currentPage, last_page: lastPage, per_page: perPage, total, from, to };
  }, [isSaas, saasData?.data, titulosData, list.tableFilters.limit, list.tableFilters.page]);

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

  const handleShowCanceladosChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShowCancelados(e.target.checked);
  }, []);

  const handleDataVencimentoInicioChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDataVencimentoInicio(e.target.value);
  }, []);

  const handleDataVencimentoFimChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDataVencimentoFim(e.target.value);
  }, []);

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
