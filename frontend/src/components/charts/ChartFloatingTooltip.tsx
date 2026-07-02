import React, { forwardRef } from 'react';
import { PositionedFixed } from 'components/ui';

export interface ChartFloatingTooltipData {
  x: number;
  y: number;
  label?: string;
  value: React.ReactNode;
}

export const ChartFloatingTooltip: React.FC<{
  data: ChartFloatingTooltipData | null;
  transform?: string;
}> = ({ data, transform = 'translate(-50%, -100%)' }) => {
  if (!data) return null;

  return (
    <PositionedFixed
      left={data.x}
      top={data.y}
      transform={transform}
      className="chart-floating-tooltip"
    >
      {data.label && <div className="chart-floating-tooltip__label">{data.label}</div>}
      <div>{data.value}</div>
    </PositionedFixed>
  );
};

export const ChartFloatingTooltipHost = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="chart-floating-tooltip chart-floating-tooltip--host invisible-host" />
));

ChartFloatingTooltipHost.displayName = 'ChartFloatingTooltipHost';

const CURSOR_OFFSET_PX = 10;

export function showFloatingChartTooltip(el: HTMLDivElement, text: string, clientX: number, clientY: number): void {
  el.textContent = text;
  el.style.left = `${clientX + CURSOR_OFFSET_PX}px`;
  el.style.top = `${clientY + CURSOR_OFFSET_PX}px`;
  el.style.opacity = '1';
  el.style.visibility = 'visible';
}

export function moveFloatingChartTooltip(el: HTMLDivElement, clientX: number, clientY: number): void {
  el.style.left = `${clientX + CURSOR_OFFSET_PX}px`;
  el.style.top = `${clientY + CURSOR_OFFSET_PX}px`;
}

export function hideFloatingChartTooltip(el: HTMLDivElement): void {
  el.style.opacity = '0';
  el.style.visibility = 'hidden';
}
