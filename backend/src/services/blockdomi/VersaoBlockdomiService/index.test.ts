import { prefixoNumeroVersaoBlockdomi } from './index';

describe('prefixoNumeroVersaoBlockdomi', () => {
  it('monta YYYYMMDD com o dia local', () => {
    const data = new Date(2026, 10, 4, 22, 15, 0);
    const ano = String(data.getFullYear());
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    expect(prefixoNumeroVersaoBlockdomi(data)).toBe(`${ano}${mes}${dia}`);
  });

  it('não usa o dia UTC quando o fuso local já está no dia anterior', () => {
    const data = new Date(2026, 10, 4, 23, 0, 0);
    const prefixo = prefixoNumeroVersaoBlockdomi(data);
    const utc = data.toISOString().slice(0, 10).replace(/-/g, '');

    expect(prefixo).toBe('20261104');
    if (data.getTimezoneOffset() !== 0) {
      expect(prefixo).not.toBe(utc);
    }
  });

  it('recusa data inválida', () => {
    expect(() => prefixoNumeroVersaoBlockdomi(new Date(Number.NaN))).toThrow(/inválida/);
  });
});
