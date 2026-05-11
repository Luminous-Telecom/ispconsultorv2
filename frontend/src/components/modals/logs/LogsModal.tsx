/**
 * Modal único reutilizável para todos os tipos de logs.
 * Conteúdo e dados variam conforme logType.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import { SshAuditService } from 'services/sshAuditService';
import { auditoriaService, AuditoriaLog, AuditoriaFilters } from 'services/auditoriaService';
import { getMensagemHistoricoService } from 'services/mensagemHistoricoService';
import { SshAuditLog, SshAuditAction } from 'types';
import { Badge } from 'components/ui';
import DraggableModal from 'components/common/DraggableModal';
import Table from 'components/tables/Table';
import { DateRangeFilter } from 'components/ui';
import { TableConfig } from 'components/tables/types';
import MensagemDetalhesModal from 'components/modals/comunicacao/MensagemDetalhesModal';
import BlockdomiLogsRealModal from 'components/modals/blockdomi/BlockdomiLogsRealModal';
import WhoisModal from 'components/modals/blockdomi/WhoisModal';
import { useBlockdomiLogs } from 'hooks/useBlockdomiLogs';
import type { BlockdomiLogAcessoItem } from 'services/blockdomiLogAcessoService';

export type LogsModalType =
  | 'equipamentos'
  | 'agentes'
  | 'usuarios'
  | 'agenda-tarefas'
  | 'webhook'
  | 'email'
  | 'whatsapp'
  | 'assinatura-digital'
  | 'acesso-sistema'
  | 'blockdomi-api';

const LOGS_AUDITORIA_CONFIG: Record<
  string,
  {
    entidade?: string;
    acao?: string;
    comUsuarioObrigatorio?: boolean;
    origemAuditoria?: string;
    moduloBlockdomi?: boolean;
  }
> = {
  usuarios: { comUsuarioObrigatorio: true },
  'agenda-tarefas': { origemAuditoria: 'agendador' },
  webhook: { origemAuditoria: 'webhook' },
  'assinatura-digital': { entidade: 'AssinaturaDigital' },
  'acesso-sistema': { acao: 'login,logout' }
};

const SSH_EQUIP_ACTIONS: Record<string, { cls: string; label: string }> = {
  CONNECT: { cls: 'bg-success', label: 'Conectado' },
  DISCONNECT: { cls: 'bg-secondary', label: 'Desconectado' },
  COMMAND: { cls: 'bg-primary', label: 'Comando' },
  TERMINAL_COMMAND: { cls: 'bg-primary', label: 'Comando Terminal' },
  AUTH_FAIL: { cls: 'bg-danger', label: 'Falha de Auth' },
  TERMINAL_OPEN: { cls: 'bg-info text-dark', label: 'Terminal Aberto' },
  TERMINAL_CLOSE: { cls: 'bg-secondary', label: 'Terminal Fechado' },
};

const SSH_AGENT_ACTIONS: Record<string, { cls: string; label: string }> = {
  AGENT_CONNECT: { cls: 'bg-success', label: 'Conectado' },
  AGENT_DISCONNECT: { cls: 'bg-warning text-dark', label: 'Desconectado' },
};

interface MensagemItem {
  id: number;
  /** Id real no banco (lista SaaS mescla ERP + SaaS com id deslocado em ERP) */
  historico_id_real?: number;
  tipo: 'email' | 'whatsapp';
  titulo?: string;
  destinatario: string;
  mensagem: string;
  status: 'enviada' | 'erro';
  erro_mensagem?: string;
  entidade_tipo?: string;
  entidade_id?: number;
  cliente_nome?: string;
  empresa_id?: number;
  empresa_nome?: string | null;
  empresa?: {
    id?: number;
    razao_social?: string | null;
    nome_fantasia?: string | null;
    nome_empresa?: string | null;
  } | null;
  usuario?: { id: number; nome: string; email: string };
  created_at: string;
}

function formatMensagemEmpresaNome(i: MensagemItem & { empresa_nome?: string | null }): string {
  const flat = (i.empresa_nome ?? '').trim();
  if (flat) return flat;
  const e = i.empresa;
  const nome = (e?.razao_social || e?.nome_fantasia || e?.nome_empresa || '').trim();
  return nome || '—';
}

interface LogsModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  logType?: LogsModalType;
  /** Origem ERP vs SaaS — definido pelo registro de modais (não inferir pela URL). */
  variant?: 'erp' | 'saas';
}

