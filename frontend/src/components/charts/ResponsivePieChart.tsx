import React, { useRef, useEffect, useMemo, memo, useState, useLayoutEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { PieChartProps } from './types';
import { ChartDataItem } from './types';

const formatPieValue = (value: number, title: string): string | number => {
  if (title === 'Taxa de Pagamento') {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString('pt-BR');
};

const getItemValue = (item: ChartDataItem): number =>
  Number(item.value ?? item.valor ?? 0) || 0;

interface PieDatum {
  index: number;
  label: string;
  value: number;
  color: string;
  percent: number;
  data: ChartDataItem;
}

const HOVER_SCALE = 1.12;
const LABEL_DISTANCE_BASE = 42;
const LABEL_STAGGER = 18;
const RADIUS_MIN_RATIO = 0.7;
const RADIUS_MAX_RATIO = 1;
const HIDE_ANIMATION_MS = 400;

const ResponsivePieChart: React.FC<PieChartProps> = memo(({ data, title, hiddenItems, onToggleItem, onSliceClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 200, height: 150 });
  const [animatingOut, setAnimatingOut] = useState<Set<number>>(new Set());
  const [animatingIn, setAnimatingIn] = useState<Set<number>>(new Set());
  const onToggleItemRef = useRef(onToggleItem);
  onToggleItemRef.current = onToggleItem;

  const handleToggleItem = useCallback(
    (index: number) => {
      if (hiddenItems.has(index)) {
        setAnimatingIn((prev) => new Set(Array.from(prev).concat(index)));
        onToggleItem(index);
      } else {
        setAnimatingOut((prev) => new Set(Array.from(prev).concat(index)));
      }
    },
    [hiddenItems, onToggleItem]
  );

  useLayoutEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const w = rect.width || 200;
        const h = rect.height || 150;
        if (w > 0 && h > 0) setDimensions({ width: w, height: h });
      }
    };
    update();
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const visibleData = useMemo(
    () =>
      data && data.length > 0
        ? data
            .map((item, index) => ({ item, index }))
            .filter(
              ({ item, index }) =>
                getItemValue(item) !== 0 &&
                (!hiddenItems.has(index) || animatingOut.has(index) || animatingIn.has(index))
            )
        : [],
    [data, hiddenItems, animatingOut, animatingIn]
  );

  const total = useMemo(
    () => visibleData.reduce((sum, { item }) => sum + getItemValue(item), 0),
    [visibleData]
  );

  const legendData = useMemo(
    () =>
      data && data.length > 0
        ? data
            .map((item, index) => ({ item, index, value: getItemValue(item) }))
            .filter(({ value }) => value !== 0)
            .sort((a, b) => b.value - a.value)
        : [],
    [data]
  );

  useEffect(() => {
    if (!svgRef.current) return;
    if (visibleData.length === 0 || total <= 0) {
      d3.select(svgRef.current).selectAll('*').remove();
      return;
    }

    const { width, height } = dimensions;
    const padding = 16;
    const centerX = width * 0.32;
    const centerY = height / 2;
    const minDim = Math.min(width, height) - padding * 2;
    const outerRadius = minDim / 2 - 20;
    const innerRadius = outerRadius * 0.45;
    const labelMargin = 40;
    const spaceRight = width - centerX - labelMargin;
    const maxLabelDistance = Math.max(outerRadius + 20, Math.min(outerRadius + 80, Math.max(0, spaceRight)));

    const pieData: PieDatum[] = visibleData.map(({ item, index }) => {
      const val = getItemValue(item);
      return {
        index,
        label: item.label || '',
        value: val,
        color: item.color || '#64748b',
        percent: total > 0 ? Math.round((val / total) * 100) : 0,
        data: item
      };
    });

    const getOuterRadius = (d: d3.PieArcDatum<PieDatum>) => {
      const ratio = RADIUS_MIN_RATIO + (d.data.percent / 100) * (RADIUS_MAX_RATIO - RADIUS_MIN_RATIO);
      return outerRadius * ratio;
    };

    const pie = d3
      .pie<PieDatum>()
      .value((d) => d.value)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .padAngle(0.07)
      .startAngle(-Math.PI / 2);

    const arc = d3
      .arc<d3.PieArcDatum<PieDatum>>()
      .innerRadius(innerRadius)
      .outerRadius(getOuterRadius)
      .cornerRadius(4);

    const arcs = pie(pieData);

    const arcsBySize = [...arcs].sort((a, b) => b.data.value - a.data.value);

    const arcsByAngle = [...arcs].sort((a, b) => {
      const midA = (a.startAngle + a.endAngle) / 2;
      const midB = (b.startAngle + b.endAngle) / 2;
      return midA - midB;
    });
    const angleOrderMap = new Map<number, number>();
    arcsByAngle.forEach((a, i) => angleOrderMap.set(a.data.index, i));

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${centerX},${centerY})`);

    const labelsG = svg.append('g').attr('class', 'pie-labels');
    const linesG = g.append('g').attr('class', 'pie-lines');
    const arcsG = g.append('g').attr('class', 'pie-arcs');

    const toPos = (angle: number, r: number) => ({
      x: r * Math.sin(angle),
      y: -r * Math.cos(angle)
    });

    arcs.forEach((d: d3.PieArcDatum<PieDatum>) => {
      const midAngle = (d.startAngle + d.endAngle) / 2;
      const order = angleOrderMap.get(d.data.index) ?? 0;
      const staggeredDistance = LABEL_DISTANCE_BASE + order * LABEL_STAGGER;
      const labelRadius = Math.min(
        Math.max(outerRadius + 12, staggeredDistance),
        maxLabelDistance
      );
      const midR = (innerRadius + getOuterRadius(d)) / 2;
      const start = toPos(midAngle, midR);
      const end = toPos(midAngle, labelRadius);

      const isLineAnimatingIn = animatingIn.has(d.data.index);
      linesG
        .append('line')
        .attr('data-index', d.data.index)
        .attr('x1', start.x)
        .attr('y1', start.y)
        .attr('x2', end.x)
        .attr('y2', end.y)
        .attr('stroke', d.data.color)
        .attr('stroke-width', 1)
        .attr('stroke-linecap', 'round')
        .style('opacity', isLineAnimatingIn ? 0 : 1);

      const labelX = centerX + end.x;
      const labelY = centerY + end.y;
      const anchor = end.x >= 0 ? 'start' : 'end';
      const dx = end.x >= 0 ? 8 : -8;

      const isLabelAnimatingIn = animatingIn.has(d.data.index);
      const labelGroup = labelsG
        .append('g')
        .attr('transform', `translate(${labelX},${labelY})`)
        .attr('class', 'pie-radial-label')
        .attr('data-index', d.data.index)
        .style('cursor', onSliceClick ? 'pointer' : 'default')
        .style('pointer-events', 'all')
        .style('opacity', isLabelAnimatingIn ? 0 : 1);

      if (onSliceClick) {
        labelGroup.attr('role', 'button').attr('tabindex', 0);
      }

      labelGroup
        .append('text')
        .attr('text-anchor', anchor)
        .attr('dominant-baseline', 'middle')
        .attr('dx', dx)
        .attr('dy', -6)
        .style('fill', 'var(--text-primary, #212529)')
        .style('font-size', '0.625rem')
        .style('font-weight', '400')
        .text(d.data.label);

      labelGroup
        .append('text')
        .attr('text-anchor', anchor)
        .attr('dominant-baseline', 'middle')
        .attr('dx', dx)
        .attr('dy', 6)
        .style('fill', 'var(--text-primary, #212529)')
        .style('font-size', '0.625rem')
        .style('opacity', 0.9)
        .text(`${formatPieValue(d.data.value, title)} (${d.data.percent}%)`);

      if (onSliceClick) {
        labelGroup
          .on('click', (e: Event) => {
            e.stopPropagation();
            onSliceClick(d.data.data, d.data.index);
          })
          .on('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSliceClick(d.data.data, d.data.index);
            }
          });
      }
    });

    arcsBySize.forEach((d: d3.PieArcDatum<PieDatum>) => {
      const sliceGroup = arcsG
        .append('g')
        .attr('class', 'pie-slice')
        .attr('data-index', d.data.index)
        .style('cursor', onSliceClick ? 'pointer' : 'default');

      const isAnimatingIn = animatingIn.has(d.data.index);
      const initialDatum = isAnimatingIn
        ? { ...d, endAngle: d.startAngle }
        : d;
      sliceGroup
        .append('path')
        .datum(d)
        .attr('d', arc(initialDatum) ?? '')
        .attr('fill', d.data.color);

      if (onSliceClick) {
        sliceGroup.on('click', () => onSliceClick(d.data.data, d.data.index));
      }

      sliceGroup
        .on('mouseenter', function () {
          d3.select(this).transition().duration(150).attr('transform', `scale(${HOVER_SCALE})`);
        })
        .on('mouseleave', function () {
          d3.select(this).transition().duration(150).attr('transform', 'scale(1)');
        });

      if (isAnimatingIn) {
        const idx = d.data.index;
        const endDatum = d;
        sliceGroup
          .select('path')
          .datum(endDatum)
          .transition()
          .duration(HIDE_ANIMATION_MS)
          .ease(d3.easeCubicInOut)
          .attrTween('d', function () {
            const interp = d3.interpolate(
              { ...endDatum, endAngle: endDatum.startAngle },
              endDatum
            );
            return (t: number) => arc(interp(t)) ?? '';
          })
          .on('end', () => {
            setAnimatingIn((prev) => {
              const next = new Set(prev);
              next.delete(idx);
              return next;
            });
          });
        linesG
          .select<SVGLineElement>(`line[data-index="${idx}"]`)
          .transition()
          .duration(HIDE_ANIMATION_MS)
          .ease(d3.easeCubicInOut)
          .style('opacity', 1);
        labelsG
          .select<SVGGElement>(`g.pie-radial-label[data-index="${idx}"]`)
          .transition()
          .duration(HIDE_ANIMATION_MS)
          .ease(d3.easeCubicInOut)
          .style('opacity', 1);
      }
    });

    animatingOut.forEach((idx) => {
      const arcDatum = arcs.find((a) => a.data.index === idx);
      if (!arcDatum) return;

      g.select('.pie-lines')
        .selectAll('line')
        .filter(function () {
          return parseInt(d3.select(this).attr('data-index') ?? '', 10) === idx;
        })
        .transition()
        .duration(HIDE_ANIMATION_MS)
        .style('opacity', 0);

      svg
        .select('.pie-labels')
        .selectAll('.pie-radial-label')
        .filter(function () {
          return parseInt(d3.select(this).attr('data-index') ?? '', 10) === idx;
        })
        .transition()
        .duration(HIDE_ANIMATION_MS)
        .style('opacity', 0);

      arcsG
        .selectAll('.pie-slice')
        .filter(function () {
          return parseInt(d3.select(this).attr('data-index') ?? '', 10) === idx;
        })
        .select('path')
        .transition()
        .duration(HIDE_ANIMATION_MS)
        .attrTween('d', function () {
          const startAngle = arcDatum.startAngle;
          const endAngle = arcDatum.endAngle;
          const interpolate = d3.interpolate(endAngle, startAngle);
          return (t: number) => {
            const dAnimated = { ...arcDatum, endAngle: interpolate(t) };
            return arc(dAnimated) ?? '';
          };
        })
        .on('end', function () {
          onToggleItemRef.current(idx);
          setAnimatingOut((prev) => new Set(Array.from(prev).filter((i) => i !== idx)));
        });
    });
  }, [data, visibleData, total, hiddenItems, animatingOut, animatingIn, title, dimensions, onToggleItem, onSliceClick]);

  if (!data || data.length === 0 || legendData.length === 0) {
    return (
      <div className="chart-container-pie">
        <h6 className="chart-title-pie">{title}</h6>
        <div
          style={{
            width: '100%',
            height: '100%',
            minHeight: '150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <p className="text-muted small">Sem dados</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="chart-container-pie chart-radial-style"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <h6 className="chart-title-pie" style={{ marginBottom: '5px' }}>
        {title} ({formatPieValue(total, title)})
      </h6>
      <div style={{ flex: 1, display: 'flex', gap: '32px', minHeight: 120, maxHeight: 210 }}>
        <ul
          className="pie-sidebar-legend"
          style={{
            margin: 0,
            padding: '0 16px 0 0',
            listStyle: 'none',
            overflowY: 'auto',
            flexShrink: 0,
            maxWidth: '45%',
            maxHeight: '100%'
          }}
        >
          {legendData.map(({ item, index, value }) => {
            const isHidden = hiddenItems.has(index);
            return (
              <li
                key={index}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleItem(index);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleItem(index);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 4px',
                  cursor: 'pointer',
                  opacity: isHidden ? 0.5 : 1,
                  borderRadius: 'var(--border-radius, 4px)',
                  fontSize: '0.625rem',
                  textDecoration: isHidden ? 'line-through' : 'none'
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    flexShrink: 0,
                    backgroundColor: item.color || '#64748b',
                    borderRadius: 2
                  }}
                />
                <span style={{ overflow: 'visible', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {item.label || ''} {formatPieValue(value, title)}
                </span>
              </li>
            );
          })}
        </ul>
        <div
          ref={containerRef}
          style={{
            flex: 1,
            minWidth: 0,
            position: 'relative',
            overflow: 'visible'
          }}
        >
          <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }} />
        </div>
      </div>
    </div>
  );
});

ResponsivePieChart.displayName = 'ResponsivePieChart';

export default ResponsivePieChart;
