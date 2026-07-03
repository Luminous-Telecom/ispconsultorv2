import React, { useRef, useLayoutEffect, useEffect, useState, useMemo, memo, useCallback } from 'react';
import { PieLegendDot } from 'components/ui';
import * as d3 from 'd3';
import { clampTooltipNearPoint, createD3ChartTooltip } from './chartTooltip';
import { HIDE_ANIMATION_MS } from './responsivePieChart/utils';

export type BackupStatusKey = 'sucesso' | 'somente_local' | 'falha_envio' | 'verificado' | 'falha';

export interface BackupStatusDayDatum {
  label: string;
  dataISO: string;
  falha: number;
  sucesso: number;
  somente_local: number;
  falha_envio: number;
  verificado: number;
}

/** No card do dashboard: só sucesso e falha (legenda sem local, falha envio, verificado). */
const STACK_KEYS: BackupStatusKey[] = ['sucesso', 'falha'];

const STATUS_COLORS: Record<BackupStatusKey, string> = {
  sucesso: '#22c55e',
  somente_local: '#eab308',
  falha_envio: '#f97316',
  verificado: '#3b82f6',
  falha: '#ef4444',
};

export interface BackupStatusStackedBarChartProps {
  days: BackupStatusDayDatum[];
  title: string;
  legendLabels: Record<BackupStatusKey, string>;
  emptyMessage?: string;
  onSegmentClick?: (dataISO: string, status: BackupStatusKey) => void;
  /** Chaves ocultas via legenda (mesmo padrão do ResponsivePieChart). */
  hiddenKeys?: ReadonlySet<string>;
  onLegendToggle?: (key: BackupStatusKey) => void;
  /** True se existir backup em algum dia do período filtrado (evita vazio quando só a janela dos últimos 7 dias está zerada). */
  periodHasBackupEvents: boolean;
}

