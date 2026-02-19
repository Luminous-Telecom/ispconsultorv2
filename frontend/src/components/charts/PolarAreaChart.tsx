/**
 * PolarAreaChart - Gráfico de área polar (estilo Coxcomb/Rose) com D3.js
 *
 * Especificações:
 * - Ângulos iguais (360° / n) ou proporcionais
 * - Raio dinâmico proporcional ao value (d3.scaleSqrt)
 * - Bordas arredondadas, padAngle, paleta vibrante
 * - Tema dark (#0b0e14)
 * - Polylines conectando fatias a labels externos
 * - Label: Nome (porcentagem%) e valor em GB
 */

import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import * as d3 from 'd3';

export interface NetworkData {
  label: string;
  value: number;
  percentage: number;
}

interface PolarAreaChartProps {
  data: NetworkData[];
  /** true = ângulos iguais, false = ângulos proporcionais ao value */
  equalAngles?: boolean;
  /** Escala do raio: 'linear' ou 'sqrt' (sqrt suaviza valores extremos) */
  radiusScale?: 'linear' | 'sqrt';
  innerRadiusRatio?: number;
  padAngleDegrees?: number;
  showLabels?: boolean;
}

const DEFAULT_COLORS = [
  '#4facfe',
  '#00f2fe',
  '#ff6b6b',
  '#51cf66',
  '#ffd43b',
  '#cc5de8',
  '#69db7c',
  '#ff922b',
  '#748ffc',
  '#38d9a9'
];

export const PolarAreaChart: React.FC<PolarAreaChartProps> = ({
  data,
  equalAngles = true,
  radiusScale = 'sqrt',
  innerRadiusRatio = 0.1,
  padAngleDegrees = 2,
  showLabels = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 450 });

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

    const filteredData = data.filter((d) => (d.value ?? 0) >= 0);
    if (filteredData.length === 0) return;

    const maxValue = Math.max(...filteredData.map((d) => d.value), 1);

    const { width: w, height: h } = dimensions;
    const padding = 40;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) / 2 - padding;
    const padAngle = (padAngleDegrees * Math.PI) / 180;

    const radiusScaleFn =
      radiusScale === 'sqrt'
        ? d3.scaleSqrt().domain([0, maxValue]).range([0, maxRadius])
        : d3.scaleLinear().domain([0, maxValue]).range([0, maxRadius]);

    const pieData = filteredData.map((d, i) => ({
      ...d,
      color: DEFAULT_COLORS[i % DEFAULT_COLORS.length]
    }));

    const pie = d3
      .pie<typeof pieData[0]>()
      .value(equalAngles ? () => 1 : (d) => d.value)
      .sort(null)
      .padAngle(padAngle)
      .startAngle(-Math.PI / 2);

    const arcs = pie(pieData);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', w).attr('height', h).attr('viewBox', `0 0 ${w} ${h}`);

    const g = svg.append('g').attr('transform', `translate(${centerX},${centerY})`);

    const linesG = g.append('g').attr('class', 'polar-lines');
    const slicesG = g.append('g').attr('class', 'polar-slices');
    const labelsG = svg.append('g').attr('class', 'polar-labels');

    arcs.forEach((d) => {
      const midAngle = (d.startAngle + d.endAngle) / 2;
      const outerR = radiusScaleFn(d.data.value);
      const innerR = outerR * innerRadiusRatio;

      const arcGen = d3
        .arc<d3.PieArcDatum<typeof pieData[0]>>()
        .innerRadius(innerR)
        .outerRadius(outerR)
        .cornerRadius(Math.min(8, (outerR - innerR) * 0.4))
        .startAngle(d.startAngle)
        .endAngle(d.endAngle);

      slicesG
        .append('path')
        .attr('d', arcGen(d) ?? '')
        .attr('fill', d.data.color)
        .attr('stroke', 'rgba(0,0,0,0.25)')
        .attr('stroke-width', 0.5)
        .style('cursor', 'pointer');

      if (showLabels && outerR > 10) {
        const labelDist = maxRadius + 50;
        const lineEndX = labelDist * Math.cos(midAngle);
        const lineEndY = labelDist * Math.sin(midAngle);
        const lineStart = arcGen.centroid(d);

        const polylinePoints = [
          [lineStart[0], lineStart[1]],
          [lineStart[0] + (lineEndX - lineStart[0]) * 0.5, lineStart[1] + (lineEndY - lineStart[1]) * 0.5],
          [lineEndX, lineEndY]
        ];

        linesG
          .append('polyline')
          .attr('points', polylinePoints.map((p) => p.join(',')).join(' '))
          .attr('fill', 'none')
          .attr('stroke', d.data.color)
          .attr('stroke-width', 1)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round');

        const labelX = centerX + lineEndX;
        const labelY = centerY + lineEndY;
        const anchor = Math.cos(midAngle) >= 0 ? 'start' : 'end';
        const dx = Math.cos(midAngle) >= 0 ? 10 : -10;

        const labelG = labelsG
          .append('g')
          .attr('transform', `translate(${labelX},${labelY})`);

        labelG
          .append('text')
          .attr('text-anchor', anchor)
          .attr('dx', dx)
          .attr('dy', -4)
          .style('fill', 'rgba(255,255,255,0.95)')
          .style('font-size', '13px')
          .style('font-weight', '600')
          .text(d.data.label);

        labelG
          .append('text')
          .attr('text-anchor', anchor)
          .attr('dx', dx)
          .attr('dy', 12)
          .style('fill', 'rgba(255,255,255,0.75)')
          .style('font-size', '11px')
          .text(`${d.data.value.toFixed(2)} GB (${d.data.percentage.toFixed(2)}%)`);
      }
    });
  }, [data, dimensions, equalAngles, radiusScale, innerRadiusRatio, padAngleDegrees, showLabels]);

  if (!data || data.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0e14',
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
        minHeight: 300,
        background: '#0b0e14',
        borderRadius: 8
      }}
    >
      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};

export default PolarAreaChart;
