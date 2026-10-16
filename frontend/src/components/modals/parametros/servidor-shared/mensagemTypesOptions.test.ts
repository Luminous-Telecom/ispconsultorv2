import { getMensagemCobrancaTypeOptions } from './mensagemTypesOptions';

describe('tipos de mensagem de cobrança', () => {
  const options = getMensagemCobrancaTypeOptions((key) => key);
  const values = options.map((option) => option.value);

  it('inclui 2 dias antes e 1 dia depois do vencimento na ordem da cobrança', () => {
    expect(values.indexOf('02_dias_antes_vencimento')).toBe(values.indexOf('05_dias_antes_vencimento') + 1);
    expect(values.indexOf('01_dias_depois_vencimento')).toBe(values.indexOf('mesmo_dia_vencimento') + 1);
    expect(options.find((option) => option.value === '02_dias_antes_vencimento')?.label).toBe('messages.types.02daysBefore');
    expect(options.find((option) => option.value === '01_dias_depois_vencimento')?.label).toBe('messages.types.01daysAfter');
  });
});
