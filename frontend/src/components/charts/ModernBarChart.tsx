import React, { useEffect, useMemo, useState, memo } from 'react';
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

/**
 * Gráfico de barras horizontais moderno: trilho de fundo, preenchimento com
 * gradiente, cantos arredondados e animação de entrada.
 */
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          {chartData.map((d, i) => {
            const pct = (d.value / max) * 100;
            return (
              <div
                key={`${d.label}-${i}`}
                onClick={onBarClick ? () => onBarClick(d.raw, i) : undefined}
                style={{ minWidth: 0, cursor: onBarClick ? 'pointer' : 'default' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 8,
                    marginBottom: 3,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={d.label}
                  >
                    {d.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      flexShrink: 0,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatValue(d.value)}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 5,
                    background: hexToRgba(d.color, 0.14),
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: grown ? `${Math.max(pct, 3)}%` : '0%',
                      background: `linear-gradient(90deg, ${hexToRgba(d.color, 0.7)} 0%, ${d.color} 100%)`,
                      borderRadius: 5,
                      transition: 'width 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  />
                </div>
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
