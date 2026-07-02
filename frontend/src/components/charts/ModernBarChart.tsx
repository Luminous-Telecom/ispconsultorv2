import React, { useEffect, useMemo, useState, memo } from 'react';
import { DynamicStyledElement } from 'components/ui';
import { ChartDataItem, ChartFormat } from './types';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartTitleWithInfo } from './ChartTitleWithInfo';
import { hexToRgba } from './chartColors';

interface ModernBarChartProps {
  data: ChartDataItem[];
  title: string;
  titleInfo?: string;
  format?: ChartFormat;
  onBarClick?: (item: ChartDataItem, index: number) => void;
}

const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#ec4899'];

const ModernBarChart: React.FC<ModernBarChartProps> = memo(
  ({ data, title, titleInfo, format = 'number', onBarClick }) => {
    const [grown, setGrown] = useState(false);

    const chartData = useMemo(
      () =>
        data
          .map((item, index) => ({
            label: item.label || item.name || '',
            value: item.value ?? item.valor ?? 0,
            color: item.color || PALETTE[index % PALETTE.length],
            raw: item,
          }))
          .filter((d) => d.value > 0)
          .sort((a, b) => b.value - a.value),
      [data]
    );

    const max = useMemo(() => Math.max(...chartData.map((d) => d.value), 1), [chartData]);

    const formatValue = (value: number) =>
      format === 'currency'
        ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
        : value.toLocaleString('pt-BR');

    useEffect(() => {
      setGrown(false);
      const id = requestAnimationFrame(() => setGrown(true));
      return () => cancelAnimationFrame(id);
    }, [chartData]);

    if (!data || data.length === 0 || chartData.length === 0) {
      return <ChartEmptyState title={title} />;
    }

    return (
      <div className="chart-container">
        <ChartTitleWithInfo title={title} titleInfo={titleInfo} />
        <div className="modern-bar-chart-list">
          {chartData.map((d, i) => {
            const pct = (d.value / max) * 100;
            const width = grown ? `${Math.max(pct, 3)}%` : '0%';
            return (
              <div
                key={`${d.label}-${i}`}
                onClick={onBarClick ? () => onBarClick(d.raw, i) : undefined}
                className={`modern-bar-row min-w-0 ${onBarClick ? 'cursor-pointer' : ''}`}
              >
                <div className="modern-bar-row-header">
                  <span className="modern-bar-label" title={d.label}>
                    {d.label}
                  </span>
                  <span className="modern-bar-value">{formatValue(d.value)}</span>
                </div>
                <DynamicStyledElement
                  className="modern-bar-track"
                  properties={{ background: hexToRgba(d.color, 0.14) }}
                  deps={[d.color]}
                >
                  <DynamicStyledElement
                    className="modern-bar-fill"
                    properties={{
                      width,
                      background: `linear-gradient(90deg, ${hexToRgba(d.color, 0.7)} 0%, ${d.color} 100%)`,
                    }}
                    deps={[width, d.color]}
                  />
                </DynamicStyledElement>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

ModernBarChart.displayName = 'ModernBarChart';

export { ModernBarChart };
