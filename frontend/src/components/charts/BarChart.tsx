import React, { useMemo, useCallback } from 'react';
import { ChartDataItem, ChartFormat } from './types';
import { ChartEmptyState } from './ChartEmptyState';

interface BarChartProps {
  data: ChartDataItem[];
  title: string;
  format?: ChartFormat;
}

export const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  title, 
  format = 'number' 
}) => {
  const maxValue = useMemo(() => 
    Math.max(...data.map(item => item.value || item.valor || 0)), 
    [data]
  );
  
  const formatValue = useCallback((val: number) => {
    if (format === 'currency') {
      return `R$ ${val.toFixed(2).replace('.', ',')}`;
    }
    return val.toString();
  }, [format]);
  
  if (!data || data.length === 0) {
    return <ChartEmptyState title={title} />;
  }
  
  return (
    <div className="chart-container">
      <h6 className="chart-title">{title}</h6>
      <div className="bar-chart-horizontal">
        {data.map((item, index) => {
          const value = item.value || item.valor || 0;
          const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
          return (
            <div key={index} className="bar-item-horizontal">
              <div className="bar-label-horizontal" title={item.label}>
                {item.label}
              </div>
              <div className="bar-container-horizontal">
                <div 
                  className="bar-horizontal" 
                  style={{
                    width: `${width}%`,
                    backgroundColor: item.color || '#6c757d'
                  }}
                >
                  <span className="bar-value-horizontal">{formatValue(value)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