const BackupStatusStackedBarChart: React.FC<BackupStatusStackedBarChartProps> = memo(
  ({
    days,
    title,
    legendLabels,
    emptyMessage,
    onSegmentClick,
    hiddenKeys,
    onLegendToggle,
    periodHasBackupEvents,
  }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const chartBoxRef = useRef<HTMLDivElement>(null);
    const layoutKeyRef = useRef('');
    const onLegendToggleRef = useRef(onLegendToggle);
    onLegendToggleRef.current = onLegendToggle;
    const [{ width, height: boxHeight }, setSize] = useState({ width: 300, height: 90 });
    const [animatingOut, setAnimatingOut] = useState<Set<BackupStatusKey>>(new Set());
    const [animatingIn, setAnimatingIn] = useState<Set<BackupStatusKey>>(new Set());

    const handleLegendToggle = useCallback(
      (key: BackupStatusKey) => {
        if (!onLegendToggle || animatingOut.has(key) || animatingIn.has(key)) return;
        if (hiddenKeys?.has(key)) {
          setAnimatingIn((prev) => new Set(prev).add(key));
          onLegendToggle(key);
        } else {
          setAnimatingOut((prev) => new Set(prev).add(key));
        }
      },
      [hiddenKeys, onLegendToggle, animatingOut, animatingIn]
    );

    const chartData = useMemo(
      () =>
        days.map((d) => ({
          label: d.label,
          dataISO: d.dataISO,
          sucesso: d.sucesso,
          somente_local: d.somente_local,
          falha_envio: d.falha_envio,
          verificado: d.verificado,
          falha: d.falha,
        })),
      [days]
    );

    const visibleKeys = useMemo(
      () => STACK_KEYS.filter((k) => !hiddenKeys?.has(k) || animatingOut.has(k)),
      [hiddenKeys, animatingOut]
    );

    const maxTotalAll = useMemo(
      () =>
        chartData.length > 0
          ? Math.max(
              1,
              ...chartData.map((d) =>
                STACK_KEYS.reduce((s, k) => s + (Number(d[k]) || 0), 0)
              )
            )
          : 0,
      [chartData]
    );

    const maxTotal = useMemo(() => {
      if (chartData.length === 0) return 0;
      if (visibleKeys.length === 0) return maxTotalAll;
      return Math.max(
        1,
        ...chartData.map((d) => visibleKeys.reduce((s, k) => s + (Number(d[k]) || 0), 0))
      );
    }, [chartData, visibleKeys, maxTotalAll]);

    const hasCountsInWindow = useMemo(
      () =>
        chartData.some(
          (d) =>
            (Number(d.sucesso) || 0) +
              (Number(d.somente_local) || 0) +
              (Number(d.falha_envio) || 0) +
              (Number(d.verificado) || 0) +
              (Number(d.falha) || 0) >
            0
        ),
      [chartData]
    );

    const showChartBody =
      chartData.length > 0 && (hasCountsInWindow || periodHasBackupEvents);

    useLayoutEffect(() => {
      const el = chartBoxRef.current;
      if (!el) return;
      const measure = () => {
        const r = el.getBoundingClientRect();
        setSize({ width: Math.max(160, r.width || 300), height: Math.max(48, r.height || 90) });
      };
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      measure();
      return () => ro.disconnect();
    }, [showChartBody]);

    const textMuted = useCallback(() => {
      if (typeof window === 'undefined') return '#94a3b8';
      const v = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
      return v || '#94a3b8';
    }, []);

    useEffect(() => {
      const svg = svgRef.current;
      if (!svg || chartData.length === 0 || (!hasCountsInWindow && !periodHasBackupEvents)) return;

      const isCompact = width < 300;
      const margin = {
        top: 4,
        right: isCompact ? 4 : 10,
        left: isCompact ? 20 : 30,
        bottom: isCompact ? 16 : 22,
      };
      const height = Math.max(56, boxHeight);
      const innerW = Math.max(1, width - margin.left - margin.right);
      const innerH = Math.max(1, height - margin.top - margin.bottom);

      const layoutKey = `${chartData.length}-${width}-${boxHeight}-${hasCountsInWindow}-${periodHasBackupEvents}`;
      const isHardRefresh = layoutKeyRef.current !== layoutKey;
      if (isHardRefresh) layoutKeyRef.current = layoutKey;

      const stackKeys = visibleKeys.length > 0 ? visibleKeys : [];
      const series =
        stackKeys.length > 0
          ? d3.stack<typeof chartData[0]>().keys([...stackKeys])(chartData)
          : [];

      const x = d3
        .scaleBand<string>()
        .domain(chartData.map((d) => d.label))
        .range([0, innerW])
        .padding(0.25);

      const y = d3
        .scaleLinear()
        .domain([0, maxTotal])
        .nice()
        .range([innerH, 0]);

      const svgSel = d3.select(svg);
      svgSel.selectAll('*').remove();
      svgSel.attr('width', width).attr('height', height);

      const defs = svgSel.append('defs');
      (visibleKeys.length > 0 ? visibleKeys : STACK_KEYS).forEach((k) => {
        const color = STATUS_COLORS[k] ?? '#64748b';
        const grad = defs
          .append('linearGradient')
          .attr('id', `backup-grad-${k}`)
          .attr('x1', '0')
          .attr('y1', '0')
          .attr('x2', '0')
          .attr('y2', '1');
        grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 1);
        grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.6);
      });

      const g = svgSel.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const axisColor = textMuted();
      const axisFontSize = isCompact ? '8px' : '10px';

      // Gridlines discretas (sem linha de domínio) para um visual mais limpo.
      const gAxis = g
        .append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y).ticks(isCompact ? 3 : 4).tickSize(-innerW).tickPadding(6));
      gAxis
        .selectAll('.tick line')
        .attr('stroke', axisColor)
        .attr('stroke-opacity', 0.12)
        .attr('stroke-dasharray', '2 4');
      gAxis.select('.domain').remove();
      gAxis.selectAll('.tick text').attr('fill', axisColor).attr('font-size', axisFontSize).attr('opacity', 0.7);

      const gx = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).tickSize(0).tickPadding(8));
      gx.selectAll('text').attr('fill', axisColor).attr('font-size', axisFontSize).attr('opacity', 0.7);
      gx.select('.domain').remove();

      const barWidth = Math.min(x.bandwidth(), isCompact ? 16 : 22);
      const barOffset = (x.bandwidth() - barWidth) / 2;
      const SEG_GAP = 2;

      const shouldEnterFromZero = isHardRefresh;

      series.forEach((serie) => {
        const statusKey = serie.key as BackupStatusKey;
        const isAnimatingIn = animatingIn.has(statusKey);
        const rects = g
          .append('g')
          .selectAll('rect')
          .data(serie)
          .join('rect')
          .attr('data-status-key', statusKey)
          .attr('x', (d) => (x(d.data.label) ?? 0) + barOffset)
          .attr('width', barWidth)
          .attr('fill', `url(#backup-grad-${statusKey})`)
          .attr('rx', 4)
          .style('cursor', (d) => (onSegmentClick && y(d[0]) - y(d[1]) > 0.5 ? 'pointer' : 'default'))
          .on('click', (event, d) => {
            event.stopPropagation();
            const h = y(d[0]) - y(d[1]);
            if (h < 0.5 || !onSegmentClick) return;
            onSegmentClick(d.data.dataISO, statusKey);
          });

        if (shouldEnterFromZero || isAnimatingIn) {
          const duration = isAnimatingIn ? HIDE_ANIMATION_MS : 650;
          const transition = rects
            .attr('y', innerH)
            .attr('height', 0)
            .transition()
            .duration(duration)
            .ease(d3.easeCubicOut)
            .attr('y', (d) => y(d[1]))
            .attr('height', (d) => Math.max(0, y(d[0]) - y(d[1]) - SEG_GAP));

          if (isAnimatingIn) {
            let animInEnded = 0;
            transition.on('end', () => {
              animInEnded += 1;
              if (animInEnded < serie.length) return;
              setAnimatingIn((prev) => {
                const next = new Set(prev);
                next.delete(statusKey);
                return next;
              });
            });
          }
        } else {
          rects
            .attr('y', (d) => y(d[1]))
            .attr('height', (d) => Math.max(0, y(d[0]) - y(d[1]) - SEG_GAP));
        }
      });

      animatingOut.forEach((statusKey) => {
        const rects = g.selectAll<SVGRectElement, d3.SeriesPoint<(typeof chartData)[0]>>(
          `rect[data-status-key="${statusKey}"]`
        );
        const count = rects.size();
        if (count === 0) return;
        let ended = 0;
        rects
          .transition()
          .duration(HIDE_ANIMATION_MS)
          .ease(d3.easeCubicInOut)
          .attr('y', innerH)
          .attr('height', 0)
          .on('end', () => {
            ended += 1;
            if (ended < count) return;
            onLegendToggleRef.current?.(statusKey);
            setAnimatingOut((prev) => {
              const next = new Set(prev);
              next.delete(statusKey);
              return next;
            });
          });
      });

      const tooltip = createD3ChartTooltip(svg);
      if (!tooltip) return;

      const placeTooltip = (d: d3.SeriesPoint<(typeof chartData)[0]>, statusKey: BackupStatusKey) => {
        const v = Number(d.data[statusKey]) || 0;
        const nome = legendLabels[statusKey] ?? statusKey;
        tooltip.setLabelValue(d.data.label, `${nome}: ${v.toLocaleString('pt-BR')}`);
        const { width: tw, height: th } = tooltip.measure();
        const bx = x(d.data.label) ?? 0;
        const pointX = margin.left + bx + x.bandwidth() / 2;
        const pointY = margin.top + y(d[1]);
        const { tx, ty } = clampTooltipNearPoint(pointX, pointY, tw, th, { width, height }, 16);
        tooltip.group.attr('transform', `translate(${tx},${ty})`);
      };

      type StackPoint = d3.SeriesPoint<(typeof chartData)[0]>;

      g.selectAll<SVGRectElement, StackPoint>('rect')
        .on('mouseenter', function (_event, d) {
          const h = y(d[0]) - y(d[1]);
          if (h < 0.5) return;
          const statusKey = (this.getAttribute('data-status-key') as BackupStatusKey) || visibleKeys[0] || 'sucesso';
          placeTooltip(d, statusKey);
          tooltip.show();
        })
        .on('mouseleave', () => {
          tooltip.hide();
        });
    }, [
      chartData,
      width,
      boxHeight,
      maxTotal,
      maxTotalAll,
      hasCountsInWindow,
      periodHasBackupEvents,
      onSegmentClick,
      textMuted,
      legendLabels,
      visibleKeys,
      animatingOut,
      animatingIn,
    ]);

    if (!showChartBody) {
      return (
        <div className="chart-container-pie">
          <h6 className="chart-title-pie chart-title-pie-tight">{title}</h6>
          <div className="backup-status-card__body backup-status-card__body--empty">
            <div className="chart-empty-state chart-empty-state--compact">
              <p className="chart-empty-state__message">{emptyMessage ?? 'Sem dados para exibir'}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="chart-container-pie chart-radial-style backup-status-card">
        <h6 className="chart-title-pie chart-title-pie-tight">{title}</h6>

        <div className="backup-status-card__body">
          <div ref={chartBoxRef} className="backup-status-card__chart chart-area-relative">
            <svg ref={svgRef} className="chart-svg-overflow" />
          </div>
          <ul className="backup-status-card__legend">
          {STACK_KEYS.map((k) => {
            const isHidden = hiddenKeys?.has(k) ?? false;
            return (
              <li
                key={k}
                className={`backup-status-card__legend-item backup-legend-item ${onLegendToggle ? 'cursor-pointer' : ''} ${isHidden ? 'pie-legend-item--hidden' : ''}`}
                role={onLegendToggle ? 'button' : undefined}
                tabIndex={onLegendToggle ? 0 : undefined}
                onClick={
                  onLegendToggle
                    ? (e) => {
                        e.stopPropagation();
                        handleLegendToggle(k);
                      }
                    : undefined
                }
                onKeyDown={
                  onLegendToggle
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleLegendToggle(k);
                        }
                      }
                    : undefined
                }
              >
                <PieLegendDot color={STATUS_COLORS[k]} />
                <span className="backup-legend-label">{legendLabels[k]}</span>
              </li>
            );
          })}
        </ul>
        </div>
      </div>
    );
  }
);

BackupStatusStackedBarChart.displayName = 'BackupStatusStackedBarChart';

export default BackupStatusStackedBarChart;
