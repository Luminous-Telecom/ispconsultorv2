const DOW_SHORT_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function normalizeHoraParts(hora: string | undefined): [string, string] {
  if (!hora) return ['00', '00'];
  const p = String(hora).split(':');
  const hh = (p[0] ?? '00').padStart(2, '0');
  const mm = (p[1] ?? '00').padStart(2, '0');
  return [hh, mm];
}

function effectiveHoraExecucaoStr(rotina: {
  hora_execucao?: string;
  minuto?: string;
  hora?: string;
}): string | undefined {
  const he = rotina.hora_execucao?.trim();
  if (he) return he;
  const m = rotina.minuto?.trim();
  const h = rotina.hora?.trim();
  if (m && h && /^\d+$/.test(m) && /^\d+$/.test(h)) {
    const mm = Math.min(59, Math.max(0, parseInt(m, 10)));
    const hh = Math.min(23, Math.max(0, parseInt(h, 10)));
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  return undefined;
}

/** Espelha `buildCronExpression` do backend para exibir partes no grid. */
export function buildCronExpressionPreview(rotina: {
  hora_execucao?: string;
  dia_semana?: string | number;
  minuto?: string;
  hora?: string;
  dia_mes?: string;
  mes?: string;
  frequencia?: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  dia_execucao?: number;
}): string {
  if (
    typeof rotina.minuto === 'string' &&
    typeof rotina.hora === 'string' &&
    typeof rotina.dia_mes === 'string' &&
    typeof rotina.mes === 'string' &&
    (typeof rotina.dia_semana === 'string' || typeof rotina.dia_semana === 'number')
  ) {
    const tok = (s: string) => {
      const t = s.trim();
      return t === '' ? '*' : t;
    };
    const dow =
      typeof rotina.dia_semana === 'number'
        ? String(rotina.dia_semana)
        : tok(rotina.dia_semana ?? '*');
    return [tok(rotina.minuto), tok(rotina.hora), tok(rotina.dia_mes), tok(rotina.mes), dow].join(' ');
  }

  const [hours, minutes] = normalizeHoraParts(effectiveHoraExecucaoStr(rotina));
  const freq = rotina.frequencia ?? 'diaria';

  switch (freq) {
    case 'diaria':
      return `${minutes} ${hours} * * *`;
    case 'semanal': {
      const raw = rotina.dia_semana;
      let dayOfWeek: number | string = 0;
      if (typeof raw === 'number') dayOfWeek = raw;
      else if (typeof raw === 'string' && /^[0-9]+$/.test(raw)) dayOfWeek = parseInt(raw, 10);
      return `${minutes} ${hours} * * ${dayOfWeek}`;
    }
    case 'mensal': {
      const dayOfMonth = rotina.dia_execucao ?? 1;
      return `${minutes} ${hours} ${dayOfMonth} * *`;
    }
    case 'anual': {
      const day = rotina.dia_execucao ?? 1;
      return `${minutes} ${hours} ${day} 1 *`;
    }
    case 'personalizada':
      return `${minutes} ${hours} * * *`;
    default:
      return `${minutes} ${hours} * * *`;
  }
}

function formatCronToken(token: string, field: 'min' | 'hour' | 'dom' | 'month' | 'dow'): string {
  const t = token.trim();
  if (t === '*' || t === '?') return 'sempre';
  if (t.startsWith('*/')) {
    const n = t.slice(2);
    return n ? `intervalo de ${n}` : t;
  }
  if (t.includes('-') && !t.includes(',')) {
    const [a, b] = t.split('-');
    if (a !== undefined && b !== undefined) return `${a} ate ${b}`;
  }
  if (t.includes(',')) {
    return t
      .split(',')
      .map((x) => x.trim())
      .join(' e ');
  }
  if (field === 'dow' && /^\d+$/.test(t)) {
    const d = parseInt(t, 10);
    if (d >= 0 && d <= 6) return DOW_SHORT_PT[d] ?? t;
  }
  return t;
}

/** Normaliza expressão a 5 campos (min hor dom month dow). */
function toFiveFieldCron(expression: string): string[] {
  const parts = expression.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 6) {
    return parts.slice(1, 6);
  }
  if (parts.length === 5) return parts;
  return ['—', '—', '—', '—', '—'];
}

export function formatCronExpressionParts(expression: string): {
  minuto: string;
  hora: string;
  diaMes: string;
  mes: string;
  diaSemana: string;
} {
  const parts = toFiveFieldCron(expression);
  const [min, hour, dom, month, dow] = parts;
  return {
    minuto: formatCronToken(min ?? '—', 'min'),
    hora: formatCronToken(hour ?? '—', 'hour'),
    diaMes: formatCronToken(dom ?? '—', 'dom'),
    mes: formatCronToken(month ?? '—', 'month'),
    diaSemana: formatCronToken(dow ?? '—', 'dow'),
  };
}

export function getCronDisplayFromRotina(rotina: {
  hora_execucao?: string;
  dia_semana?: string | number;
  minuto?: string;
  hora?: string;
  dia_mes?: string;
  mes?: string;
  frequencia?: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  dia_execucao?: number;
}): {
  minuto: string;
  hora: string;
  diaMes: string;
  mes: string;
  diaSemana: string;
} {
  const expr = buildCronExpressionPreview(rotina);
  return formatCronExpressionParts(expr);
}