function useLogsContent(logType: LogsModalType, show: boolean, variant: 'erp' | 'saas') {
  const isSaas = variant === 'saas';
  const mensagemService = getMensagemHistoricoService(isSaas);

  const isSsh = logType === 'equipamentos' || logType === 'agentes';
  const isAuditoria = ['usuarios', 'agenda-tarefas', 'webhook', 'assinatura-digital', 'acesso-sistema'].includes(
    logType
  );
  const isEmail = logType === 'email';
  const isWhatsapp = logType === 'whatsapp';
  const isBlockdomiApi = logType === 'blockdomi-api';

  const preset = useMemo(() => LOGS_AUDITORIA_CONFIG[logType] || {}, [logType]);
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: isSsh || isBlockdomiApi ? 15 : 20,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
    initialSortColumn: isSsh || isAuditoria ? 'timestamp' : 'created_at',
    initialSortDirection: 'desc',
  });

  const [filterAction, setFilterAction] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSsh, setSelectedSsh] = useState<SshAuditLog | null>(null);
  const [selectedAuditoria, setSelectedAuditoria] = useState<AuditoriaLog | null>(null);
  const [selectedMensagem, setSelectedMensagem] = useState<MensagemItem | null>(null);

  const sshFilters = useMemo(() => ({
    page: tableFilters.page,
    limit: tableFilters.limit,
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    action: filterAction || undefined,
    startDate: filterStartDate || undefined,
    endDate: filterEndDate || undefined,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection,
  }), [
    tableFilters.page,
    tableFilters.limit,
    tableFilters.debouncedSearch,
    tableFilters.searchField,
    tableFilters.sortColumn,
    tableFilters.sortDirection,
    filterAction,
    filterStartDate,
    filterEndDate,
  ]);

  const auditoriaFilters: AuditoriaFilters = useMemo(() => ({
    page: tableFilters.page,
    limit: tableFilters.limit,
    search: tableFilters.search || undefined,
    searchField: tableFilters.searchField || undefined,
    acao: preset.acao,
    entidade: preset.entidade,
    moduloBlockdomi: preset.moduloBlockdomi,
    comUsuarioObrigatorio: preset.comUsuarioObrigatorio,
    origemAuditoria: preset.origemAuditoria,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection,
  }), [tableFilters, preset]);

  const mensagemFilters = useMemo(() => ({
    ...(isEmail ? { tipo: 'email' as const } : { tipo: 'whatsapp' as const }),
    page: tableFilters.page,
    limit: tableFilters.limit,
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || (tableFilters.debouncedSearch ? 'destinatario' : undefined),
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection,
  }), [tableFilters, isEmail]);

  const sshQuery = useQuery({
    queryKey: ['logs-ssh', variant, logType, sshFilters],
    queryFn: () => SshAuditService.list({ logType: logType as 'equipamentos' | 'agentes', ...sshFilters }),
    enabled: show && isSsh,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const auditoriaQuery = useQuery({
    queryKey: ['auditoria-logs', variant, logType, auditoriaFilters],
    queryFn: async () => {
      const r =
        variant === 'saas'
          ? await auditoriaService.listSaasAll(auditoriaFilters)
          : await auditoriaService.list(auditoriaFilters);
      if (!r.success) throw new Error(r.message);
      return r.data;
    },
    enabled: show && isAuditoria,
    retry: 1,
  });

  const mensagemQuery = useQuery({
    queryKey: ['mensagens-historico', isEmail ? 'email' : 'whatsapp', isSaas ? 'saas' : 'tenant', mensagemFilters],
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
      origem: 'api_txt' as const
    }),
    [tableFilters.page, tableFilters.limit, tableFilters.debouncedSearch, tableFilters.sortColumn, tableFilters.sortDirection]
  );

  const blockdomiQuery = useBlockdomiLogs(blockdomiFilters, {
    enabled: show && isBlockdomiApi,
    scope: variant,
  });

  const data = isSsh ? sshQuery.data : isAuditoria ? auditoriaQuery.data : isBlockdomiApi ? blockdomiQuery.data : mensagemQuery.data;
  const isLoading = isSsh ? sshQuery.isLoading : isAuditoria ? auditoriaQuery.isLoading : isBlockdomiApi ? blockdomiQuery.isLoading : mensagemQuery.isLoading;
  const refetch = isSsh ? sshQuery.refetch : isAuditoria ? auditoriaQuery.refetch : isBlockdomiApi ? blockdomiQuery.refetch : mensagemQuery.refetch;

  return {
    tableFilters,
    filterAction,
    setFilterAction,
    filterStartDate,
    filterEndDate,
    setFilterStartDate,
    setFilterEndDate,
    showDetailsModal,
    setShowDetailsModal,
    selectedSsh,
    setSelectedSsh,
    selectedAuditoria,
    setSelectedAuditoria,
    selectedMensagem,
    setSelectedMensagem,
    data,
    isLoading,
    refetch,
    isSsh,
    isEquipamentos: logType === 'equipamentos',
    isAuditoria,
    isEmail,
    isBlockdomiApi,
    showIdColumn: logType === 'email' || logType === 'whatsapp',
  };
}

