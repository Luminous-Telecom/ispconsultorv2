import React, { useRef, useLayoutEffect, useEffect, useState, useMemo, memo, useCallback } from 'react';
import * as d3 from 'd3';
import { ChartEmptyState } from './ChartEmptyState';

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
}

const BackupStatusStackedBarChart: React.FC<BackupStatusStackedBarChartProps> = memo(
  ({ days, title, legendLabels, emptyMessage, onSegmentClick }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(400);

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

    const maxTotal = useMemo(
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

    const hasAny = useMemo(
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

    useLayoutEffect(() => {
      const el = wrapRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => {
        const w = el.getBoundingClientRect().width;
        setWidth(Math.max(280, w || 400));
      });
      ro.observe(el);
      setWidth(Math.max(280, el.getBoundingClientRect().width || 400));
      return () => ro.disconnect();
    }, []);

    const textMuted = useCallback(() => {
      if (typeof window === 'undefined') return '#94a3b8';
      const v = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
      return v || '#94a3b8';
    }, []);

    useEffect(() => {
      const svg = svgRef.current;
      if (!svg || chartData.length === 0 || !hasAny) return;

      const margin = { top: 8, right: 12, left: 36, bottom: 28 };
      const height = 200;
      const innerW = Math.max(1, width - margin.left - margin.right);
      const innerH = height - margin.top - margin.bottom;

      const stack = d3.stack<typeof chartData[0]>().keys([...STACK_KEYS]);
      const series = stack(chartData);

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
      const tooltipFilterId = `tooltip-shadow-${Math.random().toString(36).slice(2)}`;
      defs
        .append('filter')
        .attr('id', tooltipFilterId)
        .attr('x', '-20%')
        .attr('y', '-20%')
        .attr('width', '140%')
        .attr('height', '140%')
        .append('feDropShadow')
        .attr('dx', 0)
        .attr('dy', 4)
        .attr('stdDeviation', 6)
        .attr('flood-opacity', 0.25);

      const g = svgSel.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const axisColor = textMuted();
      const gAxis = g.append('g').attr('class', 'y-axis').call(d3.axisLeft(y).ticks(4).tickSize(-innerW));
      gAxis.selectAll('.tick line').attr('stroke', axisColor).attr('stroke-opacity', 0.35);
      gAxis.select('.domain').attr('stroke', axisColor);
      gAxis.selectAll('.tick text').attr('fill', axisColor).attr('font-size', '10px');

      const gx = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x));
      gx.selectAll('text').attr('fill', axisColor).attr('font-size', '10px');
      gx.select('.domain').attr('stroke', axisColor);

      series.forEach((serie) => {
        const statusKey = serie.key as BackupStatusKey;
        const color = STATUS_COLORS[statusKey] ?? '#64748b';
        g.append('g')
          .selectAll('rect')
          .data(serie)
          .join('rect')
          .attr('data-status-key', statusKey)
          .attr('x', (d) => x(d.data.label) ?? 0)
          .attr('y', (d) => y(d[1]))
          .attr('height', (d) => Math.max(0, y(d[0]) - y(d[1])))
          .attr('width', x.bandwidth())
          .attr('fill', color)
          .attr('rx', 2)
          .style('cursor', (d) => (onSegmentClick && y(d[0]) - y(d[1]) > 0.5 ? 'pointer' : 'default'))
          .on('click', (event, d) => {
            event.stopPropagation();
            const h = y(d[0]) - y(d[1]);
            if (h < 0.5 || !onSegmentClick) return;
            onSegmentClick(d.data.dataISO, statusKey);
          });
      });

      const tooltipG = svgSel.append('g').attr('class', 'chart-tooltip').style('opacity', 0).style('pointer-events', 'none');
      const tooltipBg = tooltipG
        .append('rect')
        .attr('rx', 6)
        .attr('ry', 6)
        .attr('fill', 'var(--bg-tertiary)')
        .attr('stroke', 'var(--border-color)')
        .attr('stroke-width', 1)
        .attr('filter', `url(#${tooltipFilterId})`);

      const tooltipContent = tooltipG.append('g').attr('transform', 'translate(12,12)');
      tooltipContent
        .append('text')
        .attr('class', 'tooltip-label')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .attr('fill', 'var(--text-muted)')
        .attr('y', 0);
      tooltipContent
        .append('text')
        .attr('class', 'tooltip-value')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', 'var(--text-primary)')
        .attr('y', 16);

      const padding = { x: 16, y: 12 };

      const placeTooltip = (d: (typeof series)[0][0], statusKey: BackupStatusKey) => {
        const v = Number(d.data[statusKey]) || 0;
        const nome = legendLabels[statusKey] ?? statusKey;
        tooltipContent.select('.tooltip-label').text(d.data.label);
        tooltipContent.select('.tooltip-value').text(`${nome}: ${v.toLocaleString('pt-BR')}`);
        const bbox = (tooltipContent.node() as SVGGElement | null)?.getBBox();
        const tw = bbox ? Math.max(bbox.width + padding.x, 100) : 120;
        const th = bbox ? bbox.height + padding.y : 42;
        tooltipBg.attr('width', tw).attr('height', th).attr('x', 0).attr('y', 0);
        const bx = x(d.data.label) ?? 0;
        const pointX = margin.left + bx + x.bandwidth() / 2;
        const pointY = margin.top + y(d[1]);
        let tx = pointX - tw / 2;
        let ty = pointY - th - 16;
        if (tx + tw > width - 8) tx = width - tw - 8;
        if (tx < 8) tx = 8;
        if (ty < 8) ty = pointY + 20;
        if (ty + th > height - 8) ty = height - th - 8;
        if (ty < 8) ty = 8;
        tooltipG.attr('transform', `translate(${tx},${ty})`);
      };

      type StackPoint = (typeof series)[0][0];

      g.selectAll<SVGRectElement, StackPoint>('rect')
        .on('mouseenter', function (_event, d) {
          const h = y(d[0]) - y(d[1]);
          if (h < 0.5) return;
          const statusKey = (this.getAttribute('data-status-key') as BackupStatusKey) || STACK_KEYS[0];
          placeTooltip(d, statusKey);
          tooltipG.transition().duration(180).ease(d3.easeCubicOut).style('opacity', 1);
        })
        .on('mouseleave', () => {
          tooltipG.transition().duration(150).ease(d3.easeCubicOut).style('opacity', 0);
        });
    }, [chartData, width, maxTotal, hasAny, onSegmentClick, textMuted, legendLabels]);

    if (chartData.length === 0 || !hasAny) {
      return (
        <ChartEmptyState
          title={title}
          message={emptyMessage}
          containerClassName="chart-container-pie"
        />
      );
    }

    return (
      <div
        ref={wrapRef}
        className="chart-container-pie chart-radial-style"
        style={{ height: '100%', position: 'relative' }}
      >
        <h6 className="chart-title-pie" style={{ marginBottom: 6 }}>
          {title}
        </h6>
        <svg
          ref={svgRef}
          style={{ display: 'block', maxWidth: '100%', overflow: 'visible' }}
        />
        <ul
          className="d-flex flex-wrap gap-2 justify-content-center list-unstyled mb-0 mt-1"
          style={{ fontSize: '0.65rem', rowGap: '4px' }}
        >
          {STACK_KEYS.map((k) => (
            <li key={k} className="d-flex align-items-center gap-1">
              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: STATUS_COLORS[k] }} />
              <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{legendLabels[k]}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
);

BackupStatusStackedBarChart.displayName = 'BackupStatusStackedBarChart';

export default BackupStatusStackedBarChart;
