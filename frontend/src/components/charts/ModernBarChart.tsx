import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, memo } from 'react';
import { DynamicStyledElement } from 'components/ui';
import { ChartDataItem, ChartFormat } from './types';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartTitleWithInfo } from './ChartTitleWithInfo';
import { CHART_BAR_PALETTE, hexToRgba } from './chartColors';

interface ModernBarChartProps {
  data: ChartDataItem[];
  title: string;
  titleInfo?: string;
  format?: ChartFormat;
  onBarClick?: (item: ChartDataItem, index: number) => void;
}

const PALETTE = CHART_BAR_PALETTE;

const ModernBarLabel: React.FC<{ label: string }> = ({ label }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [tooltip, setTooltip] = useState<string | undefined>(undefined);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const syncTooltip = () => {
      setTooltip(el.scrollWidth > el.clientWidth ? label : undefined);
    };

    syncTooltip();
    const observer = new ResizeObserver(syncTooltip);
    observer.observe(el);
    return () => observer.disconnect();
  }, [label]);

  return (
    <span ref={ref} className="modern-bar-label" title={tooltip}>
      {label}
    </span>
  );
};

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
                <ModernBarLabel label={d.label} />
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
                <span className="modern-bar-value">{formatValue(d.value)}</span>
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