const LogsModal: React.FC<LogsModalProps> = ({ show, onClose: _onClose, logType = 'usuarios', variant = 'erp' }) => {
  const { t } = useI18n();
  const { pathname } = useLocation();
  /** SuperAdmin em /saas: modais `logs-*` do registry vêm como erp, mas devem usar APIs agregadas (`/saas/*`). */
  const effectiveVariant = variant === 'erp' && pathname.startsWith('/saas') ? 'saas' : variant;
  const showEmpresaColumn = pathname.startsWith('/saas');
  const ctx = useLogsContent(logType, show, effectiveVariant);
  const [showBlockdomiLogsReal, setShowBlockdomiLogsReal] = useState(false);
  const [whoisIp, setWhoisIp] = useState<string | null>(null);

  const {
    tableFilters,
    filterAction,
    setFilterAction,
    filterStartDate,
    filterEndDate,
    setFilterStartDate,
    setFilterEndDate,
    showDetailsModal,
    setShowDetailsModal,
    selectedSsh,
    setSelectedSsh,
    selectedAuditoria,
    setSelectedAuditoria,
    selectedMensagem,
    setSelectedMensagem,
    data,
    isLoading,
    refetch,
    isSsh,
    isEquipamentos,
    isAuditoria,
    isEmail,
    isBlockdomiApi,
    showIdColumn,
  } = ctx;

  const { selectedItem, handleSelectionChange } = useModalSelect<{ id: number | string }>();

  const formatTimestamp = useCallback((ts: string) => {
    try {
      return formatDateTime(new Date(ts));
    } catch {
      return ts;
    }
  }, []);

  const formatAcao = useCallback((acao: string) => {
    const map: Record<string, string> = {
      create: t('audit.actions.create'),
      update: t('audit.actions.update'),
      delete: t('audit.actions.delete'),
      login: t('audit.actions.login'),
      logout: t('audit.actions.logout'),
      export: t('audit.actions.export'),
      import: t('audit.actions.import'),
      executar: t('audit.actions.executar'),
    };
    return map[acao] || acao;
  }, [t]);

  const getAcaoBadgeClass = useCallback((acao: string) => {
    const map: Record<string, string> = {
      create: 'success',
      update: 'primary',
      delete: 'danger',
      login: 'info',
      logout: 'secondary',
      export: 'warning',
      import: 'warning',
      executar: 'info',
    };
    return map[acao] || 'secondary';
  }, []);

  const handleSearchChange = useCallback(
    (value: string, field?: string) => {
      setTimeout(() => {
        tableFilters.setSearch(value);
        if (field) tableFilters.setSearchField(field);
        tableFilters.setPage(1);
      }, 0);
    },
    [tableFilters]
  );

  const handleClearFilters = useCallback(() => {
    setTimeout(() => {
      tableFilters.setSearch('');
      tableFilters.setSearchField('');
      setFilterAction('');
      setFilterStartDate('');
      setFilterEndDate('');
      tableFilters.setPage(1);
    }, 0);
  }, [tableFilters, setFilterAction, setFilterStartDate, setFilterEndDate]);

  const pagination = useMemo(() => {
    const pag = (data as { pagination?: { total?: number; per_page?: number; current_page?: number; last_page?: number; from?: number; to?: number } })?.pagination;
    if (!pag || typeof pag !== 'object') {
      return { current_page: 1, last_page: 1, per_page: tableFilters.limit, total: 0, from: 0, to: 0 };
    }
    const total = pag.total ?? 0;
    const perPage = pag.per_page ?? tableFilters.limit;
    const currentPage = pag.current_page ?? 1;
    let lastPage = pag.last_page;
    if (!lastPage && total > 0) lastPage = Math.max(1, Math.ceil(total / perPage));
    else if (!lastPage) lastPage = 1;
    return {
      current_page: currentPage,
      last_page: lastPage,
      per_page: perPage,
      total,
      from: pag.from ?? (currentPage - 1) * perPage + 1,
      to: pag.to ?? Math.min(currentPage * perPage, total),
    };
  }, [data, tableFilters.limit]);

  // --- SSH columns ---
  const sshActionBadge = isEquipamentos ? SSH_EQUIP_ACTIONS : SSH_AGENT_ACTIONS;
  const sshActions = isEquipamentos
    ? (['CONNECT', 'DISCONNECT', 'COMMAND', 'TERMINAL_COMMAND', 'AUTH_FAIL', 'TERMINAL_OPEN', 'TERMINAL_CLOSE'] as SshAuditAction[])
    : (['AGENT_CONNECT', 'AGENT_DISCONNECT'] as const);

  const sshColumns: TableConfig<SshAuditLog>['columns'] = useMemo(() => {
    const empresaCol: TableConfig<SshAuditLog>['columns'] = showEmpresaColumn
      ? [{
          key: 'empresa_nome' as const,
          label: t('company.title'),
          sortable: false,
          width: '160px',
          render: (i: SshAuditLog) => {
            const nome = (i.empresa_nome ?? '').trim();
            return <span className="small text-truncate d-inline-block" style={{ maxWidth: '150px' }} title={nome || undefined}>{nome || '—'}</span>;
          },
        }]
      : [];
    const base = [
      { key: 'timestamp' as const, label: t('audit.timestamp'), sortable: true, width: '155px', render: (i: SshAuditLog) => <span className="font-monospace small">{formatTimestamp(i.timestamp)}</span> },
      { key: 'action' as const, label: t('table.action'), sortable: true, width: '130px', render: (i: SshAuditLog) => { const a = sshActionBadge[i.action] ?? { cls: 'bg-secondary', label: i.action }; return <span className={`badge ${a.cls}`}>{a.label}</span>; } },
      { key: 'deviceName' as const, label: isEquipamentos ? t('sshDevice.backupDeviceColumn') : t('logs.agentColumn'), sortable: true, width: '120px', render: (i: SshAuditLog) => i.deviceName ?? '-' },
      { key: 'clienteName' as const, label: t('table.client'), sortable: true, width: '150px', render: (i: SshAuditLog) => <span className="small">{i.clienteName?.trim() || '—'}</span> },
      ...empresaCol,
    ];
    if (isEquipamentos) {
      return [
        ...base,
        {
          key: 'userId' as const,
          label: t('audit.user'),
          sortable: true,
          width: '120px',
          sortValue: (i: SshAuditLog) => i.userName?.trim() || i.userId || '',
          render: (i: SshAuditLog) => i.userName?.trim() || i.userId || '-',
        },
        { key: 'success' as const, label: t('sshAudit.result'), sortable: true, width: '80px', render: (i: SshAuditLog) => <span className={`badge ${i.success ? 'bg-success' : 'bg-danger'}`}>{i.success ? 'OK' : 'ERRO'}</span> },
        { key: 'command' as const, label: t('sshAudit.command'), sortable: true, width: '200px', render: (i: SshAuditLog) => i.command ? <span className="font-monospace small text-truncate d-inline-block" style={{ maxWidth: '190px' }} title={i.command}>{i.command}</span> : '-' },
        { key: 'duration' as const, label: t('sshAudit.duration'), sortable: true, width: '80px', render: (i: SshAuditLog) => i.duration != null ? `${i.duration}ms` : '-' },
        { key: 'errorMessage' as const, label: t('sshAudit.error'), sortable: true, width: '200px', render: (i: SshAuditLog) => i.errorMessage ? <span className="text-danger small text-truncate d-inline-block" style={{ maxWidth: '190px' }} title={i.errorMessage}>{i.errorMessage}</span> : '-' },
        { key: 'ip' as const, label: t('audit.ip'), sortable: true, width: '110px', render: (i: SshAuditLog) => <span className="font-monospace small">{i.ip}</span> },
      ];
    }
    return [...base, { key: 'ip' as const, label: t('audit.ip'), sortable: true, width: '120px', render: (i: SshAuditLog) => <span className="font-monospace small">{i.ip}</span> }];
  }, [t, formatTimestamp, isEquipamentos, sshActionBadge, showEmpresaColumn]);

  // --- Auditoria columns ---
  const auditoriaColumns = useMemo(() => [
    ...(showIdColumn ? [{ key: 'id' as const, label: t('table.id'), sortable: true, width: '42px', render: (log: AuditoriaLog) => <span className="text-muted small">{String(log.id).substring(0, 8)}...</span> }] : []),
    { key: 'timestamp' as const, label: t('audit.timestamp'), sortable: true, width: '150px', render: (log: AuditoriaLog) => <span className="small">{formatTimestamp(log.timestamp)}</span> },
    ...(showEmpresaColumn
      ? [{
          key: 'empresa_nome' as const,
          label: t('company.title'),
          sortable: true,
          width: '168px',
          sortValue: (log: AuditoriaLog) => log.empresa_nome?.trim() ?? '',
          render: (log: AuditoriaLog) => <span className="small text-truncate d-inline-block" style={{ maxWidth: '160px' }} title={log.empresa_nome ?? undefined}>{log.empresa_nome?.trim() || '—'}</span>,
        },
        {
          key: 'cliente_nome' as const,
          label: t('table.client'),
          sortable: false,
          width: '160px',
          render: (log: AuditoriaLog) => {
            const cn = (log.cliente_nome ?? '').trim();
            return <span className="small text-truncate d-inline-block" style={{ maxWidth: '150px' }} title={cn || undefined}>{cn || '—'}</span>;
          },
        }]
      : []),
    { key: 'usuario_nome' as const, label: t('table.name'), sortable: true, width: '150px', render: (log: AuditoriaLog) => <span className="small">{log.usuario_nome || '-'}</span> },
    { key: 'usuario_email' as const, label: t('audit.user'), sortable: true, width: '180px', render: (log: AuditoriaLog) => <span className="small">{log.usuario_email || '-'}</span> },
    { key: 'ip_address' as const, label: t('audit.ip'), sortable: true, width: '120px', render: (log: AuditoriaLog) => <span className="small text-muted">{log.ip_address || '-'}</span> },
    { key: 'acao' as const, label: t('table.action'), sortable: true, render: (log: AuditoriaLog) => <span className={`badge bg-${getAcaoBadgeClass(log.acao)}`}>{formatAcao(log.acao)}</span> },
    { key: 'entidade' as const, label: t('audit.entity'), sortable: true, width: '120px', render: (log: AuditoriaLog) => <span className="small">{log.entidade}</span> },
  ], [t, formatTimestamp, formatAcao, getAcaoBadgeClass, showIdColumn, showEmpresaColumn]);

  // --- Blockdomi columns ---
  const blockdomiColumns: TableConfig<BlockdomiLogAcessoItem>['columns'] = useMemo(() => [
    { key: 'ip' as const, label: t('blockdomi.logsIp'), sortable: true, width: '140px', render: (i) => i.ip ?? '-' },
    ...(showEmpresaColumn
      ? [{
          key: 'empresa_nome' as const,
          label: t('company.title'),
          sortable: false,
          width: '160px',
          render: (i: BlockdomiLogAcessoItem) => {
            const nome = (i.empresa_nome ?? '').trim();
            return <span className="small text-truncate d-inline-block" style={{ maxWidth: '150px' }} title={nome || undefined}>{nome || '—'}</span>;
          },
        }]
      : []),
    { key: 'rota' as const, label: t('blockdomi.logsRota'), sortable: true, width: '120px', render: (i) => i.rota },
    { key: 'metodo' as const, label: t('blockdomi.logsMetodo'), sortable: true, width: '70px', render: (i) => i.metodo },
    { key: 'status_http' as const, label: t('blockdomi.logsStatus'), sortable: true, width: '80px', render: (i) => i.status_http ?? '-' },
    { key: 'sucesso' as const, label: t('blockdomi.logsSucesso'), sortable: true, width: '90px', render: (i) => <span className={`badge bg-${i.sucesso ? 'success' : 'danger'}`}>{i.sucesso ? t('blockdomi.logsSucessoOk') : t('blockdomi.logsSucessoErro')}</span> },
    {
      key: 'mensagem_erro' as const,
      label: t('blockdomi.logsMensagemErro'),
      sortable: true,
      minWidth: '280px',
      render: (i) => (
        <span
          className="text-break text-muted small d-block"
          style={{ maxWidth: 520, whiteSpace: 'pre-line' }}
          title={i.mensagem_erro ?? undefined}
        >
          {i.mensagem_erro ?? '-'}
        </span>
      )
    },
    { key: 'created_at' as const, label: t('table.createdAt'), sortable: true, width: '150px', render: (i) => (i.created_at_formatada ?? i.created_at ?? '-') },
  ], [t, showEmpresaColumn]);

  // --- Mensagem columns ---
  const mensagemColumns: TableConfig<MensagemItem>['columns'] = useMemo(() => [
    {
      key: 'id' as const,
      label: t('table.id'),
      sortable: true,
      width: '42px',
      sortValue: (i: MensagemItem) => i.historico_id_real ?? i.id,
      render: (i: MensagemItem) => <span>{i.historico_id_real ?? i.id}</span>,
    },
    ...(showEmpresaColumn
      ? [{
          key: 'empresa_id' as const,
          label: t('company.title'),
          sortable: false,
          width: '168px',
          render: (i: MensagemItem) => {
            const text = formatMensagemEmpresaNome(i);
            return <span className="small text-truncate d-inline-block" style={{ maxWidth: '160px' }} title={text === '—' ? undefined : text}>{text}</span>;
          },
        }]
      : []),
    { key: 'tipo' as const, label: t('history.type'), sortable: true, render: (_i: MensagemItem) => <Badge variant={isEmail ? 'primary' : 'success'}>{isEmail ? t('history.email') : t('history.whatsapp')}</Badge> },
    ...(isEmail ? [{ key: 'titulo' as const, label: t('history.subject'), sortable: true, width: '200px', render: (i: MensagemItem) => <div className="text-truncate" style={{ maxWidth: '250px' }} title={i.titulo}>{i.titulo || <span className="text-muted">-</span>}</div> }] : []),
    { key: 'cliente_nome' as const, label: t('history.client'), sortable: true, width: '150px', render: (i: MensagemItem) => <span className="text-nowrap">{i.cliente_nome || '-'}</span> },
    { key: 'destinatario' as const, label: isEmail ? t('history.recipient') : t('history.phone'), sortable: true, width: '130px', render: (i: MensagemItem) => <span className="text-nowrap">{i.destinatario}</span> },
    { key: 'mensagem' as const, label: t('history.message'), sortable: true, width: '200px', render: (i: MensagemItem) => <div className="text-truncate" style={{ maxWidth: '300px' }} title={i.mensagem}>{i.mensagem.length > 50 ? `${i.mensagem.substring(0, 50)}...` : i.mensagem}</div> },
    { key: 'status' as const, label: t('history.status'), sortable: true, render: (i: MensagemItem) => <Badge variant={i.status === 'enviada' ? 'success' : 'danger'}>{i.status === 'enviada' ? t('history.sent') : t('history.errorStatus')}</Badge> },
    { key: 'erro_mensagem' as const, label: t('history.error'), sortable: true, width: '150px', render: (i: MensagemItem) => i.erro_mensagem ? <small className="text-danger text-truncate d-inline-block" style={{ maxWidth: '200px' }} title={i.erro_mensagem}>{i.erro_mensagem}</small> : <span className="text-muted">-</span> },
    {
      key: 'usuario' as const,
      label: t('history.user'),
      sortable: true,
      width: '120px',
      sortValue: (i: MensagemItem) => i.usuario?.nome ?? '',
      render: (i: MensagemItem) => i.usuario ? <span title={i.usuario.email}>{i.usuario.nome}</span> : <span className="text-muted">{t('history.system')}</span>,
    },
    { key: 'created_at' as const, label: t('history.dateTime'), sortable: true, width: '145px', render: (i: MensagemItem) => formatDateTime(i.created_at) },
  ], [t, isEmail, showEmpresaColumn]);

  const modalData = useMemo((): { id: number | string }[] => {
    const d = (data as { data?: unknown[] })?.data ?? [];
    if (isSsh) {
      return (d as (SshAuditLog & { id?: string })[]).map((item, idx) => ({ ...item, id: item.id ?? `audit-${idx}` }));
    }
    if (isBlockdomiApi) {
      return (d as BlockdomiLogAcessoItem[]) as { id: number | string }[];
    }
    return d as { id: number | string }[];
  }, [data, isSsh, isBlockdomiApi]);

  const handleViewDetails = useCallback((item: unknown) => {
    if (isSsh) { setSelectedSsh(item as SshAuditLog); setShowDetailsModal(true); }
    else if (isAuditoria) { setSelectedAuditoria(item as AuditoriaLog); setShowDetailsModal(true); }
    else { setSelectedMensagem(item as MensagemItem); setShowDetailsModal(true); }
  }, [isSsh, isAuditoria, setSelectedSsh, setSelectedAuditoria, setSelectedMensagem, setShowDetailsModal]);

  const bulkActions = useMemo(() => {
    if (isBlockdomiApi) {
      return [
        { label: t('blockdomi.logsReal'), variant: 'primary' as const, disabled: () => false, requiresSelection: false, action: () => setShowBlockdomiLogsReal(true) },
        { label: t('blockdomi.whois'), variant: 'primary' as const, disabled: (items: unknown[]) => items.length !== 1 || !(items[0] as BlockdomiLogAcessoItem)?.ip?.trim(), requiresSelection: true, action: (items: unknown[]) => { const ip = (items[0] as BlockdomiLogAcessoItem)?.ip?.trim(); if (ip) setWhoisIp(ip); } },
      ];
    }
    return [{
      label: isAuditoria || isSsh ? t('audit.viewDetails') : t('history.view'),
      variant: 'primary' as const,
      disabled: (items: unknown[]) => items.length === 0 && !selectedItem,
      requiresSelection: true,
      action: (items: unknown[]) => { const it = items.length > 0 ? items[0] : selectedItem; if (it) handleViewDetails(it); },
    }];
  }, [t, selectedItem, handleViewDetails, isAuditoria, isSsh, isBlockdomiApi]);

  const sshFilterControls = isSsh && (
    <div className="d-flex flex-nowrap align-items-center justify-content-center small filter-compact" style={{ gap: 2 }}>
      <div className="d-flex align-items-center" style={{ gap: 2 }}>
        <span className="text-muted" style={{ fontSize: '0.65rem' }}>{t('table.action')}:</span>
        <select className="form-select form-select-sm" value={filterAction} onChange={(e) => { setFilterAction(e.target.value); tableFilters.setPage(1); }} style={{ width: 'auto', fontSize: '0.65rem', height: '1.25rem' }}>
          <option value="">{t('audit.actions.all')}</option>
          {sshActions.map((a) => (
            <option key={a} value={a}>{(sshActionBadge as Record<string, { label: string }>)[a]?.label ?? a}</option>
          ))}
        </select>
      </div>
      <DateRangeFilter startDate={filterStartDate} endDate={filterEndDate} onStartDateChange={(v) => { setFilterStartDate(v); tableFilters.setPage(1); }} onEndDateChange={(v) => { setFilterEndDate(v); tableFilters.setPage(1); }} />
      <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '0.65rem', height: '1.25rem' }} onClick={handleClearFilters}>{t('buttons.clear')}</button>
    </div>
  );

  const title = isSsh
    ? (isEquipamentos ? t('logs.equipamentos') : t('logs.agentes'))
    : isAuditoria
      ? t('audit.title')
      : isBlockdomiApi
        ? t('blockdomi.logsApi')
        : isEmail
          ? t('history.emailTitle')
          : t('history.whatsappTitle');
  const emptyMessage = isSsh
    ? (isEquipamentos ? t('sshAudit.emptyMessage') : t('logs.agentesEmpty'))
    : isBlockdomiApi
      ? t('blockdomi.logsEmpty')
      : isAuditoria
        ? 'Nenhum log encontrado'
        : t('history.noMessages');

  const columns = isSsh ? sshColumns : isAuditoria ? auditoriaColumns : isBlockdomiApi ? blockdomiColumns : mensagemColumns;
  const searchFields = isSsh
    ? (isEquipamentos ? [{ key: 'command', label: t('sshAudit.command') }, { key: 'deviceName', label: t('sshDevice.backupDeviceColumn') }, { key: 'userId', label: t('audit.user') }, { key: 'errorMessage', label: t('sshAudit.error') }] : [{ key: 'deviceName', label: t('logs.agentColumn') }, { key: 'ip', label: t('audit.ip') }])
    : isAuditoria
      ? [
          ...(showIdColumn ? [{ key: 'id' as const, label: t('table.id') }] : []),
          { key: 'timestamp', label: t('audit.timestamp') },
          { key: 'usuario_nome', label: t('table.name') },
          { key: 'usuario_email', label: t('audit.user') },
          { key: 'ip_address', label: t('audit.ip') },
          { key: 'acao', label: t('table.action') },
          { key: 'entidade', label: t('audit.entity') },
        ]
      : isBlockdomiApi
        ? [{ key: 'ip', label: t('blockdomi.logsIp') }, { key: 'rota', label: t('blockdomi.logsRota') }, { key: 'mensagem_erro', label: t('blockdomi.logsMensagemErro') }]
        : [
            { key: 'id', label: t('table.id') },
            { key: 'cliente_nome', label: t('history.client') },
            { key: 'destinatario', label: isEmail ? t('history.recipient') : t('history.phone') },
            { key: 'mensagem', label: t('history.message') },
            { key: 'status', label: t('history.status') },
          ];

  const defaultSearchField = isSsh ? (isEquipamentos ? 'command' : 'deviceName') : isBlockdomiApi ? 'ip' : isAuditoria ? 'timestamp' : 'destinatario';
  const searchPlaceholder = isSsh ? t('layout.searchPlaceholder') : (isBlockdomiApi ? t('layout.searchPlaceholder') : (isEmail ? t('history.searchEmail') : t('history.searchPhone')));

  const tableContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table
          title={title}
          config={{
            columns: columns as TableConfig<unknown>['columns'],
            data: modalData,
            loading: isLoading,
            searchable: true,
            searchPlaceholder,
            searchField: tableFilters.searchField || defaultSearchField,
            searchFields,
            sortable: true,
            sortColumn: tableFilters.sortColumn,
            sortDirection: tableFilters.sortDirection,
            striped: true,
            hover: true,
            responsive: true,
            selectable: true,
            multiSelect: false,
            customControls: isSsh ? sshFilterControls : undefined,
            bulkActions: bulkActions.map((a) => ({
              key: a.label.toLowerCase().replace(/\s+/g, '-'),
              label: a.label,
              onClick: a.action,
              disabled: a.disabled,
              variant: a.variant,
              requiresSelection: a.requiresSelection,
            })),
            emptyMessage,
            pagination,
          }}
          tableId={`logs-table-${effectiveVariant}-${logType}`}
          syncWithHeader={false}
          onSelectionChange={(items) => handleSelectionChange(items as { id: number | string }[])}
          onRefresh={() => refetch()}
          onPageChange={(p) => setTimeout(() => tableFilters.setPage(p), 0)}
          onPageSizeChange={(l) => setTimeout(() => tableFilters.setLimit(l), 0)}
          onSort={(col, dir) => setTimeout(() => tableFilters.setSort(col, dir), 0)}
          onSearch={handleSearchChange}
          onSearchFieldChange={(f) => setTimeout(() => tableFilters.setSearchField(f), 0)}
          search={tableFilters.search}
        />
      </div>
    </div>
  );

  const detailsModal = (() => {
    if (selectedSsh) {
      const a = sshActionBadge[selectedSsh.action] ?? { label: selectedSsh.action };
      return (
        <DraggableModal show={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedSsh(null); }} title={t('audit.detailsTitle')} size={isEquipamentos ? 'lg' : 'md'} modalId={`logs-details-${logType}`}>
          <div className="p-3">
            <div className="row g-2">
              <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('audit.timestamp')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={formatTimestamp(selectedSsh.timestamp)} readOnly /></div>
              <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('table.action')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={a.label} readOnly /></div>
              <div className="col-md-6"><label className="form-label small text-muted mb-1">{isEquipamentos ? t('sshDevice.backupDeviceColumn') : t('logs.agentColumn')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={selectedSsh.deviceName || '-'} readOnly /></div>
              <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('table.client')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={selectedSsh.clienteName?.trim() || '-'} readOnly /></div>
              {showEmpresaColumn && (
                <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('company.title')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={(selectedSsh.empresa_nome ?? '').trim() || '—'} readOnly /></div>
              )}
              <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('audit.ip')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={selectedSsh.ip || '-'} readOnly /></div>
              {isEquipamentos && (
                <>
                  <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('audit.user')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={selectedSsh.userName?.trim() || selectedSsh.userId || 'N/A'} readOnly /></div>
                  <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('sshAudit.result')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={selectedSsh.success ? 'OK' : 'ERRO'} readOnly /></div>
                  <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('sshAudit.duration')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={selectedSsh.duration != null ? `${selectedSsh.duration}ms` : '-'} readOnly /></div>
                  {selectedSsh.command && <div className="col-12"><label className="form-label small text-muted mb-1">{t('sshAudit.command')}</label><textarea className="form-control form-control-sm bg-secondary bg-opacity-10 font-monospace small" value={selectedSsh.command} readOnly rows={3} /></div>}
                  {selectedSsh.errorMessage && <div className="col-12"><label className="form-label small text-muted mb-1">{t('sshAudit.error')}</label><textarea className="form-control form-control-sm bg-secondary bg-opacity-10 text-danger small" value={selectedSsh.errorMessage} readOnly rows={2} /></div>}
                  {selectedSsh.output && <div className="col-12"><label className="form-label small text-muted mb-1">{t('audit.data')}</label><textarea className="form-control font-monospace small bg-secondary bg-opacity-10" value={selectedSsh.output} readOnly rows={12} style={{ resize: 'none' }} /></div>}
                </>
              )}
            </div>
          </div>
        </DraggableModal>
      );
    }
    if (selectedAuditoria) {
      return (
        <DraggableModal show={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedAuditoria(null); }} title={t('audit.detailsTitle')} size="lg" modalId="logs-auditoria-details">
          <div className="p-3 logs-auditoria-details">
            <div className="row g-2">
              <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('table.action')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={formatAcao(selectedAuditoria.acao)} readOnly /></div>
              <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('audit.entity')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={selectedAuditoria.entidade} readOnly /></div>
              <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('audit.timestamp')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={formatTimestamp(selectedAuditoria.timestamp)} readOnly /></div>
              {showEmpresaColumn && (
                <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('company.title')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={selectedAuditoria.empresa_nome?.trim() || '—'} readOnly /></div>
              )}
              {showEmpresaColumn && (
                <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('table.client')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={(selectedAuditoria.cliente_nome ?? '').trim() || '—'} readOnly /></div>
              )}
              <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('audit.user')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={selectedAuditoria.usuario_email || 'N/A'} readOnly /></div>
              <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('table.name')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={selectedAuditoria.usuario_nome || '-'} readOnly /></div>
              <div className="col-md-6"><label className="form-label small text-muted mb-1">{t('audit.ip')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10" value={selectedAuditoria.ip_address || 'N/A'} readOnly /></div>
              {selectedAuditoria.rota && <div className="col-12"><label className="form-label small text-muted mb-1">{t('audit.route')}</label><input type="text" className="form-control form-control-sm bg-secondary bg-opacity-10 font-monospace" value={`${selectedAuditoria.metodo_http || 'N/A'} ${selectedAuditoria.rota}`} readOnly /></div>}
              {selectedAuditoria.user_agent && <div className="col-12"><label className="form-label small text-muted mb-1">{t('audit.userAgent')}</label><textarea className="form-control form-control-sm bg-secondary bg-opacity-10 small" value={selectedAuditoria.user_agent} readOnly rows={2} /></div>}
              {selectedAuditoria.observacoes && (
                <div className="col-12">
                  <label className="form-label small text-muted mb-1">{t('table.observations')}</label>
                  <textarea
                    className="form-control form-control-sm bg-secondary bg-opacity-10 small"
                    value={selectedAuditoria.observacoes}
                    readOnly
                    rows={Math.min(18, Math.max(4, selectedAuditoria.observacoes.split('\n').length + 1))}
                    style={{ resize: 'vertical', minHeight: '5rem' }}
                  />
                </div>
              )}
            </div>
            {(selectedAuditoria.dados_anteriores || selectedAuditoria.dados_novos) && (
              <div className="mt-3">
                <h6 className="mb-2">{t('audit.data')}</h6>
                <textarea className="form-control font-monospace small bg-secondary bg-opacity-10" value={JSON.stringify(selectedAuditoria.dados_anteriores && selectedAuditoria.dados_novos ? { anterior: selectedAuditoria.dados_anteriores, novo: selectedAuditoria.dados_novos } : selectedAuditoria.dados_novos || selectedAuditoria.dados_anteriores, null, 2)} readOnly rows={12} style={{ resize: 'none' }} />
              </div>
            )}
          </div>
        </DraggableModal>
      );
    }
    if (selectedMensagem) {
      return <MensagemDetalhesModal show={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedMensagem(null); }} mensagem={selectedMensagem} />;
    }
    return null;
  })();

  const blockdomiSubModals = isBlockdomiApi && (
    <>
      <BlockdomiLogsRealModal show={showBlockdomiLogsReal} onClose={() => setShowBlockdomiLogsReal(false)} />
      <WhoisModal show={!!whoisIp} onClose={() => setWhoisIp(null)} ip={whoisIp ?? ''} />
    </>
  );

  return (
    <>
      {tableContent}
      {detailsModal}
      {blockdomiSubModals}
    </>
  );
};

export default LogsModal;
