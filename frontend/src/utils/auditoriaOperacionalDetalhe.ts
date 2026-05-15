import type { AuditoriaLog } from 'services/auditoriaService';

const PAYLOAD_META_KEYS = new Set([
  'elasticsearch_audit_id',
  'elasticsearch_log_id',
  'acao_auditoria',
  'origem_auditoria',
  'request',
  'log_contexto',
  'tipo',
  'tabela',
  'origem',
  'routine_id',
  'routine_nome',
  'routine_tipo',
  'status',
  'duracao_ms',
  'empresa_id',
  'usuario_id',
  'erro',
  'resultado_resumo',
  '_truncado',
  '_tamanho_aproximado',
  '_erro_serializacao',
  'mensagem_operacional',
]);

export function parseAuditoriaPayload(
  payload: AuditoriaLog['payload']
): Record<string, unknown> | null {
  if (payload == null) return null;
  if (typeof payload === 'string') {
    const s = payload.trim();
    if (!s) return null;
    try {
      const p = JSON.parse(s) as unknown;
      if (p != null && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      return { _valor_texto: s.slice(0, 4000) };
    }
    return null;
  }
  if (typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return null;
}

/** Preenche dados_anteriores/dados_novos a partir do payload MySQL quando o ES ainda não carregou. */
export function enrichAuditoriaLogFromOperacionalPayload(log: AuditoriaLog): AuditoriaLog {
  if (log.dados_anteriores || log.dados_novos) return log;

  const payload = parseAuditoriaPayload(log.payload);
  if (!payload || Object.keys(payload).length === 0) return log;

  const antesPayload = payload.dados_anteriores;
  const depoisPayload = payload.dados_novos;
  if (
    antesPayload != null &&
    typeof antesPayload === 'object' &&
    !Array.isArray(antesPayload) &&
    depoisPayload != null &&
    typeof depoisPayload === 'object' &&
    !Array.isArray(depoisPayload)
  ) {
    return {
      ...log,
      dados_anteriores: antesPayload as Record<string, unknown>,
      dados_novos: depoisPayload as Record<string, unknown>,
    };
  }

  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!PAYLOAD_META_KEYS.has(k)) body[k] = v;
  }
  if (Object.keys(body).length === 0) return log;

  if (log.acao === 'delete') {
    return { ...log, dados_anteriores: body };
  }
  return { ...log, dados_novos: body };
}
