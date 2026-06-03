import React, { useRef, useLayoutEffect, useEffect, useCallback, useMemo, memo, useState } from 'react';
import * as d3 from 'd3';
import { LineChartProps } from './types';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartTitleWithInfo } from './ChartTitleWithInfo';
import { clampTooltipNearPoint, createD3ChartTooltip } from './chartTooltip';

const ResponsiveLineChart: React.FC<LineChartProps> = memo(({ data, title, titleInfo, format = 'number', onPointClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
    (value: number) => {
      if (format === 'currency') {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
      }
      return value.toLocaleString('pt-BR');
    },
    [format]
  );

  const formatLabel = useCallback(
    (value: number) => {
      if (format === 'currency') {
        const hasCents = value % 1 !== 0;
        return value.toLocaleString('pt-BR', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 });
      }
      return value.toLocaleString('pt-BR');
    },
    [format]
  );

  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || 160,
          height: rect.height || 220,
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || dimensions.width === 0 || dimensions.height === 0 || chartData.length === 0) return;

    d3.select(svg).selectAll('*').remove();

    const margin = { top: 16, right: 20, left: 48, bottom: 50 };
    const chartWidth = dimensions.width - margin.left - margin.right;
    const chartHeight = dimensions.height - margin.top - margin.bottom;

    const values = chartData.map((d) => d.value);
    const maxValue = Math.max(...values, 0);
    const minValue = Math.min(...values, 0);
    const valueRange = maxValue - minValue || 1;

    const yAxisFormat = (v: number) =>
      format === 'currency' ? v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : v.toLocaleString('pt-BR');

    const xScale = d3
      .scaleLinear()
      .domain([0, chartData.length - 1])
      .range([0, chartWidth]);

    const yMin = Math.max(0, minValue - valueRange * 0.05);
    const yScale = d3
      .scaleLinear()
      .domain([yMin, maxValue + valueRange * 0.1])
      .range([chartHeight, 0]);

    const lineGenerator = d3
      .line<{ name: string; value: number }>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(Math.max(yMin, d.value)))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const g = d3.select(svg).attr('width', dimensions.width).attr('height', dimensions.height).append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const textColor = 'var(--text-muted)';
    const gridColor = 'var(--border-color)';

    const yAxisTicks = yScale.ticks(5).filter((t) => t >= 0);
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(yAxisTicks.length > 0 ? yAxisTicks : [0])
      .tickFormat((d) => yAxisFormat(Number(d)));
    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('fill', textColor);
    g.select('.y-axis .domain').attr('stroke', 'none');
    g.selectAll('.y-axis .tick line').attr('stroke', gridColor).attr('x2', chartWidth);

    chartData.forEach((_, i) => {
      const x = xScale(i);
      g.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 0)
        .attr('y2', chartHeight)
        .attr('stroke', gridColor)
        .attr('stroke-width', 1);
    });

    const defs = d3.select(svg).append('defs');
    const gradientId = `line-gradient-${svgRef.current?.id || Math.random().toString(36).slice(2)}`;
    const gradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', chartWidth)
      .attr('y2', 0);
    gradient.append('stop').attr('offset', '0%').attr('stop-color', 'var(--chart-color-1)');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', 'var(--chart-color-6)');

    const linePath = lineGenerator(chartData);
    if (linePath) {
      g.append('path')
        .attr('d', linePath)
        .attr('fill', 'none')
        .attr('stroke', `url(#${gradientId})`)
        .attr('stroke-width', 4)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round');
    }

    const pointsG = g.append('g').attr('class', 'line-points');
    chartData.forEach((d, i) => {
      const x = xScale(i);
      const y = yScale(Math.max(yMin, d.value));
      pointsG
        .append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 4)
        .attr('fill', 'var(--chart-color-1)')
        .attr('stroke', 'var(--bg-tertiary)')
        .attr('stroke-width', 2);
    });

    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
    const badgeH = 16;
    const padX = 5;

    chartData.forEach((d, i) => {
      if (d.value === 0) return;

      const px = xScale(i);
      const py = yScale(Math.max(yMin, d.value));
      const isAbove = d.value >= avgValue;
      const nearBottom = py > chartHeight * 0.7;
      const rawDy = nearBottom ? -(badgeH / 2 + 6) : isAbove ? -(badgeH / 2 + 6) : (badgeH / 2 + 6);

      const badgeG = g.append('g');
      const textEl = badgeG
        .append('text')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .attr('fill', 'var(--chart-color-1)')
        .attr('dominant-baseline', 'central')
        .attr('text-anchor', 'middle')
        .text(formatLabel(d.value));

      const bbox = (textEl.node() as SVGTextElement)?.getBBox();
      const badgeW = (bbox?.width ?? 24) + padX * 2;
      const bx = Math.max(badgeW / 2, Math.min(chartWidth - badgeW / 2, px));
      const by = Math.max(badgeH / 2 + 2, Math.min(chartHeight - badgeH / 2 - 2, py + rawDy));

      badgeG.attr('transform', `translate(${bx},${by})`);
      badgeG.insert('rect', 'text')
        .attr('x', -badgeW / 2).attr('y', -badgeH / 2)
        .attr('width', badgeW).attr('height', badgeH)
        .attr('rx', 3)
        .attr('fill', 'var(--bg-secondary)')
        .attr('stroke', 'var(--chart-color-1)')
        .attr('stroke-width', 1);
    });

    const xAxisG = g
      .append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .attr('class', 'x-axis');

    const labelStep = Math.max(1, Math.ceil(chartData.length / Math.floor(chartWidth / 38)));

    xAxisG
      .selectAll('.tick')
      .data(chartData)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', (_, i) => `translate(${xScale(i)},0)`)
      .each(function (d, i) {
        if (i % labelStep !== 0 && i !== chartData.length - 1) return;
        d3.select(this)
          .append('text')
          .attr('x', 0)
          .attr('y', 28)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', '11px')
          .attr('font-family', 'system-ui, -apple-system, sans-serif')
          .attr('fill', textColor)
          .attr('transform', 'rotate(-45, 0, 28)')
          .text(d.name);
      });

    g.append('g')
      .attr('class', 'click-zones')
      .selectAll('rect')
      .data(chartData)
      .join('rect')
      .attr('x', (_, i) => (i > 0 ? (xScale(i - 1) + xScale(i)) / 2 : 0))
      .attr('y', 0)
      .attr('width', (_, i) => {
        const x0 = i > 0 ? (xScale(i - 1) + xScale(i)) / 2 : 0;
        const x1 = i < chartData.length - 1 ? (xScale(i) + xScale(i + 1)) / 2 : chartWidth;
        return x1 - x0;
      })
      .attr('height', chartHeight)
      .attr('fill', 'transparent')
      .attr('cursor', onPointClick ? 'pointer' : 'default')
      .on('click', (event, d) => {
        const index = chartData.indexOf(d);
        if (onPointClick && index >= 0) {
          onPointClick(data[index], index);
        }
      });

    const tooltip = createD3ChartTooltip(svg);
    if (!tooltip) return;

    const container = containerRef.current;
    if (!container) return;
    d3.select(container).on('mousemove.tooltip', function (event: MouseEvent) {
      if (chartData.length === 0) return;
      const rect = container.getBoundingClientRect();
      if (!rect) return;
      const x = event.clientX - rect.left - margin.left;
      let closestIndex = 0;
      let minDistance = Infinity;
      for (let i = 0; i < chartData.length; i++) {
        const pointX = xScale(i);
        if (Math.abs(x - pointX) < minDistance) {
          minDistance = Math.abs(x - pointX);
          closestIndex = i;
        }
      }
      if (minDistance >= 40) {
        tooltip.hide();
        pointsG
          .selectAll('circle')
          .transition()
          .duration(120)
          .ease(d3.easeCubicOut)
          .attr('r', 4);
        return;
      }
      pointsG
        .selectAll('circle')
        .transition()
        .duration(120)
        .ease(d3.easeCubicOut)
        .attr('r', (_, i) => (i === closestIndex ? 6 : 4));
      const point = chartData[closestIndex];
      tooltip.setLabelValue(point.name, formatValue(point.value));
      const { width: w, height: h } = tooltip.measure();
      const pointX = margin.left + xScale(closestIndex);
      const pointY = margin.top + yScale(Math.max(yMin, point.value));
      const { tx, ty } = clampTooltipNearPoint(pointX, pointY, w, h, dimensions, 16);
      tooltip.group.attr('transform', `translate(${tx},${ty})`);
      tooltip.show();
    }).on('mouseleave.tooltip', () => {
      tooltip.hide();
      pointsG
        .selectAll('circle')
        .transition()
        .duration(120)
        .ease(d3.easeCubicOut)
        .attr('r', 4);
    });

    return () => {
      d3.select(container).on('mousemove.tooltip', null).on('mouseleave.tooltip', null);
    };
  }, [chartData, dimensions, format, onPointClick, data, formatLabel, formatValue]);

  if (!data || data.length === 0) {
    return <ChartEmptyState title={title} />;
  }

  return (
    <div className="chart-container">
      <ChartTitleWithInfo title={title} titleInfo={titleInfo} />
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '180px',
          minWidth: '160px',
          minHeight: '160px',
          position: 'relative',
          overflow: 'visible',
          alignSelf: 'stretch',
        }}
      >
        <svg
          ref={svgRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
        />
      </div>
    </div>
  );
});

ResponsiveLineChart.displayName = 'ResponsiveLineChart';

export default ResponsiveLineChart;
