import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Contrato, useDeleteContrato } from 'hooks/useContratos';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { ContratoService, ContratoFilters } from 'services/contratoService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import {
  buildListFilters,
  calculateValorTotalDescontos,
  calculateValorTotalMensal,
  mapContratoToRow,
} from './contratoListUtils';
import { ContratoRow } from './contratoListTypes';

interface UseContratoListDataParams {
  show: boolean;
  initialFilters?: Partial<ContratoFilters>;
  list: ReturnType<typeof useEntityListModal<Contrato>>;
}

export function useContratoListData({ show, initialFilters, list }: UseContratoListDataParams) {
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const listFilters = useMemo(() => buildListFilters(initialFilters), [initialFilters]);

  const { data: contratosData, isLoading, refetch } = useQuery({
    queryKey: [
      'contratos',
      'list',
      list.tableFilters.page,
      list.tableFilters.limit,
      list.tableFilters.search,
      list.tableFilters.searchField,
      list.tableFilters.sortColumn,
      list.tableFilters.sortDirection,
      listFilters,
    ],
    queryFn: () =>
      ContratoService.list({
        page: list.tableFilters.page,
        limit: list.tableFilters.limit,
        search: list.tableFilters.search,
        searchField: list.tableFilters.searchField,
        sortColumn: list.tableFilters.sortColumn,
        sortDirection: list.tableFilters.sortDirection,
        ...listFilters,
      }),
    staleTime: 30 * 1000,
    refetchOnMount: false,
    enabled: show,
  });

  const contratos = useMemo(() => contratosData?.data || [], [contratosData]);

  const deleteContratoMutation = useDeleteContrato();

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteContratoMutation.mutateAsync(id);
        success('Contrato excluído com sucesso!');
        refetch();
      } catch (err: unknown) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.CONTRACT_DELETE_ERROR);
      }
    },
    [deleteContratoMutation, success, refetch, showApiError]
  );

  const pagination = useMemo(
    () => list.buildPagination(contratosData?.pagination),
    [list, contratosData?.pagination]
  );

  const dataWithVirtualFields = useMemo((): ContratoRow[] => {
    if (!contratos) return [];
    return contratos.map(mapContratoToRow);
  }, [contratos]);

  const valorTotalMensal = useMemo(
    () => calculateValorTotalMensal(contratos),
    [contratos]
  );

  const valorTotalDescontos = useMemo(
    () => calculateValorTotalDescontos(contratos),
    [contratos]
  );

  return {
    contratos,
    dataWithVirtualFields,
    valorTotalMensal,
    valorTotalDescontos,
    pagination,
    isLoading,
    refetch,
    handleDelete,
  };
}
