import {
  buildCronExpression,
  formatDuration,
  formatExecutionResult,
  validateCronExpression,
  validateRoutineData,
  validateRoutineUpdate,
} from './index';

describe('rotina agendada', () => {
  it('aceita cron válido e rejeita expressão vazia', () => {
    expect(validateCronExpression('0 8 * * *')).toBe(true);
    expect(validateCronExpression('nao-cron')).toBe(false);
  });

  it('recusa cadastro sem nome e hora fora de HH:mm', () => {
    const invalida = validateRoutineData({
      nome: '  ',
      tipo: 'outros',
      configuracao: {},
      frequencia: 'diaria',
      hora_execucao: '25:00',
    });
    expect(invalida.isValid).toBe(false);
    expect(invalida.errors).toEqual(expect.arrayContaining([
      'Nome da rotina é obrigatório',
      'Hora de execução deve estar no formato HH:mm',
    ]));
  });

  it('aceita cadastro diário e edição parcial sem hora', () => {
    const valida = validateRoutineData({
      nome: 'Gerar títulos',
      tipo: 'geracao_titulos',
      configuracao: {},
      frequencia: 'diaria',
      hora_execucao: '08:30',
    });
    expect(valida.isValid).toBe(true);
    expect(validateRoutineUpdate({ nome: 'Novo nome' }).isValid).toBe(true);
    expect(buildCronExpression({ hora_execucao: '08:30', frequencia: 'diaria' })).toBe('30 08 * * *');
  });

  it('formata duração e resultado', () => {
    expect(formatDuration(45000)).toBe('45s');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatExecutionResult({ message: 'Concluída' })).toBe('Concluída');
    expect(formatExecutionResult({ success: false })).toBe('Execução falhou');
  });
});
