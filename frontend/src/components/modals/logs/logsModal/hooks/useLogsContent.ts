import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTableFilters } from 'hooks/useTableFilters';
import { auditoriaService, AuditoriaLog, AuditoriaFilters } from 'services/auditoriaService';
import { getMensagemHistoricoService } from 'services/mensagemHistoricoService';
import { useBlockdomiLogs } from 'hooks/useBlockdomiLogs';
import { LOGS_AUDITORIA_CONFIG } from '../constants';
import type { LogsModalType, MensagemItem } from '../types';

export function useLogsContent(
  logType: LogsModalType,
  show: boolean,
  apiVariant: 'erp' | 'saas',
  painelSaasLogs: boolean,
  mesclarMensagensErp: boolean
) {
  const isSaas = apiVariant === 'saas';
  const mensagemService = getMensagemHistoricoService(isSaas);

  const isEquipamentosOuAgentes = logType === 'equipamentos' || logType === 'agentes';
  const isAuditoria = [
    'usuarios',
    'agenda-tarefas',
    'assinatura-digital',
    'acesso-sistema',
    'equipamentos',
    'agentes',
  ].includes(logType);
  const isEmail = logType === 'email';
  const isWhatsapp = logType === 'whatsapp';
  const isBlockdomiApi = logType === 'blockdomi-api';

  const preset = useMemo(() => LOGS_AUDITORIA_CONFIG[logType] || {}, [logType]);
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: isEquipamentosOuAgentes || isBlockdomiApi ? 15 : 20,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
    initialSortColumn: isAuditoria ? 'timestamp' : 'created_at',
    initialSortDirection: 'desc',
  });

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAuditoria, setSelectedAuditoria] = useState<AuditoriaLog | null>(null);
  const [selectedMensagem, setSelectedMensagem] = useState<MensagemItem | null>(null);

  const auditoriaFilters: AuditoriaFilters = useMemo(
    () => ({
      page: tableFilters.page,
      limit: tableFilters.limit,
      search: tableFilters.search || undefined,
      searchField: tableFilters.searchField || undefined,
      acao: preset.acao,
      entidade: preset.entidade,
      moduloBlockdomi: preset.moduloBlockdomi,
      comUsuarioObrigatorio: preset.comUsuarioObrigatorio,
      origemAuditoria: preset.origemAuditoria,
      data_inicio: isEquipamentosOuAgentes ? filterStartDate || undefined : undefined,
      data_fim: isEquipamentosOuAgentes ? filterEndDate || undefined : undefined,
      sortColumn: tableFilters.sortColumn,
      sortDirection: tableFilters.sortDirection,
    }),
    [tableFilters, preset, isEquipamentosOuAgentes, filterStartDate, filterEndDate]
  );

  const mensagemFilters = useMemo(
    () => ({
      ...(isEmail ? { tipo: 'email' as const } : { tipo: 'whatsapp' as const }),
      page: tableFilters.page,
      limit: tableFilters.limit,
      search: tableFilters.debouncedSearch || undefined,
      searchField: tableFilters.searchField || (tableFilters.debouncedSearch ? 'destinatario' : undefined),
      sortColumn: tableFilters.sortColumn,
      sortDirection: tableFilters.sortDirection,
      ...(mesclarMensagensErp && apiVariant === 'saas' ? { incluir_erp: true as const } : {}),
    }),
    [tableFilters, isEmail, mesclarMensagensErp, apiVariant]
  );

  const auditoriaQuery = useQuery({
    queryKey: ['auditoria-operacional-logs', apiVariant, painelSaasLogs, logType, auditoriaFilters],
    queryFn: async () => {
      const filtersSaas = painelSaasLogs
        ? {
            ...auditoriaFilters,
            painelSaas: true as const,
            ...(logType === 'acesso-sistema' ? { acessoPainelSaas: true as const } : {}),
          }
        : auditoriaFilters;
      const r =
        apiVariant === 'saas'
          ? await auditoriaService.listOperacionalSaas(filtersSaas)
          : await auditoriaService.listOperacional(auditoriaFilters);
      if (!r.success) throw new Error(r.message);
      return r.data;
    },
    enabled: show && isAuditoria,
    retry: 1,
  });

  const mensagemQuery = useQuery({
    queryKey: [
      'mensagens-historico',
      isEmail ? 'email' : 'whatsapp',
      isSaas ? 'saas' : 'tenant',
      mesclarMensagensErp,
      mensagemFilters,
    ],
    queryFn: () => mensagemService.list(mensagemFilters),
    enabled: show && (isEmail || isWhatsapp),
    refetchOnWindowFocus: false,
  });

  const blockdomiFilters = useMemo(
    () => ({
      search: tableFilters.debouncedSearch || undefined,
      page: tableFilters.page,
      limit: tableFilters.limit,
      sortColumn: tableFilters.sortColumn,
      sortDirection: tableFilters.sortDirection,
      origem: 'api_txt' as const,
    }),
    [
      tableFilters.page,
      tableFilters.limit,
      tableFilters.debouncedSearch,
      tableFilters.sortColumn,
      tableFilters.sortDirection,
    ]
  );

  const blockdomiQuery = useBlockdomiLogs(blockdomiFilters, {
    enabled: show && isBlockdomiApi,
    scope: apiVariant,
  });

  const data = isAuditoria ? auditoriaQuery.data : isBlockdomiApi ? blockdomiQuery.data : mensagemQuery.data;
  const isLoading = isAuditoria
    ? auditoriaQuery.isLoading
    : isBlockdomiApi
      ? blockdomiQuery.isLoading
      : mensagemQuery.isLoading;
  const refetch = isAuditoria
    ? auditoriaQuery.refetch
    : isBlockdomiApi
      ? blockdomiQuery.refetch
      : mensagemQuery.refetch;

  return {
    tableFilters,
    filterStartDate,
    filterEndDate,
    setFilterStartDate,
    setFilterEndDate,
    showDetailsModal,
    setShowDetailsModal,
    selectedAuditoria,
    setSelectedAuditoria,
    selectedMensagem,
    setSelectedMensagem,
    data,
    isLoading,
    refetch,
    isEquipamentosOuAgentes,
    isEquipamentos: logType === 'equipamentos',
    isAuditoria,
    isEmail,
    isBlockdomiApi,
  };
}
