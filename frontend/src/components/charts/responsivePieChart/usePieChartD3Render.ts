import { useEffect, RefObject, MutableRefObject, Dispatch, SetStateAction } from 'react';
import * as d3Selection from 'd3-selection';
import * as d3Shape from 'd3-shape';
import * as d3Ease from 'd3-ease';
import * as d3Interpolate from 'd3-interpolate';
import { ChartDataItem } from '../types';
import { FONT_FAMILY_BASE } from 'constants/typography';
import { CHART_MUTED_COLOR } from '../chartColors';
import {
  hideFloatingChartTooltip,
  moveFloatingChartTooltip,
  showFloatingChartTooltip,
} from '../ChartFloatingTooltip';
import {
  formatPieValue,
  getItemValue,
  PieDatum,
  PieCenterLabel,
  HOVER_SCALE,
  RADIUS_MIN_RATIO,
  RADIUS_MAX_RATIO,
  HIDE_ANIMATION_MS,
} from './utils';

interface VisibleDataEntry {
  item: ChartDataItem;
  index: number;
}

interface UsePieChartD3RenderParams {
  svgRef: RefObject<SVGSVGElement | null>;
  tooltipRef: RefObject<HTMLDivElement | null>;
  data: ChartDataItem[] | undefined;
  visibleData: VisibleDataEntry[];
  total: number;
  hiddenItems: Set<number>;
  animatingOut: Set<number>;
  animatingIn: Set<number>;
  setAnimatingIn: Dispatch<SetStateAction<Set<number>>>;
  setAnimatingOut: Dispatch<SetStateAction<Set<number>>>;
  dimensions: { width: number; height: number };
  title: string;
  onToggleItem: (index: number) => void;
  onToggleItemRef: MutableRefObject<(index: number) => void>;
  onSliceClick?: (item: ChartDataItem, index: number) => void;
  centerLabel: PieCenterLabel | null;
  compact?: boolean;
}

export function usePieChartD3Render({
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
  compact = false,
}: UsePieChartD3RenderParams): void {
  useEffect(() => {
    if (!svgRef.current) return;
    if (visibleData.length === 0 || total <= 0) {
      d3Selection.select(svgRef.current).selectAll('*').remove();
      return;
    }

    const { width, height } = dimensions;
    const padding = compact ? 3 : 16;
    const radiusInset = compact ? 2 : 12;
    const centerX = width / 2;
    const centerY = height / 2;
    const minDim = Math.min(width, height) - padding * 2;
    const outerRadius = minDim / 2 - radiusInset;
    const innerRadius = outerRadius * 0.45;

    const pieData: PieDatum[] = visibleData.map(({ item, index }) => {
      const val = getItemValue(item);
      return {
        index,
        label: item.label || '',
        value: val,
        color: item.color || CHART_MUTED_COLOR,
        percent: total > 0 ? Math.round((val / total) * 100) : 0,
        data: item,
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
      const initialDatum = isAnimatingIn ? { ...d, endAngle: d.startAngle } : d;
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
            showFloatingChartTooltip(
              tooltip,
              `${d.data.label}: ${formatPieValue(d.data.value)}`,
              event.clientX,
              event.clientY
            );
          }
          d3Selection.select(this).transition().duration(150).attr('transform', `scale(${HOVER_SCALE})`);
        })
        .on('mousemove', function (event: MouseEvent) {
          const tooltip = tooltipRef.current;
          if (tooltip && event.clientX != null) {
            moveFloatingChartTooltip(tooltip, event.clientX, event.clientY);
          }
        })
        .on('mouseleave', function () {
          const tooltip = tooltipRef.current;
          if (tooltip) {
            hideFloatingChartTooltip(tooltip);
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
        .attr('font-family', FONT_FAMILY_BASE)
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
    compact,
    svgRef,
    tooltipRef,
    onToggleItemRef,
    setAnimatingIn,
    setAnimatingOut,
  ]);
}
