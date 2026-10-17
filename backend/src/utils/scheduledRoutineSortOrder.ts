/** Colunas físicas comuns aos modelos de rotina (ERP e SaaS). */
const BASE_MODEL_COLUMNS = new Set([
  'id',
  'nome',
  'tipo',
  'dia_semana',
  'ativo',
  'proxima_execucao',
  'ultima_execucao',
  'total_execucoes',
  'execucoes_com_sucesso',
  'execucoes_com_erro',
  'created_at',
  'updated_at',
]);

const SYNTHETIC_CRON_KEYS = new Set(['cron_minuto', 'cron_hora', 'cron_dia_mes', 'cron_mes', 'cron_dia_semana']);

export type RoutineOrderBy = Array<Record<string, 'asc' | 'desc'>>;

function sanitizeDirection(direction?: string): 'asc' | 'desc' {
  return direction?.toLowerCase() === 'asc' ? 'asc' : 'desc';
}

/**
 * Monta orderBy da listagem de rotinas.
 * Chaves sintéticas do cron caem na coluna persistida mais próxima.
 */
export function resolveScheduledRoutineOrder(
  sort: string | undefined,
  direction: string | undefined,
  extraModelColumns?: string[]
): RoutineOrderBy {
  const dir = sanitizeDirection(direction);
  const col = (sort || 'created_at').trim();

  const whitelist = new Set(BASE_MODEL_COLUMNS);
  if (extraModelColumns?.length) {
    for (const extra of extraModelColumns) {
      if (extra) whitelist.add(extra);
    }
  }

  if (whitelist.has(col) && !SYNTHETIC_CRON_KEYS.has(col)) {
    return [{ [col]: dir }];
  }

  if (SYNTHETIC_CRON_KEYS.has(col)) {
    const useSaasCronColumns = extraModelColumns?.includes('alvo') === true;
    if (useSaasCronColumns) {
      switch (col) {
        case 'cron_minuto':
          return [{ minuto: dir }];
        case 'cron_hora':
          return [{ hora: dir }];
        case 'cron_dia_mes':
          return [{ dia_mes: dir }];
        case 'cron_mes':
          return [{ mes: dir }];
        case 'cron_dia_semana':
          return [{ dia_semana: dir }];
        default:
          break;
      }
    }
    switch (col) {
      case 'cron_minuto':
      case 'cron_hora':
        return [{ hora_execucao: dir }];
      case 'cron_dia_mes':
        return [{ dia_execucao: dir }];
      case 'cron_mes':
        return [{ cron_expression: dir }];
      case 'cron_dia_semana':
        return [{ dia_semana: dir }];
      default:
        break;
    }
  }

  return [{ created_at: dir }];
}
