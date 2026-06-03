import React, { forwardRef } from 'react';

const FLOATING_STYLE: React.CSSProperties = {
  position: 'fixed',
  background: 'var(--bg-tertiary, rgba(20,22,28,0.97))',
  color: 'var(--text-primary, #fff)',
  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
  borderRadius: 6,
  padding: '5px 9px',
  fontSize: 11,
  fontWeight: 500,
  pointerEvents: 'none',
  zIndex: 9999,
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};

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
    <div style={{ ...FLOATING_STYLE, left: data.x, top: data.y, transform }}>
      {data.label && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 1 }}>{data.label}</div>
      )}
      <div>{data.value}</div>
    </div>
  );
};

export const ChartFloatingTooltipHost = forwardRef<HTMLDivElement>((_, ref) => (
  <div
    ref={ref}
    style={{
      ...FLOATING_STYLE,
      padding: '6px 10px',
      fontSize: 12,
      opacity: 0,
      visibility: 'hidden',
    }}
  />
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
