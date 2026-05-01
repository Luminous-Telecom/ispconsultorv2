import React, { useRef, useEffect, useMemo, memo, useState, useLayoutEffect, useCallback } from 'react';
import * as d3Selection from 'd3-selection';
import * as d3Shape from 'd3-shape';
import * as d3Ease from 'd3-ease';
import * as d3Interpolate from 'd3-interpolate';
import { PieChartProps } from './types';
import { ChartDataItem } from './types';
import { ChartEmptyState } from './ChartEmptyState';

const formatPieValue = (value: number): string | number => value.toLocaleString('pt-BR');

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
const RADIUS_MIN_RATIO = 0.7;
const RADIUS_MAX_RATIO = 1;
const HIDE_ANIMATION_MS = 400;

const ResponsivePieChart: React.FC<PieChartProps> = memo(({ data, title, hiddenItems, onToggleItem, onSliceClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
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
    const updateFromRect = (w: number, h: number) => {
      const maxW = typeof window !== 'undefined' ? window.innerWidth : 2000;
      const maxH = typeof window !== 'undefined' ? window.innerHeight : 1200;
      const clampedW = Math.min(Math.max(w, 0), maxW) || 200;
      const clampedH = Math.min(Math.max(h, 0), maxH) || 150;
      setDimensions((prev) => {
        if (prev.width === clampedW && prev.height === clampedH) return prev;
        return { width: clampedW, height: clampedH };
      });
    };
    const update = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        updateFromRect(rect.width, rect.height);
      }
    };
    const scheduleUpdate = () => requestAnimationFrame(update);
    const handleResize = () => {
      scheduleUpdate();
      setTimeout(update, 100);
    };
    update();
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) updateFromRect(width, height);
      } else {
        scheduleUpdate();
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
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
            .sort((a, b) => b.value - a.value)
        : [],
    [data]
  );

  useEffect(() => {
    if (!svgRef.current) return;
    if (visibleData.length === 0 || total <= 0) {
      d3Selection.select(svgRef.current).selectAll('*').remove();
      return;
    }

    const { width, height } = dimensions;
    const padding = 16;
    const centerX = width / 2;
    const centerY = height / 2;
    const minDim = Math.min(width, height) - padding * 2;
    const outerRadius = minDim / 2 - 12;
    const innerRadius = outerRadius * 0.45;

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

    const getOuterRadius = (d: d3Shape.PieArcDatum<PieDatum>) => {
      const ratio = RADIUS_MIN_RATIO + (d.data.percent / 100) * (RADIUS_MAX_RATIO - RADIUS_MIN_RATIO);
      return outerRadius * ratio;
    };

    const pie = d3Shape
      .pie<PieDatum>()
      .value((d) => d.value)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .padAngle(0.02)
      .startAngle(-Math.PI / 2);

    const arc = d3Shape
      .arc<d3Shape.PieArcDatum<PieDatum>>()
      .innerRadius(innerRadius)
      .outerRadius(getOuterRadius)
      .cornerRadius(4);

    const arcs = pie(pieData);

    const arcsBySize = [...arcs].sort((a, b) => b.data.value - a.data.value);

    const svg = d3Selection.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${centerX},${centerY})`);

    const arcsG = g.append('g').attr('class', 'pie-arcs');

    arcsBySize.forEach((d: d3Shape.PieArcDatum<PieDatum>) => {
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
        .on('mouseenter', function (event: MouseEvent) {
          const tooltip = tooltipRef.current;
          if (tooltip) {
            tooltip.textContent = `${d.data.label}: ${formatPieValue(d.data.value)}`;
            tooltip.style.left = `${event.clientX + 10}px`;
            tooltip.style.top = `${event.clientY + 10}px`;
            tooltip.style.opacity = '1';
            tooltip.style.visibility = 'visible';
          }
          d3Selection.select(this).transition().duration(150).attr('transform', `scale(${HOVER_SCALE})`);
        })
        .on('mousemove', function (event: MouseEvent) {
          const tooltip = tooltipRef.current;
          if (tooltip && event.clientX != null) {
            tooltip.style.left = `${event.clientX + 10}px`;
            tooltip.style.top = `${event.clientY + 10}px`;
          }
        })
        .on('mouseleave', function () {
          const tooltip = tooltipRef.current;
          if (tooltip) {
            tooltip.style.opacity = '0';
            tooltip.style.visibility = 'hidden';
          }
          d3Selection.select(this).transition().duration(150).attr('transform', 'scale(1)');
        });

      if (isAnimatingIn) {
        const idx = d.data.index;
        const endDatum = d;
        sliceGroup
          .select('path')
          .datum(endDatum)
          .transition()
          .duration(HIDE_ANIMATION_MS)
          .ease(d3Ease.easeCubicInOut)
          .attrTween('d', function () {
            const interp = d3Interpolate.interpolate(
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
      }
    });

    animatingOut.forEach((idx) => {
      const arcDatum = arcs.find((a) => a.data.index === idx);
      if (!arcDatum) return;

      arcsG
        .selectAll('.pie-slice')
        .filter(function () {
          return parseInt(d3Selection.select(this).attr('data-index') ?? '', 10) === idx;
        })
        .select('path')
        .transition()
        .duration(HIDE_ANIMATION_MS)
        .attrTween('d', function () {
          const startAngle = arcDatum.startAngle;
          const endAngle = arcDatum.endAngle;
          const interpolate = d3Interpolate.interpolate(endAngle, startAngle);
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

  const hasNoData = !data || data.length === 0 || legendData.length === 0 ||
    legendData.every((d) => (d.value ?? 0) === 0);
  if (hasNoData) {
    return <ChartEmptyState title={title} containerClassName="chart-container-pie" />;
  }

  return (
    <div
      className="chart-container-pie chart-radial-style"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <h6 className="chart-title-pie" style={{ marginBottom: '2px' }}>
        {title} ({formatPieValue(total)})
      </h6>
      <div style={{ flex: 1, display: 'flex', gap: '20px', minHeight: 120 }}>
        <ul
          className="pie-sidebar-legend"
          style={{
            margin: 0,
            padding: 0,
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
                  borderRadius: 'var(--border-radius, 8px)',
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
                  {item.label || ''} {formatPieValue(value)}
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
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            style={{ display: 'block', overflow: 'visible', maxWidth: '100%', maxHeight: '100%' }}
          />
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              padding: '6px 10px',
              background: 'var(--bg-tertiary, rgba(30, 32, 38, 0.95))',
              color: 'var(--text-primary, #fff)',
              border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              pointerEvents: 'none',
              zIndex: 9999,
              opacity: 0,
              visibility: 'hidden',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
            }}
          />
        </div>
      </div>
    </div>
  );
});

ResponsivePieChart.displayName = 'ResponsivePieChart';

export default ResponsivePieChart;
