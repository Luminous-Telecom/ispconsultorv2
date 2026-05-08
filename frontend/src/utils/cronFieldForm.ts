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

/** Deriva os dois primeiros tokens do cron a partir do horário (demais = todos). */
export function cronPartsFromHoraExecucao(horaExecucao: string): CronPartState[] {
  const parts = defaultCronParts();
  const norm = normalizeHoraExecucaoStr(horaExecucao);
  const [h = '00', m = '00'] = norm.split(':');
  const hh = Math.min(23, Math.max(0, parseInt(h, 10) || 0));
  const mm = Math.min(59, Math.max(0, parseInt(m, 10) || 0));
  parts[0] = { mode: 'valor', valor: String(mm) };
  parts[1] = { mode: 'valor', valor: String(hh) };
  return parts;
}

/** Valor exibido no campo texto (* = qualquer). */
export function partToCronInputDisplay(p: CronPartState | undefined): string {
  if (!p || p.mode === 'todos') return '*';
  return p.valor;
}

/** Interpreta o texto digitado no campo do cron. */
export function parseCronTokenInput(raw: string): CronPartState {
  const t = raw.trim();
  if (t === '' || t === '*') return { mode: 'todos', valor: '' };
  return { mode: 'valor', valor: t };
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

export function buildCronExpressionFromParts(parts: CronPartState[]): string {
  const five = parts.slice(0, 5);
  while (five.length < 5) {
    five.push({ mode: 'todos', valor: '' });
  }
  return five
    .map((p) => {
      if (p.mode === 'todos') return '*';
      const v = p.valor.trim();
      return v || '*';
    })
    .join(' ');
}

/** Deriva `HH:mm` para o campo TIME quando minuto e hora são valores numéricos simples. */
export function horaExecucaoFromCronParts(parts: CronPartState[]): string {
  const minP = parts[0];
  const hourP = parts[1];
  const minTok = minP?.mode === 'valor' ? minP.valor.trim() : '';
  const hourTok = hourP?.mode === 'valor' ? hourP.valor.trim() : '';
  if (/^\d{1,2}$/.test(minTok) && /^\d{1,2}$/.test(hourTok)) {
    const m = Math.min(59, Math.max(0, parseInt(minTok, 10)));
    const h = Math.min(23, Math.max(0, parseInt(hourTok, 10)));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return '00:00';
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
    alvo: base.alvo,
    ...agenda,
  };
}
