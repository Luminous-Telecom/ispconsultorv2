import React, { useMemo, useCallback } from 'react';
import { ChartDataItem, ChartFormat } from './types';
import { ChartEmptyState } from './ChartEmptyState';

interface ValueChartProps {
  data: ChartDataItem[];
  title: string;
  format?: ChartFormat;
}

export const ValueChart: React.FC<ValueChartProps> = ({ data, title, format = 'number' }) => {
  const value = useMemo(() => data[0]?.value ?? data[0]?.valor ?? 0, [data]);

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
    return <ChartEmptyState title={title} />;
  }

  return (
    <div className="chart-container chart-container--metric">
      <h6 className="chart-title">{title}</h6>
      <p className="chart-value-metric">{formatValue(value)}</p>
    </div>
  );
};
