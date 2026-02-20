import React, { useRef, useLayoutEffect, useEffect, useCallback, useMemo, memo, useState } from 'react';
import * as d3 from 'd3';
import { ChartDataItem, ChartFormat } from './types';
import { ChartEmptyState } from './ChartEmptyState';

interface BarChartProps {
  data: ChartDataItem[];
  title: string;
  format?: ChartFormat;
  onBarClick?: (item: ChartDataItem, index: number) => void;
}

const CHART_COLORS = ['#6B9BD1', '#8FB369', '#E8B44C', '#D97373', '#9B7FD9', '#5DA6CC'];

const BarChart: React.FC<BarChartProps> = memo(({ data, title, format = 'number', onBarClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const chartData = useMemo(
    () =>
      data
        .map((item, index) => ({
          label: item.label || item.name || '',
          value: item.value ?? item.valor ?? 0,
          color: item.color || CHART_COLORS[index % CHART_COLORS.length],
          raw: item,
        }))
        .filter((d) => d.value > 0),
    [data]
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

    const isMobile = dimensions.width < 480;
    const margin = {
      top: 16,
      right: isMobile ? 16 : 40,
      left: isMobile ? Math.min(100, dimensions.width * 0.45) : 220,
      bottom: 24,
    };
    const chartWidth = Math.max(0, dimensions.width - margin.left - margin.right);

    const maxValue = Math.max(...chartData.map((d) => d.value), 0) || 1;
    const xScale = d3.scaleLinear().domain([0, maxValue * 1.1]).range([0, chartWidth]);

    const barHeight = 20;
    const barGap = 10;
    const totalRowHeight = barHeight + barGap;

    const g = d3
      .select(svg)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const barGroups = g
      .selectAll('.bar-group')
      .data(chartData)
      .join('g')
      .attr('class', 'bar-group');

    barGroups.each(function (d, i) {
      const y = i * totalRowHeight;
      const barWidth = Math.max(xScale(d.value), 0);
      const el = d3.select(this);

      el.append('rect')
        .attr('x', 0)
        .attr('y', y)
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', d.color)
        .attr('cursor', onBarClick ? 'pointer' : 'default')
        .on('click', () => {
          if (onBarClick) onBarClick(d.raw, i);
        });

      el.append('text')
        .attr('x', barWidth > 40 ? barWidth - 8 : barWidth + 8)
        .attr('y', y + barHeight / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', barWidth > 40 ? 'end' : 'start')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .attr('fill', barWidth > 40 ? '#fff' : 'var(--text-primary)')
        .text(d.value.toLocaleString('pt-BR'));

      const labelText = isMobile && d.label.length > 12 ? `${d.label.slice(0, 10)}…` : d.label;
      el.append('text')
        .attr('x', -12)
        .attr('y', y + barHeight / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('font-size', isMobile ? '9px' : '11px')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .attr('fill', 'var(--text-primary)')
        .text(labelText);
    });

    const defs = d3.select(svg).append('defs');
    const tooltipFilterId = `tooltip-shadow-bar-${Math.random().toString(36).slice(2)}`;
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

    const tooltipG = d3
      .select(svg)
      .append('g')
      .attr('class', 'chart-tooltip')
      .style('opacity', 0)
      .style('pointer-events', 'none');
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
    const container = containerRef.current;
    if (!container) return;

    barGroups
      .on('mouseenter', function (event, d) {
        if (!d) return;
        tooltipContent.select('.tooltip-label').text(d.label);
        tooltipContent.select('.tooltip-value').text(formatValue(d.value));
        const bbox = tooltipContent.node()?.getBBox();
        const w = bbox ? Math.max(bbox.width + padding.x, 100) : 120;
        const h = bbox ? bbox.height + padding.y : 42;
        tooltipBg.attr('width', w).attr('height', h).attr('x', 0).attr('y', 0);
        const rect = container.getBoundingClientRect();
        let tx = event.clientX - rect.left + 14;
        let ty = event.clientY - rect.top - 10;
        if (tx + w > dimensions.width) tx = dimensions.width - w - 8;
        if (tx < 8) tx = 8;
        if (ty < 8) ty = 8;
        if (ty + h > dimensions.height) ty = event.clientY - rect.top - h - 8;
        tooltipG.attr('transform', `translate(${tx},${ty})`);
        tooltipG.transition().duration(180).ease(d3.easeCubicOut).style('opacity', 1);
      })
      .on('mouseleave', () => {
        tooltipG.transition().duration(150).ease(d3.easeCubicOut).style('opacity', 0);
      });

    return () => {
      barGroups.on('mouseenter', null).on('mouseleave', null);
    };
  }, [chartData, dimensions, format, onBarClick, formatValue]);

  if (!data || data.length === 0 || chartData.length === 0) {
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
          minWidth: '140px',
          minHeight: '180px',
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

BarChart.displayName = 'BarChart';

export { BarChart };
