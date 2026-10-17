import React, { useRef, useLayoutEffect, useEffect, useCallback, useMemo, memo, useState } from 'react';
import * as d3 from 'd3';
import { LineChartProps } from './types';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartTitleWithInfo } from './ChartTitleWithInfo';
import { clampTooltipNearPoint, createD3ChartTooltip } from './chartTooltip';
import { FONT_FAMILY_BASE } from 'constants/typography';
import { lineChartHorizontalMargins } from './lineChartMargins';

const DEFAULT_LINE_COLOR = 'var(--chart-color-1)';

/**
 * Gráfico de linha moderno: área com gradiente, linha suave, grid horizontal
 * discreto, rótulos por ponto, animação de entrada e hover com foco.
 */
const ResponsiveLineChart: React.FC<LineChartProps> = memo(
  ({ data, title, titleInfo, format = 'number', lineColor = DEFAULT_LINE_COLOR, onPointClick }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const gradientId = useMemo(() => `line-grad-${Math.random().toString(36).slice(2)}`, []);
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

    const formatDateLabel = useCallback((label: string): string => {
      if (!label) return '';
      const ddmmyyyy = label.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (ddmmyyyy) return `${ddmmyyyy[1].padStart(2, '0')}/${ddmmyyyy[2].padStart(2, '0')}`;
      const mmyy = label.match(/^(\d{1,2})\/(\d{2})$/);
      if (mmyy) return `${mmyy[1].padStart(2, '0')}/${mmyy[2]}`;
      return label;
    }, []);

    const chartData = useMemo(
      () =>
        data.map((item) => ({
          name: formatDateLabel(item.mes || item.name || ''),
          value: item.valor ?? item.value ?? 0,
        })),
      [data, formatDateLabel]
    );

    const formatValue = useCallback(
      (value: number) =>
        format === 'currency'
          ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
          : value.toLocaleString('pt-BR'),
      [format]
    );

    const formatPointLabel = useCallback(
      (value: number) =>
        format === 'currency'
          ? value.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : value.toLocaleString('pt-BR'),
      [format]
    );

    const formatAxis = useCallback(
      (value: number) =>
        format === 'currency'
          ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : value.toLocaleString('pt-BR'),
      [format]
    );

    useLayoutEffect(() => {
      const update = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setDimensions({ width: rect.width || 160, height: rect.height || 220 });
        }
      };
      update();
      const ro = new ResizeObserver(update);
      if (containerRef.current) ro.observe(containerRef.current);
      return () => ro.disconnect();
    }, []);

    useEffect(() => {
      const svg = svgRef.current;
      if (!svg || dimensions.width === 0 || dimensions.height === 0 || chartData.length === 0) return;

      const sel = d3.select(svg);
      sel.selectAll('*').remove();
      sel.attr('width', dimensions.width).attr('height', dimensions.height);

      const values = chartData.map((d) => d.value);
      const maxValue = Math.max(...values, 0);
      const yProbe = d3.scaleLinear().domain([0, maxValue * 1.2 || 1]).nice();
      const { left: leftMargin, right: rightMargin } = lineChartHorizontalMargins(
        yProbe.ticks(4).map((tick) => formatAxis(Number(tick))),
        format
      );
      const margin = { top: 18, right: rightMargin, left: leftMargin, bottom: 34 };
      const chartWidth = Math.max(1, dimensions.width - margin.left - margin.right);
      const chartHeight = Math.max(1, dimensions.height - margin.top - margin.bottom);

      const xScale = d3.scaleLinear().domain([0, Math.max(1, chartData.length - 1)]).range([0, chartWidth]);
      const yScale = d3.scaleLinear().domain([0, maxValue * 1.2 || 1]).nice().range([chartHeight, 0]);

      const textColor = 'var(--text-muted)';
      const gridColor = 'var(--border-color)';

      const defs = sel.append('defs');
      const grad = defs
        .append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0')
        .attr('y1', '0')
        .attr('x2', '0')
        .attr('y2', '1');
      grad.append('stop').attr('offset', '0%').attr('stop-color', lineColor).attr('stop-opacity', 0.35);
      grad.append('stop').attr('offset', '100%').attr('stop-color', lineColor).attr('stop-opacity', 0);

      const g = sel.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const yTicks = yScale.ticks(4);
      g.append('g')
        .selectAll('line')
        .data(yTicks)
        .join('line')
        .attr('x1', 0)
        .attr('x2', chartWidth)
        .attr('y1', (d) => yScale(d))
        .attr('y2', (d) => yScale(d))
        .attr('stroke', gridColor)
        .attr('stroke-opacity', 0.4)
        .attr('stroke-dasharray', '2 5');

      g.append('g')
        .selectAll('text')
        .data(yTicks)
        .join('text')
        .attr('x', -8)
        .attr('y', (d) => yScale(d))
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '9px')
        .attr('font-family', FONT_FAMILY_BASE)
        .attr('fill', textColor)
        .attr('opacity', 0.75)
        .text((d) => formatAxis(Number(d)));

      const area = d3
        .area<{ name: string; value: number }>()
        .x((_, i) => xScale(i))
        .y0(chartHeight)
        .y1((d) => yScale(d.value))
        .curve(d3.curveMonotoneX);

      const line = d3
        .line<{ name: string; value: number }>()
        .x((_, i) => xScale(i))
        .y((d) => yScale(d.value))
        .curve(d3.curveMonotoneX);

      const areaPath = g
        .append('path')
        .datum(chartData)
        .attr('d', area)
        .attr('fill', `url(#${gradientId})`)
        .attr('opacity', 0);
      areaPath.transition().duration(700).ease(d3.easeCubicOut).attr('opacity', 1);

      const linePath = g
        .append('path')
        .datum(chartData)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round');

      const totalLen = (linePath.node() as SVGPathElement)?.getTotalLength?.() ?? 0;
      if (totalLen > 0) {
        linePath
          .attr('stroke-dasharray', `${totalLen} ${totalLen}`)
          .attr('stroke-dashoffset', totalLen)
          .transition()
          .duration(800)
          .ease(d3.easeCubicInOut)
          .attr('stroke-dashoffset', 0);
      }

      const LABEL_CHAR_W = format === 'currency' ? 5.4 : 5.8;
      const LABEL_H = 11;
      const LABEL_GAP = 3;

      type PointLabel = { text: string; x: number; y: number; w: number; show: boolean };

      const overlaps = (a: PointLabel, b: PointLabel): boolean => {
        const a0 = a.x - a.w / 2;
        const a1 = a.x + a.w / 2;
        const b0 = b.x - b.w / 2;
        const b1 = b.x + b.w / 2;
        if (a1 + LABEL_GAP < b0 || b1 + LABEL_GAP < a0) return false;
        return Math.abs(a.y - b.y) < LABEL_H + LABEL_GAP;
      };

      const pointLabels: PointLabel[] = [];
      chartData.forEach((d, i) => {
        if (d.value <= 0) return;
        const text = formatPointLabel(d.value);
        const x = xScale(i);
        const baseY = yScale(d.value);
        const w = Math.max(24, text.length * LABEL_CHAR_W);
        const candidates = [baseY - 10, baseY + 14, baseY - 22, baseY + 26].filter(
          (y) => y >= LABEL_H / 2 && y <= chartHeight - LABEL_H / 2
        );
        const label: PointLabel = { text, x, y: candidates[0] ?? baseY - 10, w, show: false };
        for (const y of candidates) {
          label.y = y;
          if (!pointLabels.some((prev) => prev.show && overlaps(label, prev))) {
            label.show = true;
            break;
          }
        }
        pointLabels.push(label);
      });

      g.append('g')
        .selectAll('text')
        .data(pointLabels.filter((l) => l.show))
        .join('text')
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .attr('font-family', FONT_FAMILY_BASE)
        .attr('fill', lineColor)
        .attr('opacity', 0)
        .text((d) => d.text)
        .transition()
        .delay(600)
        .duration(400)
        .attr('opacity', 0.9);

      const focus = g.append('g').style('opacity', 0);
      focus
        .append('line')
        .attr('class', 'focus-line')
        .attr('y1', 0)
        .attr('y2', chartHeight)
        .attr('stroke', lineColor)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.35)
        .attr('stroke-dasharray', '3 3');
      const focusDot = focus
        .append('circle')
        .attr('r', 5)
        .attr('fill', lineColor)
        .attr('stroke', 'var(--bg-tertiary)')
        .attr('stroke-width', 2.5);

      const labelStep = Math.max(1, Math.ceil(chartData.length / Math.max(1, Math.floor(chartWidth / 42))));
      g.append('g')
        .attr('transform', `translate(0,${chartHeight + 6})`)
        .selectAll('text')
        .data(chartData)
        .join('text')
        .attr('x', (_, i) => xScale(i))
        .attr('y', 8)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '10px')
        .attr('font-family', FONT_FAMILY_BASE)
        .attr('fill', textColor)
        .attr('opacity', 0.8)
        .text((d, i) => (i % labelStep === 0 || i === chartData.length - 1 ? d.name : ''));

      const tooltip = createD3ChartTooltip(svg);
      const container = containerRef.current;
      if (!tooltip || !container) return;

      const overlay = g
        .append('rect')
        .attr('width', chartWidth)
        .attr('height', chartHeight)
        .attr('fill', 'transparent')
        .style('cursor', onPointClick ? 'pointer' : 'default');

      const nearestIndex = (clientX: number): number => {
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left - margin.left;
        let idx = 0;
        let best = Infinity;
        for (let i = 0; i < chartData.length; i++) {
          const dist = Math.abs(x - xScale(i));
          if (dist < best) {
            best = dist;
            idx = i;
          }
        }
        return idx;
      };

      overlay
        .on('mousemove', (event: MouseEvent) => {
          const i = nearestIndex(event.clientX);
          const point = chartData[i];
          const px = xScale(i);
          const py = yScale(point.value);
          focus.style('opacity', 1);
          focus.select('.focus-line').attr('x1', px).attr('x2', px);
          focusDot.attr('cx', px).attr('cy', py);
          tooltip.setLabelValue(point.name, formatValue(point.value));
          const { width: w, height: h } = tooltip.measure();
          const { tx, ty } = clampTooltipNearPoint(margin.left + px, margin.top + py, w, h, dimensions, 16);
          tooltip.group.attr('transform', `translate(${tx},${ty})`);
          tooltip.show();
        })
        .on('mouseleave', () => {
          focus.style('opacity', 0);
          tooltip.hide();
        })
        .on('click', (event: MouseEvent) => {
          if (!onPointClick) return;
          const i = nearestIndex(event.clientX);
          onPointClick(data[i], i);
        });
    }, [chartData, dimensions, format, onPointClick, data, formatValue, formatAxis, formatPointLabel, gradientId, lineColor]);

    if (!data || data.length === 0) {
      return <ChartEmptyState title={title} />;
    }

    return (
      <div className="chart-container">
        <ChartTitleWithInfo title={title} titleInfo={titleInfo} />
        <div
          ref={containerRef}
          className="line-chart-container"
        >
          <svg ref={svgRef} className="chart-svg-host" />
        </div>
      </div>
    );
  }
);

ResponsiveLineChart.displayName = 'ResponsiveLineChart';

export default ResponsiveLineChart;
