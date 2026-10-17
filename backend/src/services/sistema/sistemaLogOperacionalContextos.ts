/** Identificador em `payload.log_contexto` para filtrar tipos de log na tabela unificada. */
export const LOG_CONTEXTO_ROTINA_EXECUCAO = 'rotina_execucao';
export const LOG_CONTEXTO_BLOCKDOMI_ACESSO = 'blockdomi_acesso';
export const LOG_CONTEXTO_SSH_AUDIT = 'ssh_audit';
export const LOG_CONTEXTO_RPKI_SYNC = 'rpki_sync';
export const LOG_CONTEXTO_RPKI_ACTIVITY = 'rpki_activity';
export const LOG_CONTEXTO_RPKI_VALIDATION = 'rpki_validation';
export const LOG_CONTEXTO_IXC_OS_SYNC = 'ixc_os_sync';
export const LOG_CONTEXTO_MENSAGEM = 'mensagem';
export const LOG_CONTEXTO_BLOCKDOMI_OPERACAO = 'blockdomi_operacao';
export const LOG_CONTEXTO_SSH_BACKUP = 'ssh_backup';

/** Resumo legado de rotina (`log_contexto: rotina`) — ainda pode existir em registros antigos. */
export const LOG_CONTEXTO_ROTINA_RESUMO = 'rotina';

export const LOG_CONTEXTO_ESPECIALIZADOS = [
  LOG_CONTEXTO_ROTINA_EXECUCAO,
  LOG_CONTEXTO_ROTINA_RESUMO,
  LOG_CONTEXTO_BLOCKDOMI_ACESSO,
  LOG_CONTEXTO_SSH_AUDIT,
  LOG_CONTEXTO_RPKI_SYNC,
  LOG_CONTEXTO_RPKI_ACTIVITY,
  LOG_CONTEXTO_RPKI_VALIDATION,
  LOG_CONTEXTO_IXC_OS_SYNC,
  LOG_CONTEXTO_MENSAGEM,
  LOG_CONTEXTO_BLOCKDOMI_OPERACAO,
  LOG_CONTEXTO_SSH_BACKUP,
] as const;

export type LogContextoEspecializado = (typeof LOG_CONTEXTO_ESPECIALIZADOS)[number];

function sqlString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

const ALIAS_DEFAULT = 'sistema_logs_operacionais';

export function sqlFiltrarLogContexto(contexto: string, alias = ALIAS_DEFAULT): string {
  return `JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.log_contexto')) = ${sqlString(contexto)}`;
}

/** Exclui logs de domínios especializados (auditoria CRUD / operacional geral). */
export function sqlExcluirLogContextosEspecializados(alias = ALIAS_DEFAULT): string {
  const list = LOG_CONTEXTO_ESPECIALIZADOS.map((c) => sqlString(c)).join(', ');
  return `(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.log_contexto') IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.log_contexto')) NOT IN (${list}))`;
}

export function normalizeOperacionalPayload(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (Buffer.isBuffer(raw)) {
    const s = raw.toString('utf8').trim();
    if (!s) return null;
    try {
      const p = JSON.parse(s) as unknown;
      if (p != null && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      return null;
    }
    return null;
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;
    try {
      const p = JSON.parse(s) as unknown;
      if (p != null && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      return { _valor_texto: s.slice(0, 2000) };
    }
    return null;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}
