import * as d3 from 'd3';

import { FONT_FAMILY_BASE } from 'constants/typography';

const PADDING = { x: 16, y: 12 };
const TOOLTIP_FONT = FONT_FAMILY_BASE;

export interface D3ChartTooltipBounds {
  width: number;
  height: number;
}

interface TooltipShell {
  group: d3.Selection<SVGGElement, unknown, null, undefined>;
  content: d3.Selection<SVGGElement, unknown, null, undefined>;
  measure: (minWidth?: number) => { width: number; height: number };
  show: () => void;
  hide: () => void;
}

function appendShadowFilter(defs: d3.Selection<SVGDefsElement, unknown, null, undefined>, idPrefix: string): string {
  const filterId = `${idPrefix}-${Math.random().toString(36).slice(2)}`;
  defs
    .append('filter')
    .attr('id', filterId)
    .attr('x', '-20%')
    .attr('y', '-20%')
    .attr('width', '140%')
    .attr('height', '140%')
    .append('feDropShadow')
    .attr('dx', 0)
    .attr('dy', 4)
    .attr('stdDeviation', 6)
    .attr('flood-opacity', 0.25);
  return filterId;
}

function measureContent(
  content: d3.Selection<SVGGElement, unknown, null, undefined>,
  background: d3.Selection<SVGRectElement, unknown, null, undefined>,
  minWidth = 100
): { width: number; height: number } {
  const bbox = content.node()?.getBBox();
  const width = bbox ? Math.max(bbox.width + PADDING.x, minWidth) : minWidth + 20;
  const height = bbox ? bbox.height + PADDING.y : 42;
  background.attr('width', width).attr('height', height).attr('x', 0).attr('y', 0);
  return { width, height };
}

function createShell(svg: SVGSVGElement | null, idPrefix: string): TooltipShell | null {
  if (!svg) return null;

  const defs = d3.select(svg).append('defs');
  const filterId = appendShadowFilter(defs, idPrefix);

  const group = d3
    .select(svg)
    .append('g')
    .attr('class', 'chart-tooltip')
    .style('opacity', 0)
    .style('pointer-events', 'none');

  const background = group
    .append('rect')
    .attr('rx', 6)
    .attr('ry', 6)
    .attr('fill', 'var(--bg-tertiary)')
    .attr('stroke', 'var(--border-color)')
    .attr('stroke-width', 1)
    .attr('filter', `url(#${filterId})`);

  const content = group.append('g').attr('transform', 'translate(12,12)');

  return {
    group,
    content,
    measure: (minWidth = 100) => measureContent(content, background, minWidth),
    show: () => group.transition().duration(180).ease(d3.easeCubicOut).style('opacity', 1),
    hide: () => group.transition().duration(150).ease(d3.easeCubicOut).style('opacity', 0),
  };
}

export function createD3ChartTooltip(svg: SVGSVGElement | null, idPrefix = 'tooltip-shadow') {
  const shell = createShell(svg, idPrefix);
  if (!shell) return null;

  shell.content
    .append('text')
    .attr('class', 'tooltip-label')
    .attr('font-family', TOOLTIP_FONT)
    .attr('font-size', '10px')
    .attr('font-weight', '500')
    .attr('fill', 'var(--text-muted)')
    .attr('y', 0);
  shell.content
    .append('text')
    .attr('class', 'tooltip-value')
    .attr('font-family', TOOLTIP_FONT)
    .attr('font-size', '11px')
    .attr('font-weight', '600')
    .attr('fill', 'var(--text-primary)')
    .attr('y', 16);

  return {
    ...shell,
    setLabelValue: (label: string, value: string) => {
      shell.content.select('.tooltip-label').text(label);
      shell.content.select('.tooltip-value').text(value);
    },
  };
}

export function clampTooltipNearPoint(
  pointX: number,
  pointY: number,
  tooltipWidth: number,
  tooltipHeight: number,
  bounds: D3ChartTooltipBounds,
  offsetY = 16
): { tx: number; ty: number } {
  let tx = pointX - tooltipWidth / 2;
  let ty = pointY - tooltipHeight - offsetY;
  if (tx + tooltipWidth > bounds.width - 8) tx = bounds.width - tooltipWidth - 8;
  if (tx < 8) tx = 8;
  if (ty < 8) ty = pointY + offsetY;
  if (ty + tooltipHeight > bounds.height - 8) ty = bounds.height - tooltipHeight - 8;
  if (ty < 8) ty = 8;
  return { tx, ty };
}
