import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useTableFilters } from 'hooks/useTableFilters';
import { saasTituloService, saasContratoService, type SaasTitulo, type SaasContrato } from 'services/saas/saasCrudService';
import { saasTenantUsuariosService, type SaasTenantUsuario } from 'services/saas/saasTenantUsuariosService';
import { auditoriaService } from 'services/auditoriaService';
import type { SaasEmpresaTabId, StatusEmpresa } from '../types';
import { filterContratos, filterTitulosByCancelados, filterTitulosRaw, filterUsuarios } from '../utils';

interface UseSaasEmpresaTabDataParams {
  empresaId: number | null;
  activeTab: SaasEmpresaTabId;
  showInativosContratos: boolean;
  showCanceladosTitulos: boolean;
}

export function useSaasEmpresaTabData({
  empresaId,
  activeTab,
  showInativosContratos,
  showCanceladosTitulos,
}: UseSaasEmpresaTabDataParams) {
  const contratosTf = useTableFilters({ initialPage: 1, initialLimit: 500, resetPageOnFilterChange: false });
  const titulosTf = useTableFilters({ initialPage: 1, initialLimit: 500, initialSortColumn: 'id', initialSortDirection: 'desc', resetPageOnFilterChange: false });
  const usuariosTf = useTableFilters({ initialPage: 1, initialLimit: 500, initialSortColumn: 'id', initialSortDirection: 'desc', resetPageOnFilterChange: false });
  const logsTf = useTableFilters({ initialPage: 1, initialLimit: 20, initialSortColumn: 'timestamp', initialSortDirection: 'desc', resetPageOnFilterChange: false });

  const { data: titulosData, refetch: refetchTitulos } = useQuery({
    queryKey: ['saas-titulos', empresaId, titulosTf.sortColumn, titulosTf.sortDirection],
    queryFn: () => saasTituloService.list({ empresa_id: empresaId!, limit: 500, sortColumn: titulosTf.sortColumn, sortDirection: titulosTf.sortDirection }),
    enabled: !!empresaId && activeTab === 'financeiro',
  });

  const { data: contratosData, refetch: refetchContratos } = useQuery({
    queryKey: ['saas-contratos', empresaId, contratosTf.sortColumn, contratosTf.sortDirection],
    queryFn: () => saasContratoService.list({ empresa_id: empresaId!, limit: 500, sortColumn: contratosTf.sortColumn, sortDirection: contratosTf.sortDirection }),
    enabled: !!empresaId && activeTab === 'contratos',
  });

  const { data: usuariosData, refetch: refetchUsuarios } = useQuery({
    queryKey: ['saas-tenant-usuarios', empresaId, usuariosTf.sortColumn, usuariosTf.sortDirection],
    queryFn: () => saasTenantUsuariosService.list({ empresa_id: empresaId!, limit: 500, sortColumn: usuariosTf.sortColumn, sortDirection: usuariosTf.sortDirection }),
    enabled: !!empresaId && activeTab === 'usuarios',
  });

  const logsFilters = useMemo(() => ({
    page: logsTf.page,
    limit: logsTf.limit,
    search: logsTf.debouncedSearch || undefined,
    searchField: logsTf.searchField || undefined,
    sortColumn: logsTf.sortColumn,
    sortDirection: logsTf.sortDirection,
    empresa_id: empresaId ?? undefined,
  }), [logsTf.page, logsTf.limit, logsTf.debouncedSearch, logsTf.searchField, logsTf.sortColumn, logsTf.sortDirection, empresaId]);

  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ['auditoria-operacional', 'tenant', empresaId, logsFilters],
    queryFn: async () => {
      const res = await auditoriaService.listOperacionalByTenant({ ...logsFilters, empresa_id: empresaId! });
      if (!res.success) throw new Error(res.message || CONTEXT_ERROR_MESSAGES.AUDIT_LOAD_ERROR);
      return res.data;
    },
    enabled: !!empresaId && activeTab === 'logs',
  });

  const titulosRaw: SaasTitulo[] = useMemo(() => {
    const res = titulosData?.data as { data?: SaasTitulo[] } | undefined;
    return res?.data ?? [];
  }, [titulosData]);

  const titulosParaFiltro = useMemo(
    () => filterTitulosRaw(titulosRaw, titulosTf.search),
    [titulosRaw, titulosTf.search]
  );

  const titulos = useMemo(
    () => filterTitulosByCancelados(titulosParaFiltro, showCanceladosTitulos),
    [titulosParaFiltro, showCanceladosTitulos]
  );

  const contratosRes = useMemo(() => {
    const res = contratosData?.data as {
      data?: SaasContrato[];
      status_empresa?: StatusEmpresa;
    } | undefined;
    return { rows: res?.data ?? [], statusEmpresa: res?.status_empresa };
  }, [contratosData]);

  const contratosRaw = contratosRes.rows;
  const statusEmpresa = contratosRes.statusEmpresa;

  const contratos = useMemo(
    () => filterContratos(contratosRaw, contratosTf.search, showInativosContratos),
    [contratosRaw, contratosTf.search, showInativosContratos]
  );

  const usuariosRaw: SaasTenantUsuario[] = useMemo(() => {
    const res = usuariosData?.data as { data?: SaasTenantUsuario[] | { data?: SaasTenantUsuario[] } } | undefined;
    const d = res?.data;
    const arr = Array.isArray(d) ? d : (d as { data?: SaasTenantUsuario[] } | undefined)?.data;
    return arr ?? [];
  }, [usuariosData]);

  const usuarios = useMemo(
    () => filterUsuarios(usuariosRaw, usuariosTf.search, usuariosTf.searchField || 'nome'),
    [usuariosRaw, usuariosTf.search, usuariosTf.searchField]
  );

  return {
    contratosTf,
    titulosTf,
    usuariosTf,
    logsTf,
    titulosData,
    contratosData,
    usuariosData,
    logsData,
    refetchTitulos,
    refetchContratos,
    refetchUsuarios,
    refetchLogs,
    titulosRaw,
    titulosParaFiltro,
    titulos,
    contratosRaw,
    contratos,
    statusEmpresa,
    usuariosRaw,
    usuarios,
  };
}
