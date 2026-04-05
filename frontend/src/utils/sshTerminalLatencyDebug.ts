/** Logs de diagnóstico no DevTools (ativar REACT_APP_SSH_TERMINAL_LATENCY_DEBUG=true). */
export function logSshTerminalLatency(...args: unknown[]): void {
  // eslint-disable-next-line no-console -- diagnóstico opcional de latência do terminal SSH
  console.info(...args);
}
