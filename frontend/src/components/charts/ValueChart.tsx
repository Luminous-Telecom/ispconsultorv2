import React, { useMemo, useCallback } from 'react';
import { ChartDataItem, ChartFormat } from './types';

interface ValueChartProps {
  data: ChartDataItem[];
  title: string;
  format?: ChartFormat;
}

export const ValueChart: React.FC<ValueChartProps> = ({ data, title, format = 'number' }) => {
  const value = useMemo(() => data[0]?.value ?? data[0]?.valor ?? 0, [data]);
  const color = data[0]?.color || 'var(--btn-primary-color)';

  const formatValue = useCallback((val: number) => {
    switch (format) {
      case 'currency': {
        const hasCents = val % 1 !== 0;
        return val.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: hasCents ? 2 : 0,
          maximumFractionDigits: 2,
        });
      }
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString('pt-BR');
    }
  }, [format]);

  if (!data || data.length === 0) {
    return (
      <div className="kpi-card">
        <p className="kpi-card__label">{title}</p>
        <div className="chart-empty-state chart-empty-state--compact">
          <p className="text-muted">Sem dados para exibir</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kpi-card">
      <p className="kpi-card__label">{title}</p>
      <div className="kpi-card__accent" style={{ background: color }} />
      <p className="kpi-card__value" style={{ color }}>{formatValue(value)}</p>
    </div>
  );
};
