/**
 * DonutChart - Gráfico de rosca interativo com D3.js
 *
 * Requisitos atendidos:
 * - Proporcionalidade exata: d3.pie() calcula ângulos proporcionalmente ao value
 * - Interface ChartData: { name, value, color? }
 * - d3.pie() + d3.arc() com innerRadius e outerRadius
 * - padAngle para espaçamento entre fatias
 * - cornerRadius para bordas arredondadas
 * - Labels externos com linhas conectoras
 * - Tooltip no hover
 * - Responsivo com viewBox
 * - Fundo escuro, texto claro
 */

import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import * as d3 from 'd3';

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: ChartData[];
  width?: number;
  height?: number;
  innerRadiusRatio?: number;
  padAngleDegrees?: number;
  showLabels?: boolean;
  showTooltip?: boolean;
}

const DEFAULT_COLORS = [
  '#4facfe',
  '#00f2fe',
  '#ffb3ba',
  '#baffc9',
  '#bae1ff',
  '#f7d3d3',
  '#ffeaa7',
  '#d3f7f3',
  '#a29bfe',
  '#fd79a8'
];

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  width = 400,
  height = 350,
  innerRadiusRatio = 0.45,
  padAngleDegrees = 4,
  showLabels = true,
  showTooltip = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  useLayoutEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      }
    };
    update();
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const filteredData = data.filter((d) => (d.value ?? 0) > 0);
    if (filteredData.length === 0) return;

    const total = filteredData.reduce((sum, d) => sum + (d.value ?? 0), 0);
    if (total <= 0) return;

    const { width: w, height: h } = dimensions;
    const padding = 24;
    const centerX = w / 2;
    const centerY = h / 2;
    const minDim = Math.min(w, h) - padding * 2;
    const outerRadius = minDim / 2 - 16;
    const innerRadius = outerRadius * innerRadiusRatio;
    const padAngle = (padAngleDegrees * Math.PI) / 180;
    const labelDistance = outerRadius + 28;

    const pieData = filteredData.map((d, i) => ({
      ...d,
      color: d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      percent: total > 0 ? (d.value / total) * 100 : 0
    }));

    /* d3.pie() - Calcula ângulos de cada fatia proporcionalmente ao value.
       O ângulo de cada fatia = (value / sum(values)) * 2π */
    const pie = d3
      .pie<typeof pieData[0]>()
      .value((d) => d.value)
      .sort(null)
      .padAngle(padAngle)
      .startAngle(-Math.PI / 2);

    const arcs = pie(pieData);

    /* d3.arc() - Gera o path SVG para cada fatia do donut.
       innerRadius e outerRadius formam o "buraco" central. */
    const arc = d3
      .arc<d3.PieArcDatum<typeof pieData[0]>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(Math.min(6, (outerRadius - innerRadius) * 0.25));

    const arcLabel = d3
      .arc<d3.PieArcDatum<typeof pieData[0]>>()
      .innerRadius(innerRadius + (outerRadius - innerRadius) * 0.5)
      .outerRadius(innerRadius + (outerRadius - innerRadius) * 0.5);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', w).attr('height', h).attr('viewBox', `0 0 ${w} ${h}`);

    const g = svg.append('g').attr('transform', `translate(${centerX},${centerY})`);

    const linesG = g.append('g').attr('class', 'donut-lines');
    const slicesG = g.append('g').attr('class', 'donut-slices');
    const labelsG = svg.append('g').attr('class', 'donut-labels');

    arcs.forEach((d) => {
      const midAngle = (d.startAngle + d.endAngle) / 2;

      const path = slicesG
        .append('path')
        .attr('d', arc(d) ?? '')
        .attr('fill', d.data.color)
        .attr('stroke', 'rgba(0,0,0,0.2)')
        .attr('stroke-width', 0.5)
        .style('cursor', 'pointer')
        .style('transition', 'opacity 0.2s');

      if (showTooltip && tooltipRef.current) {
        path
          .on('mouseenter', function () {
            d3.select(this).style('opacity', 0.9);
            const tooltip = tooltipRef.current!;
            tooltip.textContent = `${d.data.name}: ${d.data.value.toLocaleString('pt-BR')} (${d.data.percent.toFixed(1)}%)`;
            tooltip.style.opacity = '1';
            tooltip.style.visibility = 'visible';
          })
          .on('mousemove', function (event: unknown) {
            const e = event as MouseEvent;
            if (tooltipRef.current && e.clientX != null) {
              tooltipRef.current.style.left = `${e.clientX + 10}px`;
              tooltipRef.current.style.top = `${e.clientY + 10}px`;
            }
          })
          .on('mouseleave', function () {
            d3.select(this).style('opacity', 1);
            if (tooltipRef.current) {
              tooltipRef.current.style.opacity = '0';
              tooltipRef.current.style.visibility = 'hidden';
            }
          });
      }

      if (d.data.percent >= 5) {
        const [cx, cy] = arcLabel.centroid(d);
        slicesG
          .append('text')
          .attr('transform', `translate(${cx},${cy})`)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .style('fill', '#ffffff')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .text(`${d.data.percent.toFixed(0)}%`);
      }

      if (showLabels) {
        const lineStart = arc.centroid(d);
        const lineEndX = labelDistance * Math.cos(midAngle);
        const lineEndY = labelDistance * Math.sin(midAngle);

        linesG
          .append('line')
          .attr('x1', lineStart[0])
          .attr('y1', lineStart[1])
          .attr('x2', lineEndX)
          .attr('y2', lineEndY)
          .attr('stroke', d.data.color)
          .attr('stroke-width', 1)
          .attr('stroke-linecap', 'round');

        const labelX = centerX + lineEndX;
        const labelY = centerY + lineEndY;
        const anchor = Math.cos(midAngle) >= 0 ? 'start' : 'end';
        const dx = Math.cos(midAngle) >= 0 ? 8 : -8;

        labelsG
          .append('g')
          .attr('transform', `translate(${labelX},${labelY})`)
          .append('text')
          .attr('text-anchor', anchor)
          .attr('dx', dx)
          .attr('dy', 4)
          .style('fill', 'rgba(255,255,255,0.95)')
          .style('font-size', '12px')
          .style('font-weight', '500')
          .text(`${d.data.name} ${d.data.percent.toFixed(1)}%`);
      }
    });
  }, [data, dimensions, innerRadiusRatio, padAngleDegrees, showLabels, showTooltip]);

  if (!data || data.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1d23',
          borderRadius: 8
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Sem dados</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 200,
        background: '#1a1d23',
        borderRadius: 8
      }}
    >
      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {showTooltip && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            fontSize: 13,
            borderRadius: 6,
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0,
            visibility: 'hidden',
            transition: 'opacity 0.15s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        />
      )}
    </div>
  );
};

export default DonutChart;
