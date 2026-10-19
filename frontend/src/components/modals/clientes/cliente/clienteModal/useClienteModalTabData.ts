import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTableFilters } from 'hooks/useTableFilters';
import { TituloService } from 'services/tituloService';
import {
  filterParcelasByCancelados,
  enrichParcelasWithSearchFields,
} from './clienteParcelaUtils';

interface UseClienteModalTabDataParams {
  clienteId?: number | null;
  createdClienteId: number | null;
  showCancelados: boolean;
  showFinanceTabs?: boolean;
}

export function useClienteModalTabData({
  clienteId,
  createdClienteId,
  showCancelados,
  showFinanceTabs = true,
}: UseClienteModalTabDataParams) {
  const contratosTableFilters = useTableFilters({
    initialPage: 1,
    initialLimit: 100,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });

  const titulosTableFilters = useTableFilters({
    initialPage: 1,
    initialLimit: 100,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });

  const effectiveClienteIdForParcelas = clienteId || createdClienteId || undefined;

  const {
    data: parcelasData,
    isLoading: isLoadingParcelas,
    refetch: refetchParcelas,
  } = useQuery({
    queryKey: [
      'parcelas',
      'cliente',
      effectiveClienteIdForParcelas,
      titulosTableFilters.sortColumn,
      titulosTableFilters.sortDirection,
    ],
    queryFn: () =>
      TituloService.list({
        cliente_id: effectiveClienteIdForParcelas!,
        page: 1,
        limit: 5000,
        sortColumn: titulosTableFilters.sortColumn,
        sortDirection: titulosTableFilters.sortDirection,
      }),
    enabled: showFinanceTabs && !!effectiveClienteIdForParcelas,
  });

  const sortedData = useMemo(() => {
    if (!parcelasData?.data) return [];
    const filteredData = filterParcelasByCancelados(parcelasData.data, showCancelados);
    return enrichParcelasWithSearchFields(filteredData);
  }, [parcelasData?.data, showCancelados]);

  return {
    contratosTableFilters,
    titulosTableFilters,
    effectiveClienteIdForParcelas,
    parcelasData,
    isLoadingParcelas,
    refetchParcelas,
    sortedData,
  };
}
