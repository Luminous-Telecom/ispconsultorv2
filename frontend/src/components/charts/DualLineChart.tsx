import React, { useRef, useLayoutEffect, useEffect, useCallback, useMemo, memo, useState } from 'react';
import * as d3 from 'd3';
import { ChartDataItem, ChartFormat } from './types';
import { ChartEmptyState } from './ChartEmptyState';
import { useI18n } from '@/contexts/I18nContext';

interface DualChartDataItem extends ChartDataItem {
  receber: number;
  pagar: number;
}

export type DualLineChartLineType = 'receber' | 'pagar';

interface DualLineChartProps {
  data: DualChartDataItem[];
  title: string;
  format?: ChartFormat;
  onPointClick?: (item: DualChartDataItem, index: number, lineType: DualLineChartLineType) => void;
}

const DualLineChart: React.FC<DualLineChartProps> = memo(({ data, title, format = 'currency', onPointClick }) => {
  const { t } = useI18n();
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

  const chartData = useMemo(
    () =>
      data.map((item: DualChartDataItem) => ({
        name: formatDateLabel(item.mes || item.name || ''),
        receber: item.receber ?? 0,
        pagar: item.pagar ?? 0,
      })),
    [data, formatDateLabel]
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

    const margin = { top: 16, right: 20, left: 48, bottom: 58 };
    const chartWidth = dimensions.width - margin.left - margin.right;
    const chartHeight = dimensions.height - margin.top - margin.bottom;

    const allValues = chartData.flatMap((d) => [d.receber, d.pagar]);
    const maxValue = Math.max(...allValues, 0);
    const valueRange = maxValue || 1;

    const yAxisFormat = (v: number) =>
      format === 'currency' ? v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : v.toLocaleString('pt-BR');

    const xScale = d3
      .scaleLinear()
      .domain([0, chartData.length - 1])
      .range([0, chartWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue + valueRange * 0.1])
      .range([chartHeight, 0]);

    const lineGenerator = (key: 'receber' | 'pagar') =>
      d3
        .line<{ name: string; receber: number; pagar: number }>()
        .x((_, i) => xScale(i))
        .y((d) => yScale(Math.max(0, d[key])))
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

    const gradientReceberId = `line-gradient-receber-${Math.random().toString(36).slice(2)}`;
    const gradientReceber = defs
      .append('linearGradient')
      .attr('id', gradientReceberId)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', chartWidth)
      .attr('y2', 0);
    gradientReceber.append('stop').attr('offset', '0%').attr('stop-color', 'var(--chart-color-2)');
    gradientReceber.append('stop').attr('offset', '100%').attr('stop-color', 'var(--chart-color-7)');

    const receberPath = lineGenerator('receber')(chartData);
    if (receberPath) {
      g.append('path')
        .attr('d', receberPath)
        .attr('fill', 'none')
        .attr('stroke', `url(#${gradientReceberId})`)
        .attr('stroke-width', 4)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round');
    }

    const pagarPath = lineGenerator('pagar')(chartData);
    if (pagarPath) {
      g.append('path')
        .attr('d', pagarPath)
        .attr('fill', 'none')
        .attr('stroke', 'var(--chart-color-4)')
        .attr('stroke-width', 4)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round');
    }

    const pointsG = g.append('g').attr('class', 'line-points');
    chartData.forEach((d, i) => {
      const x = xScale(i);
      pointsG
        .append('circle')
        .attr('cx', x)
        .attr('cy', yScale(Math.max(0, d.receber)))
        .attr('r', 4)
        .attr('fill', 'var(--chart-color-2)')
        .attr('stroke', 'var(--bg-tertiary)')
        .attr('stroke-width', 2);
      pointsG
        .append('circle')
        .attr('cx', x)
        .attr('cy', yScale(Math.max(0, d.pagar)))
        .attr('r', 4)
        .attr('fill', 'var(--chart-color-4)')
        .attr('stroke', 'var(--bg-tertiary)')
        .attr('stroke-width', 2);
    });

    const avgReceber = chartData.reduce((a, d) => a + d.receber, 0) / chartData.length;
    const avgPagar = chartData.reduce((a, d) => a + d.pagar, 0) / chartData.length;

    const pixelsPerPoint = chartWidth / Math.max(chartData.length - 1, 1);
    const estimatedLabelWidth = format === 'currency' ? 68 : 48;
    const valueLabelStep = Math.max(1, Math.ceil(estimatedLabelWidth / pixelsPerPoint));

    chartData.forEach((d, i) => {
      if (i % valueLabelStep !== 0 && i !== chartData.length - 1) return;

      const x = xScale(i);

      const receberY = yScale(Math.max(0, d.receber));
      const receberNearBottom = receberY > chartHeight * 0.7;
      const receberDy = receberNearBottom ? -14 : d.receber >= avgReceber ? -14 : 16;
      g.append('text')
        .attr('x', x - 6)
        .attr('y', receberY + receberDy)
        .attr('text-anchor', 'end')
        .attr('dy', '0.35em')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .attr('fill', 'var(--chart-color-2)')
        .text(formatLabel(d.receber));

      const pagarY = yScale(Math.max(0, d.pagar));
      const pagarNearBottom = pagarY > chartHeight * 0.7;
      const pagarDy = pagarNearBottom ? -14 : d.pagar >= avgPagar ? -14 : 16;
      g.append('text')
        .attr('x', x + 6)
        .attr('y', pagarY + pagarDy)
        .attr('text-anchor', 'start')
        .attr('dy', '0.35em')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .attr('fill', 'var(--chart-color-4)')
        .text(formatLabel(d.pagar));
    });

    const xAxisG = g.append('g').attr('transform', `translate(0,${chartHeight})`).attr('class', 'x-axis');

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

    const clickG = g.append('g').attr('class', 'click-zones');
    clickG
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
          const point = chartData[index];
          const receberY = yScale(Math.max(0, point.receber));
          const pagarY = yScale(Math.max(0, point.pagar));
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const clickY = event.clientY - rect.top - margin.top;
            const lineType: DualLineChartLineType = Math.abs(clickY - receberY) <= Math.abs(clickY - pagarY) ? 'receber' : 'pagar';
            onPointClick(data[index], index, lineType);
          }
        }
      });

    const legendY = chartHeight + 47;
    const legendItemWidth = 100;
    const totalLegendWidth = legendItemWidth * 2;
    const startLegendX = chartWidth / 2 - totalLegendWidth / 2;

    g.append('line')
      .attr('x1', startLegendX)
      .attr('x2', startLegendX + 16)
      .attr('y1', legendY)
      .attr('y2', legendY)
      .attr('stroke', 'var(--chart-color-2)')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round');

    g.append('text')
      .attr('x', startLegendX + 22)
      .attr('y', legendY)
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('fill', textColor)
      .text(t('financial.toReceive').toUpperCase());

    g.append('line')
      .attr('x1', startLegendX + legendItemWidth)
      .attr('x2', startLegendX + legendItemWidth + 16)
      .attr('y1', legendY)
      .attr('y2', legendY)
      .attr('stroke', 'var(--chart-color-4)')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round');

    g.append('text')
      .attr('x', startLegendX + legendItemWidth + 22)
      .attr('y', legendY)
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('fill', textColor)
      .text(t('financial.toPayLabel').toUpperCase());

    const tooltipFilterId = `tooltip-shadow-dual-${Math.random().toString(36).slice(2)}`;
    defs.append('filter').attr('id', tooltipFilterId).attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%').append('feDropShadow').attr('dx', 0).attr('dy', 4).attr('stdDeviation', 6).attr('flood-opacity', 0.25);

    const tooltipG = d3.select(svg).append('g').attr('class', 'chart-tooltip').style('opacity', 0).style('pointer-events', 'none');
    const tooltipBg = tooltipG.append('rect').attr('rx', 6).attr('ry', 6).attr('fill', 'var(--bg-tertiary)').attr('stroke', 'var(--border-color)').attr('stroke-width', 1).attr('filter', `url(#${tooltipFilterId})`);

    const tooltipContent = tooltipG.append('g').attr('transform', 'translate(12,12)');
    tooltipContent.append('text').attr('class', 'tooltip-label').attr('font-family', 'system-ui, -apple-system, sans-serif').attr('font-size', '10px').attr('font-weight', '500').attr('fill', 'var(--text-muted)').attr('y', 0);
    const receberRow = tooltipContent.append('g').attr('transform', 'translate(0,14)');
    receberRow.append('rect').attr('x', 0).attr('y', -5).attr('width', 6).attr('height', 6).attr('rx', 1).attr('fill', 'var(--chart-color-2)');
    receberRow.append('text').attr('class', 'tooltip-receber').attr('font-family', 'system-ui, -apple-system, sans-serif').attr('font-size', '10px').attr('font-weight', '600').attr('fill', 'var(--text-primary)').attr('x', 12).attr('y', 0);
    const pagarRow = tooltipContent.append('g').attr('transform', 'translate(0,28)');
    pagarRow.append('rect').attr('x', 0).attr('y', -5).attr('width', 6).attr('height', 6).attr('rx', 1).attr('fill', 'var(--chart-color-4)');
    pagarRow.append('text').attr('class', 'tooltip-pagar').attr('font-family', 'system-ui, -apple-system, sans-serif').attr('font-size', '10px').attr('font-weight', '600').attr('fill', 'var(--text-primary)').attr('x', 12).attr('y', 0);

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
      pointsG.selectAll('circle').each(function (_, i) {
        const idx = Math.floor(i / 2);
        const r = idx === closestIndex ? 6 : 4;
        d3.select(this).transition().duration(120).ease(d3.easeCubicOut).attr('r', r);
      });
      const point = chartData[closestIndex];
      tooltipContent.select('.tooltip-label').text(point.name);
      tooltipContent.select('.tooltip-receber').text(`${t('financial.receive')}: ${formatValue(point.receber)}`);
      tooltipContent.select('.tooltip-pagar').text(`${t('financial.pay')}: ${formatValue(point.pagar)}`);
      const bbox = tooltipContent.node()?.getBBox();
      const w = bbox ? Math.max(bbox.width + padding.x, 130) : 150;
      const h = bbox ? bbox.height + padding.y : 60;
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
  }, [chartData, dimensions, format, formatLabel, onPointClick, data, t, formatValue]);

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

DualLineChart.displayName = 'DualLineChart';

export default DualLineChart;
