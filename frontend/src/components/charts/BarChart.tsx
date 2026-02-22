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
  const [dimensions, setDimensions] = useState<{ width: number }>({ width: 0 });

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
        setDimensions({ width: rect.width || 200 });
      }
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || dimensions.width === 0 || chartData.length === 0) return;

    d3.select(svg).selectAll('*').remove();

    const barHeight = 18;
    const barGap = 6;
    const totalRowHeight = barHeight + barGap;

    // margem esquerda dinâmica: mede o label mais longo
    const tempSvg = d3.select(svg);
    const testText = tempSvg.append('text')
      .attr('font-size', '10px')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('visibility', 'hidden');

    let maxLabelWidth = 0;
    chartData.forEach((d) => {
      testText.text(d.label);
      const w = (testText.node() as SVGTextElement)?.getBBox()?.width ?? 0;
      if (w > maxLabelWidth) maxLabelWidth = w;
    });
    testText.remove();

    const margin = {
      top: 8,
      right: 36,
      left: Math.min(Math.max(maxLabelWidth + 16, 80), dimensions.width * 0.45),
      bottom: 28,
    };

    const chartWidth = Math.max(0, dimensions.width - margin.left - margin.right);
    const maxValue = Math.max(...chartData.map((d) => d.value), 1);
    const barsHeight = chartData.length * totalRowHeight - barGap;
    const svgHeight = margin.top + barsHeight + margin.bottom;

    const xScale = d3.scaleLinear().domain([0, maxValue]).range([0, chartWidth]).nice();

    const g = d3
      .select(svg)
      .attr('width', dimensions.width)
      .attr('height', svgHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const textColor = 'var(--text-muted)';
    const gridColor = 'var(--border-color)';

    // Eixo X + linhas de grade verticais
    const xAxis = d3.axisBottom(xScale).ticks(5).tickSize(-barsHeight).tickFormat((d) => d.toLocaleString('pt-BR'));
    const xAxisG = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${barsHeight})`)
      .call(xAxis);
    xAxisG.select('.domain').attr('stroke', gridColor);
    xAxisG.selectAll('.tick line')
      .attr('stroke', gridColor)
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-opacity', 0.6);
    xAxisG.selectAll('.tick text')
      .attr('fill', textColor)
      .attr('font-size', '9px')
      .attr('font-family', 'system-ui, -apple-system, sans-serif');

    // Barras
    const barGroups = g
      .selectAll('.bar-group')
      .data(chartData)
      .join('g')
      .attr('class', 'bar-group');

    barGroups.each(function (d, i) {
      const y = i * totalRowHeight;
      const barWidth = Math.max(xScale(d.value), 2);
      const el = d3.select(this);

      el.append('rect')
        .attr('x', 0).attr('y', y)
        .attr('width', barWidth).attr('height', barHeight)
        .attr('rx', 3).attr('fill', d.color)
        .attr('cursor', onBarClick ? 'pointer' : 'default')
        .on('click', () => { if (onBarClick) onBarClick(d.raw, i); });

      // valor dentro/fora da barra
      const valueText = d.value.toLocaleString('pt-BR');
      const insideBar = barWidth > 32;
      el.append('text')
        .attr('x', insideBar ? barWidth - 5 : barWidth + 5)
        .attr('y', y + barHeight / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', insideBar ? 'end' : 'start')
        .attr('font-size', '10px').attr('font-weight', '700')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .attr('fill', insideBar ? '#fff' : 'var(--text-secondary)')
        .text(valueText);

      // label à esquerda (nome do plano)
      el.append('text')
        .attr('x', -8).attr('y', y + barHeight / 2)
        .attr('dy', '0.35em').attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .attr('fill', 'var(--text-primary)')
        .text(d.label);
    });

    // Tooltip
    const defs = d3.select(svg).append('defs');
    const tooltipFilterId = `tooltip-shadow-bar-${Math.random().toString(36).slice(2)}`;
    defs.append('filter').attr('id', tooltipFilterId)
      .attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%')
      .append('feDropShadow').attr('dx', 0).attr('dy', 4).attr('stdDeviation', 6).attr('flood-opacity', 0.25);

    const tooltipG = d3.select(svg).append('g').attr('class', 'chart-tooltip').style('opacity', 0).style('pointer-events', 'none');
    const tooltipBg = tooltipG.append('rect').attr('rx', 6).attr('ry', 6)
      .attr('fill', 'var(--bg-tertiary)').attr('stroke', 'var(--border-color)')
      .attr('stroke-width', 1).attr('filter', `url(#${tooltipFilterId})`);
    const tooltipContent = tooltipG.append('g').attr('transform', 'translate(12,12)');
    tooltipContent.append('text').attr('class', 'tooltip-label')
      .attr('font-family', 'system-ui, -apple-system, sans-serif').attr('font-size', '10px')
      .attr('font-weight', '500').attr('fill', 'var(--text-muted)').attr('y', 0);
    tooltipContent.append('text').attr('class', 'tooltip-value')
      .attr('font-family', 'system-ui, -apple-system, sans-serif').attr('font-size', '11px')
      .attr('font-weight', '600').attr('fill', 'var(--text-primary)').attr('y', 16);

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
        if (ty + h > svgHeight) ty = event.clientY - rect.top - h - 8;
        tooltipG.attr('transform', `translate(${tx},${ty})`);
        tooltipG.transition().duration(180).ease(d3.easeCubicOut).style('opacity', 1);
      })
      .on('mouseleave', () => {
        tooltipG.transition().duration(150).ease(d3.easeCubicOut).style('opacity', 0);
      });

    return () => { barGroups.on('mouseenter', null).on('mouseleave', null); };
  }, [chartData, dimensions, format, onBarClick, formatValue]);

  if (!data || data.length === 0 || chartData.length === 0) {
    return <ChartEmptyState title={title} />;
  }

  return (
    <div className="chart-container">
      <h6 className="chart-title">{title}</h6>
      <div
        ref={containerRef}
        style={{ width: '100%', minWidth: '140px', position: 'relative', overflow: 'visible' }}
      >
        <svg ref={svgRef} style={{ display: 'block', width: '100%', overflow: 'visible' }} />
      </div>
    </div>
  );
});

BarChart.displayName = 'BarChart';

export { BarChart };
