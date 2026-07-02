/** Cores semânticas dos gráficos financeiros do dashboard */
export const CHART_FINANCE_COLORS = {
  received: '#10b981',
  overdue: '#f59e0b',
  toReceive: '#0ea5e9',
  toPay: '#6366f1',
} as const;

/** Converte uma cor hex (#rgb ou #rrggbb) em rgba() com a opacidade informada. */
export const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
