import { TooltipProps } from './types';

export type TooltipPlacement = NonNullable<TooltipProps['tooltipPosition']>;

/** Props Bootstrap para tooltip em campos de formulário (Input, Select, textarea). */
export function getBootstrapTooltipProps(
  tooltip?: string,
  tooltipPosition: TooltipPlacement = 'top'
): Record<string, string | undefined> {
  if (!tooltip) return {};
  return {
    title: tooltip,
    'data-bs-toggle': 'tooltip',
    'data-bs-placement': tooltipPosition,
    'data-bs-title': tooltip,
  };
}
