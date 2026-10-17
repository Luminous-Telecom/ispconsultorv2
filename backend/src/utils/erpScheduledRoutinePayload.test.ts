import { erpRoutineFromForm, withCronParts } from './erpScheduledRoutinePayload';

describe('agendador do ERP', () => {
  it('aceita consulta de títulos com cron a cada 30 minutos', () => {
    const result = erpRoutineFromForm({
      nome: 'Consulta títulos Asaas',
      tipo: 'consulta_titulos_asaas',
      minuto: '*/30',
      hora: '*',
      dia_mes: '*',
      mes: '*',
      dia_semana: '*',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.cron_expression).toBe('*/30 * * * *');
    expect(result.data.frequencia).toBe('personalizada');
    expect(result.data).not.toHaveProperty('alvo');
  });

  it('recusa tipo da cobrança do produto SaaS e cron inválido', () => {
    const tipo = erpRoutineFromForm({
      nome: 'Bloquear',
      tipo: 'bloquear_saas_atraso',
      minuto: '0',
      hora: '8',
      dia_mes: '*',
      mes: '*',
      dia_semana: '*',
    });
    expect(tipo.ok).toBe(false);
    if (!tipo.ok) expect(tipo.message).toContain('não disponível');

    const cron = erpRoutineFromForm({
      nome: 'Títulos',
      tipo: 'geracao_titulos',
      minuto: '99',
      hora: '*',
      dia_mes: '*',
      mes: '*',
      dia_semana: '*',
    });
    expect(cron.ok).toBe(false);
  });

  it('reidrata as cinco partes a partir da expressão salva', () => {
    const row = withCronParts({
      id: 1,
      nome: 'OS IXC',
      cron_expression: '15 6 * * 1',
    });
    expect(row).toMatchObject({
      minuto: '15',
      hora: '6',
      dia_mes: '*',
      mes: '*',
      dia_semana: '1',
    });
  });
});
