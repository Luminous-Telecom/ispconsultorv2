import { lineChartHorizontalMargins } from './lineChartMargins';

describe('lineChartHorizontalMargins', () => {
  it('iguala as laterais quando o eixo Y é curto', () => {
    const { left, right } = lineChartHorizontalMargins(['0', '1'], 'number');
    expect(right).toBe(left);
    expect(left).toBeLessThan(44);
  });

  it('espelha a margem esquerda na direita em moeda', () => {
    const { left, right } = lineChartHorizontalMargins(['0,00', '1,00'], 'currency');
    expect(right).toBe(left);
    expect(left).toBeLessThan(58);
    expect(left).toBeGreaterThanOrEqual(24);
  });

  it('alarga os dois lados quando o rótulo do eixo não cabe na margem curta', () => {
    const curto = lineChartHorizontalMargins(['0,00'], 'currency');
    const longo = lineChartHorizontalMargins(['1.000,00'], 'currency');
    expect(longo.left).toBeGreaterThan(curto.left);
    expect(longo.right).toBe(longo.left);
  });
});
