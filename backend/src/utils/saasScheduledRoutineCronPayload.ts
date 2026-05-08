type Body = Record<string, unknown>;

function tok(v: unknown): string {
  const t = String(v ?? '').trim();
  return t === '' ? '*' : t;
}

/**
 * Deriva `HH:mm` a partir de `minuto`/`hora` numéricos simples (para `calculateNextExecution` ao criar rotina).
 */
export function syntheticHoraExecucaoFromSaasBody(data: Body): string {
  const minuto = tok(data.minuto ?? '*');
  const hora = tok(data.hora ?? '*');
  if (/^\d+$/.test(minuto) && /^\d+$/.test(hora)) {
    const mm = Math.min(59, Math.max(0, parseInt(minuto, 10)));
    const hh = Math.min(23, Math.max(0, parseInt(hora, 10)));
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  return '00:00';
}

/**
 * Sincroniza colunas de agendamento (minuto, hora, dia_mes, mes, dia_semana).
 * Remove campos que não existem mais na tabela SaaS.
 */
export function applySaasCronColumnsFromBody(data: Body): void {
  delete data.cron_expression;
  delete data.descricao;
  delete data.configuracao;
  delete data.frequencia;
  delete data.id_tarefa;
  delete data.dia_execucao;
  delete data.status;
  delete data.hora_execucao;

  const hasAny =
    data.minuto !== undefined ||
    data.hora !== undefined ||
    data.dia_mes !== undefined ||
    data.mes !== undefined ||
    data.dia_semana !== undefined;

  if (hasAny) {
    const minuto = tok(data.minuto ?? '*');
    const hora = tok(data.hora ?? '*');
    const diaMes = tok(data.dia_mes ?? '*');
    const mes = tok(data.mes ?? '*');
    const diaSemana = tok(data.dia_semana ?? '*');
    data.minuto = minuto;
    data.hora = hora;
    data.dia_mes = diaMes;
    data.mes = mes;
    data.dia_semana = diaSemana;
  }
}

export function saasRoutineBodyFromRequest(body: unknown): Body {
  const data = { ...(body as Record<string, unknown>) } as Body;
  applySaasCronColumnsFromBody(data);
  return data;
}
