import { describe, expect, it } from '@jest/globals';
import { getItemValue, resolveCenterLabel, resolveHighlightItem } from './utils';
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
    const label = resolveCenterLabel(pagamentoData, 'pago,pago_atraso,parcial', '#94a3b8');
    expect(label?.text).toBe('43%');
    expect(label?.color).toBe('#10b981');
  });

  it('mostra 0% quando não há fatia de pagos', () => {
    const semPagos: ChartDataItem[] = [
      { label: 'Pendente', value: 21, color: '#38bdf8', filterValue: 'pendente' },
      { label: 'Cancelada', value: 14, color: '#94a3b8', filterValue: 'cancelado' },
    ];
    const label = resolveCenterLabel(semPagos, 'pago,pago_atraso,parcial', '#94a3b8');
    expect(label?.text).toBe('0%');
    expect(label?.color).toBe('#94a3b8');
  });
});
