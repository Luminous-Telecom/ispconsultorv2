import { literal, type OrderItem } from 'sequelize';

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

function sanitizeDirection(direction?: string): 'ASC' | 'DESC' {
  return direction?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
}

/**
 * Monta `order` para listagem de rotinas: colunas do modelo, chaves sintéticas do grid de cron (MySQL).
 */
export function resolveScheduledRoutineOrder(
  sort: string | undefined,
  direction: string | undefined,
  extraModelColumns?: string[]
): OrderItem[] {
  const dir = sanitizeDirection(direction);
  const col = (sort || 'created_at').trim();

  const whitelist = new Set(BASE_MODEL_COLUMNS);
  if (extraModelColumns?.length) {
    for (const c of extraModelColumns) {
      if (c) whitelist.add(c);
    }
  }

  if (whitelist.has(col) && !SYNTHETIC_CRON_KEYS.has(col)) {
    return [[col, dir]];
  }

  if (SYNTHETIC_CRON_KEYS.has(col)) {
    const useSaasCronColumns = extraModelColumns?.includes('alvo') === true;
    if (useSaasCronColumns) {
      switch (col) {
        case 'cron_minuto':
          return [['minuto', dir]];
        case 'cron_hora':
          return [['hora', dir]];
        case 'cron_dia_mes':
          return [['dia_mes', dir]];
        case 'cron_mes':
          return [['mes', dir]];
        case 'cron_dia_semana':
          return [['dia_semana', dir]];
        default:
          break;
      }
    }
    switch (col) {
      case 'cron_minuto':
        return [[literal('MINUTE(hora_execucao)'), dir]];
      case 'cron_hora':
        return [[literal('HOUR(hora_execucao)'), dir]];
      case 'cron_dia_mes':
        return [[literal('COALESCE(dia_execucao, 0)'), dir]];
      case 'cron_mes':
        return [
          [
            literal(
              '(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(TRIM(IFNULL(cron_expression, \"\")), \" \", 4), \" \", -1) AS UNSIGNED))'
            ),
            dir,
          ],
        ];
      case 'cron_dia_semana':
        return [
          [
            literal(
              '(COALESCE(dia_semana, CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(TRIM(IFNULL(cron_expression, \"\")), \" \", 5), \" \", -1) AS SIGNED)))'
            ),
            dir,
          ],
        ];
      default:
        break;
    }
  }

  return [['created_at', dir]];
}
