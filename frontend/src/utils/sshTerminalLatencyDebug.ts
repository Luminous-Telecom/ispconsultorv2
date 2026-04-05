/* eslint-disable no-console -- só este módulo emite diagnóstico opcional (REACT_APP_SSH_TERMINAL_LATENCY_DEBUG) */
/** Logs de diagnóstico no DevTools (ativar REACT_APP_SSH_TERMINAL_LATENCY_DEBUG=true). */
export function logSshTerminalLatency(...args: unknown[]): void {
  console.info(...args);
}
