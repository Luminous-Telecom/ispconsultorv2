import type { ITerminalOptions } from '@xterm/xterm';

export const TERMINAL_INIT_DELAY_MS = 200;

export const TERMINAL_BACKGROUND = '#0d1117';

export const XTERM_THEME: NonNullable<ITerminalOptions['theme']> = {
  background: TERMINAL_BACKGROUND,
  foreground: '#e6edf3',
  cursor: '#58a6ff',
  selectionBackground: '#264f78',
  black: '#484f58',
  red: '#ff7b72',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#b1bac4',
  brightBlack: '#6e7681',
  brightRed: '#ffa198',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#f0f6fc',
};

export const XTERM_OPTIONS: ITerminalOptions = {
  allowTransparency: false,
  cursorBlink: true,
  fontSize: 14,
  fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  convertEol: true,
  scrollback: 5000,
  theme: XTERM_THEME,
};

export function getSocketUrl(): string {
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3001';
  return window.location.origin;
}
