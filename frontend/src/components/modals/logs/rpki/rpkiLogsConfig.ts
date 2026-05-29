export type RpkiLogsKind = 'validation' | 'ca-pai' | 'repositorios' | 'roas' | 'aspas';

export interface RpkiLogsKindConfig {
  apiPath: string;
  queryKey: string;
  tableId: string;
  tableTitle: string;
  searchPlaceholder: string;
  emptyMessage: string;
  detailsModalId: string;
  detailsTitle: string;
  remoteHostColumnLabel: string;
  remoteHostSearchLabel: string;
  showTypeColumn: boolean;
  messageMaxWidth: number;
}

export const RPKI_LOGS_BY_KIND: Record<RpkiLogsKind, RpkiLogsKindConfig> = {
  validation: {
    apiPath: '/rpki/validation-logs',
    queryKey: 'rpki-sync-logs',
    tableId: 'rpki-validation-logs',
    tableTitle: 'Logs de Sincronização RPKI',
    searchPlaceholder: 'Buscar por servidor ou mensagem...',
    emptyMessage: 'Nenhuma sincronização registrada',
    detailsModalId: 'rpki-validation-log-details',
    detailsTitle: 'Detalhes do Log',
    remoteHostColumnLabel: 'Servidor remoto',
    remoteHostSearchLabel: 'Servidor',
    showTypeColumn: true,
    messageMaxWidth: 380,
  },
  'ca-pai': {
    apiPath: '/rpki/logs/ca-pai',
    queryKey: 'rpki-logs-ca-pai',
    tableId: 'rpki-ca-pai-logs',
    tableTitle: 'Logs de CA-pai (RFC 6492)',
    searchPlaceholder: 'Buscar por servidor ou mensagem...',
    emptyMessage: 'Nenhuma comunicação com CA-pai registrada',
    detailsModalId: 'rpki-ca-pai-log-details',
    detailsTitle: 'Detalhes do Log',
    remoteHostColumnLabel: 'Servidor remoto',
    remoteHostSearchLabel: 'Servidor',
    showTypeColumn: true,
    messageMaxWidth: 380,
  },
  repositorios: {
    apiPath: '/rpki/logs/repositorios',
    queryKey: 'rpki-logs-repositorios',
    tableId: 'rpki-repositorio-logs',
    tableTitle: 'Logs de repositórios (RFC 8181)',
    searchPlaceholder: 'Buscar por repositório ou mensagem...',
    emptyMessage: 'Nenhuma publicação no repositório registrada',
    detailsModalId: 'rpki-repositorio-log-details',
    detailsTitle: 'Detalhes do Log',
    remoteHostColumnLabel: 'Repositório',
    remoteHostSearchLabel: 'Repositório',
    showTypeColumn: true,
    messageMaxWidth: 380,
  },
  roas: {
    apiPath: '/rpki/logs/roas',
    queryKey: 'rpki-logs-roas',
    tableId: 'rpki-roa-logs',
    tableTitle: 'Logs de Publicação de ROAs (RFC 8181)',
    searchPlaceholder: 'Buscar por repositório ou mensagem...',
    emptyMessage: 'Nenhuma publicação de ROA registrada',
    detailsModalId: 'rpki-roa-log-details',
    detailsTitle: 'Detalhes do Log de ROA',
    remoteHostColumnLabel: 'Repositório',
    remoteHostSearchLabel: 'Repositório',
    showTypeColumn: false,
    messageMaxWidth: 400,
  },
  aspas: {
    apiPath: '/rpki/logs/aspas',
    queryKey: 'rpki-logs-aspas',
    tableId: 'rpki-aspa-logs',
    tableTitle: 'Logs de Publicação de ASPAs',
    searchPlaceholder: 'Buscar por repositório ou mensagem...',
    emptyMessage: 'Nenhuma publicação de ASPA registrada',
    detailsModalId: 'rpki-aspa-log-details',
    detailsTitle: 'Detalhes do Log de ASPA',
    remoteHostColumnLabel: 'Repositório',
    remoteHostSearchLabel: 'Repositório',
    showTypeColumn: false,
    messageMaxWidth: 400,
  },
};

export const TYPE_LABEL: Record<string, string> = {
  provisioning: 'Provisionamento',
  publication: 'Publicação',
};

export const TYPE_TIP: Record<string, string> = {
  provisioning: 'RFC 6492 — solicitação de certificado de recurso ao parent (ex.: Registro.br)',
  publication: 'RFC 8181 — publicação de objetos RPKI no servidor de repositório',
};
