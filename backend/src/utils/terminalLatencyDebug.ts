import { logger } from './logger';

/**
 * Diagnóstico de lentidão no terminal SSH (browser → Socket.IO → SSH).
 * Ative com SSH_TERMINAL_LATENCY_DEBUG=1 no .env do backend.
 */
export function isSshTerminalLatencyDebugEnabled(): boolean {
  const v = process.env.SSH_TERMINAL_LATENCY_DEBUG?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function hrtimeMsSince(start: bigint): number {
  return Number(process.hrtime.bigint() - start) / 1e6;
}

/** backend recebeu terminal:input → agora recebeu shell:data do agente (primeiro chunk). */
const agentTerminalPendingInputHr = new Map<string, bigint>();

export function markAgentTerminalBackendInput(sessionId: string): void {
  if (!isSshTerminalLatencyDebugEnabled()) return;
  agentTerminalPendingInputHr.set(sessionId, process.hrtime.bigint());
}

export function logAgentTerminalShellDataFromAgent(sessionId: string, data: string): void {
  if (!isSshTerminalLatencyDebugEnabled()) return;
  const t0 = agentTerminalPendingInputHr.get(sessionId);
  if (t0 === undefined) return;
  logger.info('SSH terminal latência: eco vindo do agente (após entrada no backend)', {
    sessionIdShort: sessionId.slice(0, 8),
    delayMsSinceBackendAcceptedInput: hrtimeMsSince(t0),
    outBytes: Buffer.byteLength(data, 'utf8'),
  });
  agentTerminalPendingInputHr.delete(sessionId);
}

export function clearAgentTerminalLatencyPending(sessionId: string): void {
  agentTerminalPendingInputHr.delete(sessionId);
}
