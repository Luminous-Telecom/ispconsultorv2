import { ChartDataItem } from '../types';

export const formatPieValue = (value: number): string | number => value.toLocaleString('pt-BR');

export const getItemValue = (item: ChartDataItem): number =>
  Number(item.value ?? item.valor ?? 0) || 0;

export function resolveHighlightItem(
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

export interface PieDatum {
  index: number;
  label: string;
  value: number;
  color: string;
  percent: number;
  data: ChartDataItem;
}

export const HOVER_SCALE = 1.12;
export const RADIUS_MIN_RATIO = 0.7;
export const RADIUS_MAX_RATIO = 1;
export const HIDE_ANIMATION_MS = 400;

export interface PieCenterLabel {
  text: string;
  color: string;
}

/** Percentual do destaque no centro do donut. Fatia ausente (quantidade 0) conta como 0%. */
export function resolveCenterLabel(
  data: ChartDataItem[] | undefined,
  centerHighlightFilterValue: string | boolean | undefined,
  fallbackColor: string,
): PieCenterLabel | null {
  if (centerHighlightFilterValue === undefined || !data?.length) return null;
  const grandTotal = data.reduce((sum, item) => sum + getItemValue(item), 0);
  if (grandTotal <= 0) return null;
  const hit = resolveHighlightItem(data, centerHighlightFilterValue);
  const value = hit ? getItemValue(hit) : 0;
  const pct = Math.round((value / grandTotal) * 100);
  return {
    text: `${pct}%`,
    color: hit?.color || fallbackColor,
  };
}
