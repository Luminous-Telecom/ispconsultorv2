/** Classes CSS centralizadas — ver styles/_utilities.scss */

export function getTerminalLogLineClass(line: string): string {
  if (line.startsWith('❌')) return 'terminal-log-line--danger';
  if (line.startsWith('✅')) return 'terminal-log-line--success';
  if (line.startsWith('🎉')) return 'terminal-log-line--info';
  if (line.startsWith('---')) return 'terminal-log-line--muted';
  return '';
}
