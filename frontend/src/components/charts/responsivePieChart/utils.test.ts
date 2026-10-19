import { describe, expect, it } from '@jest/globals';
import { getItemValue, resolveHighlightItem } from './utils';
import type { ChartDataItem } from '../types';

const pagamentoData: ChartDataItem[] = [
  { label: 'Pago', value: 3, color: '#10b981', filterValue: 'pago,pago_atraso,parcial' },
  { label: 'Cancelada', value: 4, color: '#94a3b8', filterValue: 'cancelado' },
];

describe('resolveHighlightItem', () => {
  it('encontra a fatia de pagos pelo filter composto', () => {
    const hit = resolveHighlightItem(pagamentoData, 'pago,pago_atraso,parcial');
    expect(hit?.label).toBe('Pago');
    expect(getItemValue(hit!)).toBe(3);
  });

  it('não encontra pendente quando a fatia não existe nos dados', () => {
    expect(resolveHighlightItem(pagamentoData, 'pendente')).toBeNull();
  });

  it('calcula percentual de pagos sobre o total', () => {
    const hit = resolveHighlightItem(pagamentoData, 'pago,pago_atraso,parcial');
    const total = pagamentoData.reduce((sum, item) => sum + getItemValue(item), 0);
    const pct = Math.round((getItemValue(hit!) / total) * 100);
    expect(pct).toBe(43);
  });
});
