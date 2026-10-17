/** Tokens da paleta. O hexadecimal fica só em styles/_palette.scss. */

const token = (name: string) => `var(--color-${name})`;

export const COLOR = {
  white: token('white'),
  black: token('black'),
  indigo: token('indigo'),
  indigoIcon: token('indigo-icon'),
  sky: token('sky'),
  emerald: token('emerald'),
  amber: token('amber'),
  red: token('red'),
  redDark: token('red-dark'),
  blue: token('blue'),
  violet: token('violet'),
  cyan: token('cyan'),
  orange: token('orange'),
  purple: token('purple'),
  teal: token('teal'),
  pink: token('pink'),
  green: token('green'),
  yellow: token('yellow'),
  slate: token('slate'),
  slateLight: token('slate-light'),
  greenBootstrapBright: token('green-bootstrap-bright'),
  grayBootstrap: token('gray-bootstrap'),
  blueLegacy: token('blue-legacy'),
  terminalBg: token('terminal-bg'),
} as const;

const CSS_VAR = /^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)$/;

/** Lê o valor definido na paleta. Aceita hex ou var(--color-*). */
export function readCssColor(color: string): string {
  let current = color.trim();

  for (let depth = 0; depth < 6; depth += 1) {
    const match = current.match(CSS_VAR);
    if (!match) return current;
    if (typeof document === 'undefined') return (match[2] || current).trim();

    const value = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim();
    if (!value) return (match[2] || current).trim();
    current = value;
  }

  return current;
}
