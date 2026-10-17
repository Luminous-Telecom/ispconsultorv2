import { COLOR, readCssColor } from 'constants/colors';

/** Cores semânticas dos gráficos financeiros do dashboard */
export const CHART_FINANCE_COLORS = {
  received: COLOR.emerald,
  overdue: COLOR.amber,
  toReceive: COLOR.sky,
  toPay: COLOR.indigo,
} as const;

/** Barras do dashboard quando a série não traz cor própria. */
export const CHART_BAR_PALETTE = [
  COLOR.indigo,
  COLOR.sky,
  COLOR.emerald,
  COLOR.amber,
  COLOR.red,
  COLOR.purple,
  COLOR.teal,
  COLOR.pink,
] as const;

/** Tipos de serviço no dashboard (cinco categorias). */
export const CHART_TYPE_COLORS = [
  COLOR.blue,
  COLOR.emerald,
  COLOR.violet,
  COLOR.red,
  COLOR.cyan,
] as const;

/** Séries categóricas (planos). Reusa as cores de tipo e acrescenta laranja. */
export const CHART_SERIES_COLORS = [...CHART_TYPE_COLORS, COLOR.orange] as const;

export const CHART_MUTED_COLOR = COLOR.slate;

/** Converte hex ou var(--color-*) em rgba() com a opacidade informada. */
export const hexToRgba = (color: string, alpha: number): string => {
  const resolved = readCssColor(color).trim();
  const rgbMatch = resolved.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
  }

  const clean = resolved.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((part) => part + part).join('') : clean;
  if (full.length !== 6 || /[^0-9a-f]/i.test(full)) return color;
  const num = parseInt(full, 16);

  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
