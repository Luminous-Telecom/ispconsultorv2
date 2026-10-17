import type { CreateRotinaData } from '../services/createSchedulerService';
import type { RotinaAgendada } from '../types/entities';
import { buildCronExpressionPreview } from './schedulerCronDisplay';

export type CronPartMode = 'todos' | 'valor';

export interface CronPartState {
  mode: CronPartMode;
  valor: string;
}

const CRON_LABELS_DEFAULT: CronPartState[] = [
  { mode: 'todos', valor: '' },
  { mode: 'todos', valor: '' },
  { mode: 'todos', valor: '' },
  { mode: 'todos', valor: '' },
  { mode: 'todos', valor: '' },
];

export function defaultCronParts(): CronPartState[] {
  return CRON_LABELS_DEFAULT.map((p) => ({ ...p }));
}

/** Normaliza para HH:mm (remove segundos se vierem do backend). */
export function normalizeHoraExecucaoStr(h: string | undefined): string {
  if (!h) return '00:00';
  const p = String(h).split(':');
  const hh = (p[0] ?? '00').padStart(2, '0').slice(-2);
  const mm = (p[1] ?? '00').padStart(2, '0').slice(-2);
  return `${hh}:${mm}`;
}

function padCronTokens(parts: string[]): string[] {
  const t = parts.filter((x) => x !== undefined && x !== '');
  if (t.length >= 6) {
    return t.slice(1, 6);
  }
  if (t.length === 5) return t;
  const out = [...t];
  while (out.length < 5) out.push('*');
  return out.slice(0, 5);
}

export function cronTokensToParts(tokens: string[]): CronPartState[] {
  const padded = padCronTokens(tokens);
  return padded.map((raw) => {
    const t = (raw ?? '*').trim();
    if (t === '' || t === '*' || t === '?') {
      return { mode: 'todos' as const, valor: '' };
    }
    return { mode: 'valor' as const, valor: t };
  });
}

export function cronPartsFromRotina(
  rotina: Pick<RotinaAgendada, 'dia_semana' | 'minuto' | 'hora' | 'dia_mes' | 'mes'> & {
    hora_execucao?: string;
    frequencia?: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
    dia_execucao?: number;
  }
): CronPartState[] {
  if (
    typeof rotina.minuto === 'string' &&
    typeof rotina.hora === 'string' &&
    typeof rotina.dia_mes === 'string' &&
    typeof rotina.mes === 'string' &&
    (typeof rotina.dia_semana === 'string' || typeof rotina.dia_semana === 'number')
  ) {
    const tokens = [
      rotina.minuto,
      rotina.hora,
      rotina.dia_mes,
      rotina.mes,
      typeof rotina.dia_semana === 'number' ? String(rotina.dia_semana) : (rotina.dia_semana ?? '*'),
    ];
    return cronTokensToParts(tokens);
  }
  const expr = buildCronExpressionPreview(rotina);
  const tokens = expr.trim().split(/\s+/).filter(Boolean);
  return cronTokensToParts(tokens);
}

/** Tokens persistidos nas colunas `minuto`, `hora`, `dia_mes`, `mes`, `dia_semana` (SaaS). */
export function cronPartsToAgendaCronColumns(parts: CronPartState[]): {
  minuto: string;
  hora: string;
  dia_mes: string;
  mes: string;
  dia_semana: string;
} {
  const t = (p: CronPartState | undefined) =>
    !p || p.mode === 'todos' ? '*' : p.valor.trim() || '*';
  return {
    minuto: t(parts[0]),
    hora: t(parts[1]),
    dia_mes: t(parts[2]),
    mes: t(parts[3]),
    dia_semana: t(parts[4]),
  };
}

export function validateCronPartsForSubmit(parts: CronPartState[]): string | null {
  for (let i = 0; i < 5; i++) {
    const p = parts[i];
    if (p?.mode === 'valor' && !p.valor.trim()) {
      return 'Preencha o valor de cada campo agendado em modo Valor.';
    }
  }
  return null;
}

export function buildCreatePayloadWithCron(
  base: CreateRotinaData,
  parts: CronPartState[]
): CreateRotinaData {
  const agenda = cronPartsToAgendaCronColumns(parts);
  return {
    nome: base.nome,
    tipo: base.tipo,
    ...agenda,
  };
}
