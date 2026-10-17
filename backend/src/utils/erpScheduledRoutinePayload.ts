import type { CreateRoutineData } from '../types/scheduler';
import { buildCronExpression, validateCronExpression, validateRoutineData } from './SchedulerUtils';

/** Tarefas que o agendador do SaaS executava para o ERP, agora nesta instalação. */
export const TIPOS_AGENDADOR_ERP = [
  'geracao_titulos',
  'envio_boletos',
  'remessa_bancaria',
  'verificar_vencimentos',
  'desbloquear_blockdomi',
  'backup_equipamentos_ssh',
  'rpki_sync_parent_resources',
  'rpki_sync_repositories',
  'consulta_titulos_asaas',
  'consulta_titulos_efi',
  'ixc_sync_ordens_servico',
  'suspender_contratos_atraso',
  'outros',
] as const;

export type TipoAgendadorErp = (typeof TIPOS_AGENDADOR_ERP)[number];

function tok(value: unknown): string {
  const text = String(value ?? '').trim();
  return text === '' ? '*' : text;
}

export function formHasCron(body: Record<string, unknown>): boolean {
  return ['minuto', 'hora', 'dia_mes', 'mes', 'dia_semana'].some((key) => body[key] !== undefined);
}

export function cronExpressionFromForm(body: Record<string, unknown>): string {
  return [
    tok(body.minuto ?? '*'),
    tok(body.hora ?? '*'),
    tok(body.dia_mes ?? '*'),
    tok(body.mes ?? '*'),
    tok(body.dia_semana ?? '*'),
  ].join(' ');
}

/** HH:mm quando minuto e hora são números; senão meia-noite, para a coluna hora_execucao. */
export function horaExecucaoFromForm(body: Record<string, unknown>): string {
  const minuto = tok(body.minuto ?? '*');
  const hora = tok(body.hora ?? '*');
  if (/^\d+$/.test(minuto) && /^\d+$/.test(hora)) {
    const mm = Math.min(59, Math.max(0, parseInt(minuto, 10)));
    const hh = Math.min(23, Math.max(0, parseInt(hora, 10)));
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  return '00:00';
}

export function erpRoutineFromForm(
  body: Record<string, unknown>
): { ok: true; data: CreateRoutineData } | { ok: false; message: string } {
  const nome = String(body.nome ?? '').trim();
  const tipo = String(body.tipo ?? '');
  if (!nome || !tipo) {
    return { ok: false, message: 'Campos obrigatórios: nome, tipo' };
  }
  if (!(TIPOS_AGENDADOR_ERP as readonly string[]).includes(tipo)) {
    return { ok: false, message: 'Tipo de rotina não disponível neste agendador' };
  }

  const cronExpression = cronExpressionFromForm(body);
  const data: CreateRoutineData = {
    nome,
    tipo: tipo as TipoAgendadorErp,
    configuracao: {},
    frequencia: 'personalizada',
    hora_execucao: horaExecucaoFromForm(body),
    cron_expression: cronExpression,
    minuto: tok(body.minuto ?? '*'),
    hora: tok(body.hora ?? '*'),
    dia_mes: tok(body.dia_mes ?? '*'),
    mes: tok(body.mes ?? '*'),
    dia_semana: tok(body.dia_semana ?? '*'),
  };

  const validation = validateRoutineData(data);
  if (!validation.isValid) {
    return { ok: false, message: validation.errors[0] ?? 'Agendamento inválido' };
  }
  if (!validateCronExpression(cronExpression)) {
    return { ok: false, message: 'Agendamento inválido' };
  }
  return { ok: true, data };
}

function fiveCronFields(expression: string): [string, string, string, string, string] {
  const parts = expression.trim().split(/\s+/).filter(Boolean);
  const five = parts.length >= 6 ? parts.slice(1, 6) : parts;
  while (five.length < 5) five.push('*');
  return [five[0] ?? '*', five[1] ?? '*', five[2] ?? '*', five[3] ?? '*', five[4] ?? '*'];
}

/** Devolve as cinco partes do cron para a listagem e o formulário. */
export function withCronParts<T extends Record<string, unknown>>(row: T): T & {
  minuto: string;
  hora: string;
  dia_mes: string;
  mes: string;
  dia_semana: string;
} {
  const stored = typeof row.cron_expression === 'string' ? row.cron_expression : '';
  const expression = stored.trim()
    ? stored
    : buildCronExpression({
        hora_execucao: row.hora_execucao as string | Date | undefined,
        frequencia: typeof row.frequencia === 'string' ? row.frequencia : undefined,
        dia_semana: row.dia_semana as number | string | undefined,
        dia_execucao: typeof row.dia_execucao === 'number' ? row.dia_execucao : undefined,
        cron_expression: stored || undefined,
      });
  const [minuto, hora, dia_mes, mes, dia_semana] = fiveCronFields(expression);
  return { ...row, minuto, hora, dia_mes, mes, dia_semana };
}
