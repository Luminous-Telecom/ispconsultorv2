import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTableFilters } from 'hooks/useTableFilters';
import { useTermosContrato, useDeleteTermoContrato } from 'hooks/useTermosContrato';
import { useContratoPlanosAdicionais, useDeleteContratoPlanoAdicional } from 'hooks/useContratoPlanosAdicionais';
import { ClienteService } from 'services/clienteService';
import { TituloService } from 'services/tituloService';
import { TermoContrato } from 'services/termoContratoService';
import { Cliente, Titulo } from 'types';

interface UseContratoModalTabDataParams {
  show: boolean;
  isEditMode: boolean;
  internalContratoId: number | null;
  clienteId?: number;
  contratoClienteId?: number;
  selectedItems: Titulo[];
  setSelectedItems: React.Dispatch<React.SetStateAction<Titulo[]>>;
  selectedAvulsosItems: Titulo[];
  setSelectedAvulsosItems: React.Dispatch<React.SetStateAction<Titulo[]>>;
  showCancelados: boolean;
  showCanceladosAvulsos: boolean;
}

export function useContratoModalTabData({
  show,
  isEditMode,
  internalContratoId,
  clienteId,
  contratoClienteId,
  selectedItems,
  setSelectedItems,
  selectedAvulsosItems,
  setSelectedAvulsosItems,
  showCancelados,
  showCanceladosAvulsos,
}: UseContratoModalTabDataParams) {
  const titulosTableFilters = useTableFilters({
    initialPage: 1,
    initialLimit: 100,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });
  const titulosAvulsosTableFilters = useTableFilters({
    initialPage: 1,
    initialLimit: 100,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });
  const termosTableFilters = useTableFilters({
    initialPage: 1,
    initialLimit: 100,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });

  const { data: termosData, isLoading: isLoadingTermosContrato, refetch: refetchTermos } = useTermosContrato(
    isEditMode ? internalContratoId || 0 : 0,
    {
      sortColumn: termosTableFilters.sortColumn,
      sortDirection: termosTableFilters.sortDirection as 'asc' | 'desc' | undefined,
    }
  );
  const deleteTermoMutation = useDeleteTermoContrato();
  const {
    data: servicosAdicionaisData,
    isLoading: isLoadingServicosAdicionais,
    refetch: refetchServicosAdicionais,
  } = useContratoPlanosAdicionais(isEditMode ? internalContratoId || 0 : 0);
  const deleteServicoAdicionalMutation = useDeleteContratoPlanoAdicional();

  const termosArray = useMemo(
    () => (Array.isArray(termosData) ? termosData : []),
    [termosData]
  );

  const clienteIdToFetch = isEditMode && contratoClienteId ? contratoClienteId : clienteId;
  const { data: clienteData } = useQuery<Cliente>({
    queryKey: ['cliente', clienteIdToFetch],
    queryFn: () => ClienteService.getById(clienteIdToFetch!),
    enabled: !!clienteIdToFetch && show,
    staleTime: 60 * 1000,
  });

  const { data: titulosData, isLoading: isLoadingTitulos, refetch: refetchTitulos } = useQuery({
    queryKey: ['titulos', 'contrato', internalContratoId, titulosTableFilters.sortColumn, titulosTableFilters.sortDirection],
    queryFn: async () => {
      const titulos = await TituloService.findByContrato(internalContratoId!, {
        sortColumn: titulosTableFilters.sortColumn,
        sortDirection: titulosTableFilters.sortDirection,
      });
      return { data: titulos };
    },
    enabled: isEditMode && !!internalContratoId,
    staleTime: 30 * 1000,
  });

  const { data: titulosAvulsosData, isLoading: isLoadingTitulosAvulsos, refetch: refetchTitulosAvulsos } = useQuery({
    queryKey: [
      'titulos',
      'contrato',
      internalContratoId,
      'avulsos',
      titulosAvulsosTableFilters.sortColumn,
      titulosAvulsosTableFilters.sortDirection,
    ],
    queryFn: async () => {
      const titulos = await TituloService.findAvulsosByContrato(internalContratoId!, {
        sortColumn: titulosAvulsosTableFilters.sortColumn,
        sortDirection: titulosAvulsosTableFilters.sortDirection,
      });
      return { data: titulos };
    },
    enabled: isEditMode && !!internalContratoId,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (titulosData?.data && selectedItems.length > 0) {
      const selectedIds = selectedItems.map((item) => item.id);
      const currentIds = titulosData.data.map((titulo: Titulo) => titulo.id);
      if (selectedIds.some((id) => !currentIds.includes(id))) setSelectedItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulosData?.data]);

  useEffect(() => {
    if (!showCancelados && selectedItems.length > 0) {
      const canceladosSelecionados = selectedItems.filter((item) => item.status?.toLowerCase() === 'cancelado');
      if (canceladosSelecionados.length > 0) {
        setSelectedItems(selectedItems.filter((item) => item.status?.toLowerCase() !== 'cancelado'));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCancelados]);

  useEffect(() => {
    if (titulosAvulsosData?.data && selectedAvulsosItems.length > 0) {
      const selectedIds = selectedAvulsosItems.map((item) => item.id);
      const currentIds = titulosAvulsosData.data.map((titulo: Titulo) => titulo.id);
      if (selectedIds.some((id) => !currentIds.includes(id))) setSelectedAvulsosItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulosAvulsosData?.data]);

  useEffect(() => {
    if (!showCanceladosAvulsos && selectedAvulsosItems.length > 0) {
      const canceladosSelecionados = selectedAvulsosItems.filter(
        (item) => item.status?.toLowerCase() === 'cancelado'
      );
      if (canceladosSelecionados.length > 0) {
        setSelectedAvulsosItems(
          selectedAvulsosItems.filter((item) => item.status?.toLowerCase() !== 'cancelado')
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCanceladosAvulsos]);

  const sortedData = useMemo(() => {
    const filteredData = isEditMode && titulosData?.data ? titulosData.data : [];
    if (!filteredData || filteredData.length === 0) return [];
    return filteredData.map((titulo: Titulo) => ({
      ...titulo,
      endereco: titulo.cliente?.endereco || '',
      numero: titulo.cliente?.numero || '',
      complemento: titulo.cliente?.complemento || '',
      bairro: titulo.cliente?.bairro || '',
      cidade: titulo.cliente?.cidade || '',
      estado: titulo.cliente?.estado || '',
    }));
  }, [isEditMode, titulosData?.data]);

  const sortedAvulsosData = useMemo(() => {
    const filteredData = isEditMode && titulosAvulsosData?.data ? titulosAvulsosData.data : [];
    return filteredData || [];
  }, [isEditMode, titulosAvulsosData?.data]);

  const sortedTermosData = useMemo(
    () =>
      isEditMode && termosArray.length > 0
        ? termosArray.filter((termo: TermoContrato) => termo.ativo)
        : [],
    [isEditMode, termosArray]
  );

  const sortedServicosAdicionaisData = servicosAdicionaisData?.data || [];

  return {
    titulosTableFilters,
    titulosAvulsosTableFilters,
    termosTableFilters,
    clienteData,
    titulosData,
    titulosAvulsosData,
    isLoadingTitulos,
    isLoadingTitulosAvulsos,
    isLoadingTermosContrato,
    isLoadingServicosAdicionais,
    refetchTitulos,
    refetchTitulosAvulsos,
    refetchTermos,
    refetchServicosAdicionais,
    deleteTermoMutation,
    deleteServicoAdicionalMutation,
    sortedData,
    sortedAvulsosData,
    sortedTermosData,
    sortedServicosAdicionaisData,
  };
}
