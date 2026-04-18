/**
 * Nomes dos data streams Backnet (alinhados ao bootstrap ILM / index templates).
 * A indexação e as buscas devem usar estes valores — não o índice monolítico legado.
 */
export const ES_DATA_STREAM = {
  APP: 'logs-backnet-app',
  AUDITORIA: 'logs-backnet-auditoria',
  ROTINAS: 'logs-backnet-rotinas',
  MENSAGENS: 'logs-backnet-mensagens',
  BLOCKDOMI: 'logs-backnet-blockdomi',
  SAAS_ACESSO: 'logs-backnet-saas-acesso'
} as const;

/** Padrão para backup/scroll de todos os streams operacionais Backnet */
export const ES_DATA_STREAMS_PATTERN = 'logs-backnet-*';

export const ES_ALL_DATA_STREAMS: readonly string[] = [
  ES_DATA_STREAM.APP,
  ES_DATA_STREAM.AUDITORIA,
  ES_DATA_STREAM.ROTINAS,
  ES_DATA_STREAM.MENSAGENS,
  ES_DATA_STREAM.BLOCKDOMI,
  ES_DATA_STREAM.SAAS_ACESSO
];

/**
 * Roteia documentos de backups NDJSON (campo log_tipo) para o data stream correto.
 */
export function resolveDataStreamFromSource(source: Record<string, unknown>): string {
  const t = source.log_tipo;
  switch (t) {
    case 'app':
      return ES_DATA_STREAM.APP;
    case 'rotina':
      return ES_DATA_STREAM.ROTINAS;
    case 'mensagem':
      return ES_DATA_STREAM.MENSAGENS;
    case 'blockdomi':
      return ES_DATA_STREAM.BLOCKDOMI;
    case 'saas_acesso':
      return ES_DATA_STREAM.SAAS_ACESSO;
    case 'auditoria':
    default:
      return ES_DATA_STREAM.AUDITORIA;
  }
}
