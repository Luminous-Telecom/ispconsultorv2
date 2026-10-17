const Y_AXIS_GAP = 8;
const CHART_EDGE_PAD = 8;
const X_LABEL_HALF = 14;

/** Margens laterais equilibradas: a esquerda cabe o eixo Y; a direita espelha esse respiro. */
export function lineChartHorizontalMargins(
  yLabels: string[],
  format: 'currency' | 'number'
): { left: number; right: number } {
  const longest = yLabels.reduce((best, label) => (label.length > best.length ? label : best), '0');
  const charWidth = format === 'currency' ? 6.2 : 6;
  const yLabelWidth = Math.ceil(longest.length * charWidth);
  const left = yLabelWidth + Y_AXIS_GAP + CHART_EDGE_PAD;
  const rightMin = X_LABEL_HALF + CHART_EDGE_PAD;
  return {
    left,
    right: Math.max(rightMin, left),
  };
}
