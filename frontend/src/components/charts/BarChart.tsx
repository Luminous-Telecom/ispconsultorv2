import React, { useRef, useLayoutEffect, useEffect, useCallback, useMemo, memo, useState } from 'react';
import * as d3 from 'd3';
import { ChartDataItem, ChartFormat } from './types';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartTitleWithInfo } from './ChartTitleWithInfo';
import { createD3ChartTooltip } from './chartTooltip';

interface BarChartProps {
  data: ChartDataItem[];
  title: string;
  titleInfo?: string;
  format?: ChartFormat;
  onBarClick?: (item: ChartDataItem, index: number) => void;
}

const CHART_COLORS = ['#6B9BD1', '#8FB369', '#E8B44C', '#D97373', '#9B7FD9', '#5DA6CC'];

const BarChart: React.FC<BarChartProps> = memo(({ data, title, titleInfo, format = 'number', onBarClick }) => {
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
    const tooltip = createD3ChartTooltip(svg, 'tooltip-shadow-bar');
    if (!tooltip) return;

    const container = containerRef.current;
    if (!container) return;

    barGroups
      .on('mouseenter', function (event, d) {
        if (!d) return;
        tooltip.setLabelValue(d.label, formatValue(d.value));
        const { width: w, height: h } = tooltip.measure();
        const rect = container.getBoundingClientRect();
        let tx = event.clientX - rect.left + 14;
        let ty = event.clientY - rect.top - 10;
        if (tx + w > dimensions.width) tx = dimensions.width - w - 8;
        if (tx < 8) tx = 8;
        if (ty < 8) ty = 8;
        if (ty + h > svgHeight) ty = event.clientY - rect.top - h - 8;
        tooltip.group.attr('transform', `translate(${tx},${ty})`);
        tooltip.show();
      })
      .on('mouseleave', () => {
        tooltip.hide();
      });

    return () => { barGroups.on('mouseenter', null).on('mouseleave', null); };
  }, [chartData, dimensions, format, onBarClick, formatValue]);

  if (!data || data.length === 0 || chartData.length === 0) {
    return <ChartEmptyState title={title} />;
  }

  return (
    <div className="chart-container">
      <ChartTitleWithInfo title={title} titleInfo={titleInfo} />
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
