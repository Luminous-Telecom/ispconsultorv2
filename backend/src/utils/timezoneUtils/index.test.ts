import { formatDateISOLocal, getServerTimezoneOffset } from './index';

describe('formatDateISOLocal', () => {
  it('usa o relógio do servidor e não o sufixo Z', () => {
    const data = new Date('2026-11-06T21:47:00.000Z');
    const iso = formatDateISOLocal(data);
    const hora = String(data.getHours()).padStart(2, '0');
    const minuto = String(data.getMinutes()).padStart(2, '0');

    expect(iso).toContain(`T${hora}:${minuto}:00.000`);
    expect(iso?.endsWith('Z')).toBe(false);
    expect(iso).not.toBe(data.toISOString());
  });

  it('recusa valor vazio ou inválido', () => {
    expect(formatDateISOLocal(null)).toBeNull();
    expect(formatDateISOLocal('nao-e-data')).toBeNull();
  });
});

describe('getServerTimezoneOffset', () => {
  it('bate com o offset do processo', () => {
    expect(getServerTimezoneOffset()).toBe(-new Date().getTimezoneOffset() / 60);
  });
});
