import React, { useMemo, useCallback } from 'react';
import { ChartDataItem, ChartFormat } from './types';

interface ValueChartProps {
  data: ChartDataItem[];
  title: string;
  format?: ChartFormat;
}

export const ValueChart: React.FC<ValueChartProps> = ({ 
  data, 
  title, 
  format = 'number' 
}) => {
  const value = useMemo(() => data[0]?.value || data[0]?.valor || 0, [data]);
  
  const formatValue = useCallback((val: number) => {
    switch (format) {
      case 'currency':
        return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toFixed(1);
    }
  }, [format]);
  
  const color = data[0]?.color || '#6f42c1';
  
  return (
    <div className="chart-container-pie">
      <h6 className="chart-title-pie">{title}</h6>
      <div className="pie-chart-content">
        <div className="value-chart">
          <div className="value-display" style={{ color }}>
            {formatValue(value)}
          </div>
        </div>
      </div>
    </div>
  );
};

