import React, { useRef, useMemo, memo, useState, useLayoutEffect, useCallback, useId } from 'react';
import { PieChartProps } from '../types';
import { ChartEmptyState } from '../ChartEmptyState';
import { LabelWithHelp, DynamicStyledElement } from 'components/ui';
import { ChartFloatingTooltipHost } from '../ChartFloatingTooltip';
import { formatPieValue, getItemValue, resolveHighlightItem } from './utils';
import { MetricPieHeaderIcon } from './MetricPieHeaderIcon';
import { PieSidebarLegend } from './PieSidebarLegend';
import { usePieChartD3Render } from './usePieChartD3Render';

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
    compact = false,
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

    usePieChartD3Render({
      svgRef,
      tooltipRef,
      data,
      visibleData,
      total,
      hiddenItems,
      animatingOut,
      animatingIn,
      setAnimatingIn,
      setAnimatingOut,
      dimensions,
      title,
      onToggleItem,
      onToggleItemRef,
      onSliceClick,
      centerLabel,
      compact,
    });

    const hasNoData =
      !data ||
      data.length === 0 ||
      legendData.length === 0 ||
      legendData.every((d) => (d.value ?? 0) === 0);
    if (hasNoData) {
      return <ChartEmptyState title={title} containerClassName="chart-container-pie" />;
    }

    const containerClass = [
      'chart-container-pie',
      'chart-radial-style',
      metricLayout ? 'chart-container-pie--metric' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const bodyClass = ['pie-chart-body', chartLeading ? 'pie-chart-body--chart-first' : '']
      .filter(Boolean)
      .join(' ');
    const useMetricChromeHeader = Boolean(metricLayout);

    return (
      <div className={`${containerClass} chart-flex-col-full`.trim()}>
        {useMetricChromeHeader ? (
          <div className="pie-metric-header">
            <div className="pie-metric-header__icon" aria-hidden>
              <MetricPieHeaderIcon variant={metricHeaderIcon} />
            </div>
            {metricHeaderInfo ? (
              <div className="pie-metric-header__title-with-help">
                <LabelWithHelp as="span" id={titleId} className="pie-metric-header__title" helpText={metricHeaderInfo}>
                  {title}
                </LabelWithHelp>
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
          <h6 id={titleId} className="chart-title-pie chart-title-pie-tight" >
            {title} ({formatPieValue(total)})
          </h6>
        )}
        <div className={bodyClass} role="group" aria-labelledby={titleId}>
          <PieSidebarLegend
            legendData={legendData}
            hiddenItems={hiddenItems}
            onToggleItem={handleToggleItem}
          />
          <div ref={containerRef} className="pie-chart-svg-wrap">
            <svg
              ref={svgRef}
              width={dimensions.width}
              height={dimensions.height}
              className="chart-svg-overflow"
            />
            <ChartFloatingTooltipHost ref={tooltipRef} />
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
              <DynamicStyledElement
                className="pie-metric-footer__value pie-metric-footer__value--accent"
                properties={footerRight.accentColor ? { color: footerRight.accentColor } : {}}
                deps={[footerRight.accentColor]}
              >
                {typeof footerRight.value === 'number' ? formatPieValue(footerRight.value) : footerRight.value}
              </DynamicStyledElement>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ResponsivePieChart.displayName = 'ResponsivePieChart';

export default ResponsivePieChart;
