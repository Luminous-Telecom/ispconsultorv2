import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useContasPagar, useDeleteContaPagar, useDuplicarContaPagar } from 'hooks/useContasPagar';
import { useFornecedores } from 'hooks/useFornecedores';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { ContaPagar, ContaPagarFilters, Fornecedor } from 'types';
import { FilterValue } from 'types/common';
import { calcResumoFinanceiro } from './contasPagarListUtils';
import { ContasPagarResumoFinanceiro } from './contasPagarListTypes';

interface UseContasPagarListDataParams {
  show: boolean;
  initialFilters?: Partial<ContaPagarFilters>;
  list: ReturnType<typeof useEntityListModal<ContaPagar>>;
}

export function useContasPagarListData({ show, initialFilters, list }: UseContasPagarListDataParams) {
  const [dataVencimentoInicio, setDataVencimentoInicio] = useState<string>('');
  const [dataVencimentoFim, setDataVencimentoFim] = useState<string>('');

  useEffect(() => {
    if (show && initialFilters?.data_inicio && initialFilters?.data_fim) {
      setDataVencimentoInicio(initialFilters.data_inicio);
      setDataVencimentoFim(initialFilters.data_fim);
    }
  }, [show, initialFilters?.data_inicio, initialFilters?.data_fim]);

  const { data: fornecedoresData } = useFornecedores({ limit: 1000 });
  const fornecedoresOptions = useMemo(() => {
    if (!fornecedoresData?.data) return [];
    return fornecedoresData.data.map((fornecedor: Fornecedor) => ({
      value: fornecedor.id?.toString() || '',
      label:
        fornecedor.nome_razao_social ||
        fornecedor.nome_fantasia ||
        `Fornecedor ${fornecedor.id}`,
    }));
  }, [fornecedoresData]);

  const { setPage } = list.tableFilters;

  const apiFilters = useMemo(() => {
    const filters: ContaPagarFilters = {
      ...(list.tableFilters.filters.status && {
        status: list.tableFilters.filters.status as ContaPagarFilters['status'],
      }),
      ...(list.tableFilters.filters.tipo_pagamento && {
        tipo_pagamento: list.tableFilters.filters
          .tipo_pagamento as ContaPagarFilters['tipo_pagamento'],
      }),
      ...(list.tableFilters.filters.fornecedor_id && {
        fornecedor_id: String(list.tableFilters.filters.fornecedor_id),
      }),
      ...(dataVencimentoInicio && { data_inicio: dataVencimentoInicio }),
      ...(dataVencimentoFim && { data_fim: dataVencimentoFim }),
    };
    return filters;
  }, [list.tableFilters.filters, dataVencimentoInicio, dataVencimentoFim]);

  const { data: contasPagarData, isLoading, refetch } = useContasPagar({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn || undefined,
    sortDirection: list.tableFilters.sortDirection || undefined,
    ...apiFilters,
  });

  const modalData = useMemo(
    () => (contasPagarData?.data ?? [] as ContaPagar[]).filter((item: ContaPagar) => item.id != null),
    [contasPagarData?.data]
  );

  const resumoFinanceiro: ContasPagarResumoFinanceiro = useMemo(
    () => calcResumoFinanceiro(modalData),
    [modalData]
  );

  const deleteContaPagarMutation = useDeleteContaPagar();
  const duplicarContaPagarMutation = useDuplicarContaPagar();

  const handleDelete = useCallback(
    async (contaPagarId: number) => {
      try {
        await deleteContaPagarMutation.mutateAsync(contaPagarId);
        refetch();
      } catch {
        // Erro já tratado pelo hook
      }
    },
    [deleteContaPagarMutation, refetch]
  );

  const handleDuplicar = useCallback(
    async (contaPagarId: number) => {
      try {
        await duplicarContaPagarMutation.mutateAsync(contaPagarId);
        refetch();
      } catch {
        // Erro já tratado pelo hook
      }
    },
    [duplicarContaPagarMutation, refetch]
  );

  const handleFiltersChange = useCallback(
    (filterValues: Record<string, FilterValue>) => {
      const convertedFilters: Partial<ContaPagarFilters> = {};
      Object.entries(filterValues).forEach(([key, value]) => {
        convertedFilters[key as keyof ContaPagarFilters] = Array.isArray(value)
          ? value[0] || null
          : (value as string | number | boolean | null | undefined);
      });
      list.tableFilters.setFilters(convertedFilters);
    },
    [list.tableFilters]
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

  const pagination = useMemo(
    () => list.buildPagination(contasPagarData?.pagination),
    [list, contasPagarData?.pagination]
  );

  return {
    dataVencimentoInicio,
    dataVencimentoFim,
    handleDataVencimentoInicioChange,
    handleDataVencimentoFimChange,
    fornecedoresOptions,
    modalData,
    resumoFinanceiro,
    isLoading,
    refetch,
    handleDelete,
    handleDuplicar,
    handleFiltersChange,
    pagination,
    hasResumo: show && modalData.length > 0,
  };
}
