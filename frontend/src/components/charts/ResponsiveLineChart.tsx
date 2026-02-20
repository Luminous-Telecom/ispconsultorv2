import React, { useRef, useLayoutEffect, useEffect, useCallback, useMemo, memo, useState } from 'react';
import * as d3 from 'd3';
import { LineChartProps } from './types';
import { ChartEmptyState } from './ChartEmptyState';

const ResponsiveLineChart: React.FC<LineChartProps> = memo(({ data, title, format = 'number', onPointClick }) => {
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
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    const margin = { top: 24, right: 40, left: 52, bottom: 70 };
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

    const showValueLabel = (value: number) => {
      if (chartData.length <= 12) return true;
      return value > 0;
    };

    chartData.forEach((d, i) => {
      if (!showValueLabel(d.value)) return;

      const x = xScale(i);
      const y = yScale(Math.max(yMin, d.value));
      const isAbove = d.value >= avgValue;
      const nearBottom = y > chartHeight * 0.7;
      const dy = nearBottom ? -14 : isAbove ? -14 : 18;

      g.append('text')
        .attr('x', x)
        .attr('y', y + dy)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .attr('fill', 'var(--text-primary)')
        .text(formatLabel(d.value));
    });

    const xAxisG = g
      .append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .attr('class', 'x-axis');

    xAxisG
      .selectAll('.tick')
      .data(chartData)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', (_, i) => `translate(${xScale(i)},0)`)
      .each(function (d) {
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
      .attr('x', (_, i) => xScale(i) - 20)
      .attr('y', 0)
      .attr('width', 40)
      .attr('height', chartHeight)
      .attr('fill', 'transparent')
      .attr('cursor', onPointClick ? 'pointer' : 'default')
      .on('click', (event, d) => {
        const index = chartData.indexOf(d);
        if (onPointClick && index >= 0) {
          onPointClick(data[index], index);
        }
      });

    const tooltipFilterId = `tooltip-shadow-${Math.random().toString(36).slice(2)}`;
    defs.append('filter').attr('id', tooltipFilterId).attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%').append('feDropShadow').attr('dx', 0).attr('dy', 4).attr('stdDeviation', 6).attr('flood-opacity', 0.25);

    const tooltipG = d3.select(svg).append('g').attr('class', 'chart-tooltip').style('opacity', 0).style('pointer-events', 'none');
    const tooltipBg = tooltipG.append('rect').attr('rx', 6).attr('ry', 6).attr('fill', 'var(--bg-tertiary)').attr('stroke', 'var(--border-color)').attr('stroke-width', 1).attr('filter', `url(#${tooltipFilterId})`);

    const tooltipContent = tooltipG.append('g').attr('transform', 'translate(12,12)');
    tooltipContent.append('text').attr('class', 'tooltip-label').attr('font-family', 'system-ui, -apple-system, sans-serif').attr('font-size', '10px').attr('font-weight', '500').attr('fill', 'var(--text-muted)').attr('y', 0);
    tooltipContent.append('text').attr('class', 'tooltip-value').attr('font-family', 'system-ui, -apple-system, sans-serif').attr('font-size', '11px').attr('font-weight', '600').attr('fill', 'var(--text-primary)').attr('y', 16);

    const padding = { x: 16, y: 12 };
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
        tooltipG.transition().duration(120).ease(d3.easeCubicOut).style('opacity', 0);
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
      tooltipContent.select('.tooltip-label').text(point.name);
      tooltipContent.select('.tooltip-value').text(formatValue(point.value));
      const bbox = tooltipContent.node()?.getBBox();
      const w = bbox ? Math.max(bbox.width + padding.x, 100) : 120;
      const h = bbox ? bbox.height + padding.y : 42;
      tooltipBg.attr('width', w).attr('height', h).attr('x', 0).attr('y', 0);
      let tx = event.clientX - rect.left + 14;
      let ty = event.clientY - rect.top - 10;
      if (tx + w > dimensions.width) tx = dimensions.width - w - 8;
      if (tx < 8) tx = 8;
      if (ty < 8) ty = 8;
      if (ty + h > dimensions.height) ty = event.clientY - rect.top - h - 8;
      tooltipG.attr('transform', `translate(${tx},${ty})`);
      tooltipG.transition().duration(180).ease(d3.easeCubicOut).style('opacity', 1);
    }).on('mouseleave.tooltip', () => {
      tooltipG.transition().duration(150).ease(d3.easeCubicOut).style('opacity', 0);
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
      <h6 className="chart-title">{title}</h6>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '220px',
          minWidth: '160px',
          minHeight: '200px',
          position: 'relative',
          overflow: 'visible',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
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
