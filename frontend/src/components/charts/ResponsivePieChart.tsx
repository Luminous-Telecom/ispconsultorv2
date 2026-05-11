import React, { useRef, useEffect, useMemo, memo, useState, useLayoutEffect, useCallback, useId } from 'react';
import * as d3Selection from 'd3-selection';
import * as d3Shape from 'd3-shape';
import * as d3Ease from 'd3-ease';
import * as d3Interpolate from 'd3-interpolate';
import { PieChartProps } from './types';
import { ChartDataItem } from './types';
import { ChartEmptyState } from './ChartEmptyState';
import { InfoHelpIcon } from 'components/ui/InfoHelpIcon';

const formatPieValue = (value: number): string | number => value.toLocaleString('pt-BR');

const getItemValue = (item: ChartDataItem): number =>
  Number(item.value ?? item.valor ?? 0) || 0;

function MetricPieHeaderIcon({ variant }: { variant: 'contracts' | 'payments' | 'clients' | 'plans' }) {
  if (variant === 'plans') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="4" width="18" height="5" rx="1.5" stroke="#534AB7" strokeWidth="2" />
        <rect x="5" y="10" width="14" height="5" rx="1.5" stroke="#534AB7" strokeWidth="2" />
        <rect x="7" y="16" width="10" height="4" rx="1.5" stroke="#534AB7" strokeWidth="2" />
      </svg>
    );
  }
  if (variant === 'clients') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
          stroke="#534AB7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="7" r="4" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M23 21v-2a4 4 0 0 0-3-3.87"
          stroke="#534AB7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 3.13a4 4 0 0 1 0 7.75"
          stroke="#534AB7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (variant === 'payments') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="#534AB7" strokeWidth="2" />
        <path d="M2 10h20" stroke="#534AB7" strokeWidth="2" />
        <path d="M7 15h.01M12 15h.01M17 15h.01" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="#534AB7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h4" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function resolveHighlightItem(
  data: ChartDataItem[],
  centerHighlightFilterValue: string | boolean
): ChartDataItem | null {
  if (!data?.length) return null;
  if (typeof centerHighlightFilterValue === 'boolean') {
    return data.find((item) => item.filterValue === centerHighlightFilterValue) ?? null;
  }
  const raw = centerHighlightFilterValue.trim();
  if (!raw) return null;
  const keys = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    data.find((item) => {
      const fv = String(item.filterValue ?? '');
      if (fv === raw) return true;
      return keys.some((k) => k === fv);
    }) ?? null
  );
}

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

const ResponsivePieChart: React.FC<PieChartProps> = memo(
  ({
    data,
    title,
    hiddenItems,
    onToggleItem,
    onSliceClick,
    centerHighlightFilterValue,
    chartLeading = false,
    metricLayout = false,
    footerLeft,
    footerRight,
    metricHeaderBadge,
    metricHeaderIcon = 'contracts',
    metricHeaderInfo,
  }) => {
  const titleId = useId();
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

  /** Texto e cor do % central (cor = mesma da fatia / legenda do destaque). */
  const centerLabel = useMemo(() => {
    if (centerHighlightFilterValue === undefined || !data?.length) return null;
    const grandTotal = data.reduce((sum, item) => sum + getItemValue(item), 0);
    if (grandTotal <= 0) return null;
    const hit = resolveHighlightItem(data, centerHighlightFilterValue);
    if (!hit) return null;
    const v = getItemValue(hit);
    const pct = Math.round((v / grandTotal) * 100);
    return {
      text: `${pct}%`,
      color: hit.color || '#64748b',
    };
  }, [data, centerHighlightFilterValue]);

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

    if (centerLabel) {
      const fontPx = Math.round(Math.max(10, Math.min(19, outerRadius * 0.3)));
      g.append('g')
        .attr('class', 'pie-center-label')
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('y', 0)
        .attr('fill', centerLabel.color)
        .attr('font-weight', '500')
        .attr('font-size', `${fontPx}px`)
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .attr('letter-spacing', '0.02em')
        .style('pointer-events', 'none')
        .text(centerLabel.text);
    }

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
  }, [
    data,
    visibleData,
    total,
    hiddenItems,
    animatingOut,
    animatingIn,
    title,
    dimensions,
    onToggleItem,
    onSliceClick,
    centerLabel,
  ]);

  const hasNoData = !data || data.length === 0 || legendData.length === 0 ||
    legendData.every((d) => (d.value ?? 0) === 0);
  if (hasNoData) {
    return <ChartEmptyState title={title} containerClassName="chart-container-pie" />;
  }

  const containerClass = ['chart-container-pie', 'chart-radial-style', metricLayout ? 'chart-container-pie--metric' : '']
    .filter(Boolean)
    .join(' ');
  const bodyClass = ['pie-chart-body', chartLeading ? 'pie-chart-body--chart-first' : ''].filter(Boolean).join(' ');
  const useMetricChromeHeader = Boolean(metricLayout);

  return (
    <div className={containerClass} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {useMetricChromeHeader ? (
        <div className="pie-metric-header">
          <div className="pie-metric-header__icon" aria-hidden>
            <MetricPieHeaderIcon variant={metricHeaderIcon} />
          </div>
          {metricHeaderInfo ? (
            <div className="pie-metric-header__title-with-help">
              <span id={titleId} className="pie-metric-header__title">
                {title}
              </span>
              <InfoHelpIcon text={metricHeaderInfo} className="ms-1" />
            </div>
          ) : (
            <span id={titleId} className="pie-metric-header__title">
              {title}
            </span>
          )}
          {metricHeaderBadge ? (
            <span className="pie-metric-header__badge">{metricHeaderBadge}</span>
          ) : null}
        </div>
      ) : (
        <h6 id={titleId} className="chart-title-pie" style={{ marginBottom: '2px' }}>
          {title} ({formatPieValue(total)})
        </h6>
      )}
      <div className={bodyClass} role="group" aria-labelledby={titleId}>
        <ul className="pie-sidebar-legend">
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
          className="pie-chart-svg-wrap"
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

      {metricLayout && footerLeft && footerRight && (
        <div className="pie-metric-footer">
          <div className="pie-metric-footer__box">
            <div className="pie-metric-footer__label">{footerLeft.label}</div>
            <div className="pie-metric-footer__value">
              {typeof footerLeft.value === 'number' ? formatPieValue(footerLeft.value) : footerLeft.value}
            </div>
          </div>
          <div className="pie-metric-footer__box">
            <div className="pie-metric-footer__label">{footerRight.label}</div>
            <div
              className="pie-metric-footer__value pie-metric-footer__value--accent"
              style={footerRight.accentColor ? { color: footerRight.accentColor } : undefined}
            >
              {typeof footerRight.value === 'number' ? formatPieValue(footerRight.value) : footerRight.value}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ResponsivePieChart.displayName = 'ResponsivePieChart';

export default ResponsivePieChart;
