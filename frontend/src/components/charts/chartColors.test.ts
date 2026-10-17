import { hexToRgba } from './chartColors';

describe('hexToRgba', () => {
  const originalGetComputedStyle = window.getComputedStyle;

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle;
  });

  it('converte hex em rgba com o alfa informado', () => {
    expect(hexToRgba('#10b981', 0.14)).toBe('rgba(16, 185, 129, 0.14)');
  });

  it('reutiliza a cor da paleta quando recebe a variável CSS', () => {
    window.getComputedStyle = jest.fn().mockReturnValue({
      getPropertyValue: (name: string) => (name === '--color-emerald' ? '#10b981' : ''),
    }) as unknown as typeof window.getComputedStyle;

    expect(hexToRgba('var(--color-emerald)', 0.1)).toBe('rgba(16, 185, 129, 0.1)');
  });

  it('devolve a cor original quando o valor não é uma cor', () => {
    expect(hexToRgba('azul', 1)).toBe('azul');
  });
});
