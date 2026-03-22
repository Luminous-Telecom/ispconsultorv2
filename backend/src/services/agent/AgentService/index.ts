import type { Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { logger } from '../../../utils/logger';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface ConnectedAgent {
  agentId: string;
  socket: Socket;
  hostname: string;
  osInfo: string;
  version: string;
  ipAddress: string;
  connectedAt: Date;
}

export interface AgentShellSession {
  sessionId: string;
  agentId: string;
  /** socketId do cliente frontend que abriu o terminal */
  frontendSocketId: string;
  openedAt: Date;
  /** true quando é proxy SSH para outro host na rede do agente */
  isProxy: boolean;
  /** deviceId quando isProxy (terminal no equipamento via agente) */
  deviceId?: string;
  /** deviceName quando isProxy */
  deviceName?: string;
}

export interface AgentFileTransfer {
  transferId: string;
  agentId: string;
  frontendSocketId: string;
  direction: 'upload' | 'download';
  path: string;
  chunks: string[];
  done: boolean;
}

// ── Registros em memória ───────────────────────────────────────────────────────

const connectedAgents = new Map<string, ConnectedAgent>();
const shellSessions = new Map<string, AgentShellSession>();
const fileTransfers = new Map<string, AgentFileTransfer>();

// ── Agents ────────────────────────────────────────────────────────────────────

export function registerAgent(agentId: string, socket: Socket, info: {
  hostname: string;
  osInfo: string;
  version: string;
  ipAddress: string;
}): void {
  connectedAgents.set(agentId, {
    agentId,
    socket,
    hostname: info.hostname,
    osInfo: info.osInfo,
    version: info.version,
    ipAddress: info.ipAddress,
    connectedAt: new Date(),
  });
}

export function unregisterAgent(agentId: string): void {
  connectedAgents.delete(agentId);
  // Encerra sessões de shell pendentes do agente
  for (const [sid, sess] of shellSessions) {
    if (sess.agentId === agentId) shellSessions.delete(sid);
  }
}

export function getAgent(agentId: string): ConnectedAgent | undefined {
  return connectedAgents.get(agentId);
}

export function isAgentOnline(agentId: string): boolean {
  return connectedAgents.has(agentId);
}

/** Online na UI: só se estiver ativo no cadastro e com socket conectado. */
export function isAgentEffectivelyOnline(agentId: string, isActive: boolean): boolean {
  return Boolean(isActive) && connectedAgents.has(agentId);
}

export type AgentSessionEndReason = 'inactive' | 'token_regenerated';

/**
 * Encerra a sessão do agente no namespace (disconnect “normal”, sem forçar fechamento bruto do transporte).
 * Emite `agent:session-ended` para o cliente logar e manter reconexão automática quando fizer sentido.
 */
export function disconnectAgentById(
  agentId: string,
  options?: { sessionEnd?: AgentSessionEndReason }
): void {
  const connected = connectedAgents.get(agentId);
  if (!connected) return;
  const sessionEnd: AgentSessionEndReason = options?.sessionEnd ?? 'inactive';
  try {
    connected.socket.emit('agent:session-ended', { reason: sessionEnd });
    connected.socket.disconnect(false);
  } catch (err) {
    logger.warn('Agent: falha ao desconectar socket', { agentId, error: err });
    unregisterAgent(agentId);
  }
}

export function getOnlineAgentIds(): string[] {
  return [...connectedAgents.keys()];
}

// ── Shell sessions ────────────────────────────────────────────────────────────

export function createShellSession(
  sessionId: string,
  agentId: string,
  frontendSocketId: string,
  isProxy = false,
  deviceInfo?: { deviceId: string; deviceName: string }
): void {
  const sess: AgentShellSession = { sessionId, agentId, frontendSocketId, openedAt: new Date(), isProxy };
  if (deviceInfo) {
    sess.deviceId = deviceInfo.deviceId;
    sess.deviceName = deviceInfo.deviceName;
  }
  shellSessions.set(sessionId, sess);
}

export function getShellSession(sessionId: string): AgentShellSession | undefined {
  return shellSessions.get(sessionId);
}

export function deleteShellSession(sessionId: string): void {
  shellSessions.delete(sessionId);
}

export function getShellSessionsBySocket(frontendSocketId: string): string[] {
  const result: string[] = [];
  for (const [sid, sess] of shellSessions) {
    if (sess.frontendSocketId === frontendSocketId) result.push(sid);
  }
  return result;
}

// ── File transfers ────────────────────────────────────────────────────────────

export function createFileTransfer(
  transferId: string,
  agentId: string,
  frontendSocketId: string,
  direction: 'upload' | 'download',
  path: string
): void {
  fileTransfers.set(transferId, {
    transferId, agentId, frontendSocketId, direction, path,
    chunks: [], done: false,
  });
}

export function appendFileChunk(transferId: string, chunk: string, done: boolean): void {
  const t = fileTransfers.get(transferId);
  if (!t) return;
  t.chunks.push(chunk);
  t.done = done;
}

export function getFileTransfer(transferId: string): AgentFileTransfer | undefined {
  return fileTransfers.get(transferId);
}

export function deleteFileTransfer(transferId: string): void {
  fileTransfers.delete(transferId);
}

// ── Envio de comandos para o agente ──────────────────────────────────────────

export function sendToAgent(agentId: string, event: string, data: unknown): boolean {
  const agent = connectedAgents.get(agentId);
  if (!agent) return false;
  try {
    agent.socket.emit(event, data);
    return true;
  } catch (err) {
    logger.warn('Agent: erro ao enviar evento', { agentId, event, error: err });
    return false;
  }
}

// ── Ping ao agente (latência / online) ───────────────────────────────────────

const AGENT_PING_TIMEOUT_MS = 10_000;

const pendingAgentPings = new Map<
  string,
  {
    timer: ReturnType<typeof setTimeout>;
    settle: (p: { ok: boolean; latencyMs?: number; error?: string }) => void;
    startedAt: number;
  }
>();

export function resolveAgentPingResult(pingId: string): void {
  const entry = pendingAgentPings.get(pingId);
  if (!entry) return;
  clearTimeout(entry.timer);
  pendingAgentPings.delete(pingId);
  entry.settle({ ok: true, latencyMs: Date.now() - entry.startedAt });
}

export function pingAgent(agentId: string): Promise<{
  success: boolean;
  latency: number | null;
  error: string | null;
}> {
  const pingId = randomUUID();
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const settle = (p: { ok: boolean; latencyMs?: number; error?: string }) => {
      if (p.ok) {
        resolve({ success: true, latency: p.latencyMs ?? null, error: null });
      } else {
        resolve({
          success: false,
          latency: null,
          error: p.error ?? 'Falha no teste',
        });
      }
    };

    const timer = setTimeout(() => {
      const e = pendingAgentPings.get(pingId);
      if (!e) return;
      pendingAgentPings.delete(pingId);
      settle({ ok: false, error: 'Timeout: agente não respondeu ao ping' });
    }, AGENT_PING_TIMEOUT_MS);

    pendingAgentPings.set(pingId, { timer, settle, startedAt });

    const sent = sendToAgent(agentId, 'agent:ping', { pingId });

    if (!sent) {
      const e = pendingAgentPings.get(pingId);
      if (e) {
        clearTimeout(e.timer);
        pendingAgentPings.delete(pingId);
      }
      settle({ ok: false, error: 'Agente offline (não conectado ao servidor)' });
    }
  });
}

// ── Teste SSH via agente (mesmo caminho do terminal com túnel) ───────────────

const AGENT_SSH_TEST_TIMEOUT_MS = 20_000;

type AgentSshTestPayload = { ok: boolean; latencyMs?: number; error?: string };

const pendingAgentSshTests = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; settle: (p: AgentSshTestPayload) => void }
>();

export function resolveAgentSshTestResult(testId: string, payload: AgentSshTestPayload): void {
  const entry = pendingAgentSshTests.get(testId);
  if (!entry) return;
  clearTimeout(entry.timer);
  pendingAgentSshTests.delete(testId);
  entry.settle(payload);
}

export function testSshThroughAgent(
  agentId: string,
  params: {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
  }
): Promise<{ success: boolean; latency: number | null; errorRaw: string | null }> {
  const testId = randomUUID();
  return new Promise((resolve) => {
    const settle = (p: AgentSshTestPayload) => {
      if (p.ok) {
        resolve({ success: true, latency: p.latencyMs ?? null, errorRaw: null });
      } else {
        resolve({
          success: false,
          latency: null,
          errorRaw: p.error ?? 'Falha na conexão SSH',
        });
      }
    };

    const timer = setTimeout(() => {
      const e = pendingAgentSshTests.get(testId);
      if (!e) return;
      pendingAgentSshTests.delete(testId);
      settle({ ok: false, error: 'Timeout ao testar SSH via agente' });
    }, AGENT_SSH_TEST_TIMEOUT_MS);

    pendingAgentSshTests.set(testId, { timer, settle });

    const sent = sendToAgent(agentId, 'proxy:ssh:test', {
      testId,
      host: params.host,
      port: params.port,
      username: params.username,
      password: params.password,
      privateKey: params.privateKey,
    });

    if (!sent) {
      const e = pendingAgentSshTests.get(testId);
      if (e) {
        clearTimeout(e.timer);
        pendingAgentSshTests.delete(testId);
      }
      settle({ ok: false, error: 'Agente não está conectado' });
    }
  });
}

// ── Execução de comando SSH via agente (backup /export, etc.) ────────────────

type AgentSshExecPayload = { ok: boolean; output?: string; error?: string };

const pendingAgentSshExecs = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; settle: (p: AgentSshExecPayload) => void }
>();

export function resolveAgentSshExecResult(execId: string, payload: AgentSshExecPayload): void {
  const entry = pendingAgentSshExecs.get(execId);
  if (!entry) {
    logger.warn('Agent SSH exec: resultado órfão (sem pendência ou execId desconhecido)', {
      context: 'AgentService.resolveAgentSshExecResult',
      execId,
      ok: payload.ok,
      errorPreview: payload.error?.slice(0, 120),
    });
    return;
  }
  clearTimeout(entry.timer);
  pendingAgentSshExecs.delete(execId);
  logger.info('Agent SSH exec: resultado aplicado à pendência', {
    context: 'AgentService.resolveAgentSshExecResult',
    execId,
    ok: payload.ok,
    outputBytes: payload.output ? Buffer.byteLength(payload.output, 'utf8') : 0,
    errorPreview: payload.error?.slice(0, 120),
  });
  entry.settle(payload);
}

const AGENT_SSH_EXEC_SLACK_MS = 15_000;

export function executeSshCommandThroughAgent(
  agentId: string,
  params: {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
  },
  command: string,
  commandTimeoutMs: number
): Promise<{ success: boolean; output: string | null; error: string | null }> {
  const execId = randomUUID();
  const waitMs = commandTimeoutMs + AGENT_SSH_EXEC_SLACK_MS;

  return new Promise((resolve) => {
    const settle = (p: AgentSshExecPayload) => {
      if (p.ok) {
        resolve({ success: true, output: p.output ?? '', error: null });
      } else {
        resolve({
          success: false,
          output: null,
          error: p.error ?? 'Falha ao executar SSH via agente',
        });
      }
    };

    const timer = setTimeout(() => {
      const e = pendingAgentSshExecs.get(execId);
      if (!e) return;
      pendingAgentSshExecs.delete(execId);
      logger.warn('Agent SSH exec: timeout aguardando proxy:ssh:exec:result', {
        context: 'AgentService.executeSshCommandThroughAgent',
        agentId,
        execId,
        command,
        waitMs,
        commandTimeoutMs,
        hint: 'Agente antigo sem handler proxy:ssh:exec ou rede/firewall até o equipamento',
      });
      settle({ ok: false, error: 'Timeout ao executar comando SSH via agente' });
    }, waitMs);

    pendingAgentSshExecs.set(execId, { timer, settle });

    logger.info('Agent SSH exec: emitindo proxy:ssh:exec ao agente', {
      context: 'AgentService.executeSshCommandThroughAgent',
      agentId,
      execId,
      host: params.host,
      port: params.port,
      command,
      commandTimeoutMs,
      waitMs,
      authMode: params.privateKey?.trim() ? 'privateKey' : 'password',
    });

    const sent = sendToAgent(agentId, 'proxy:ssh:exec', {
      execId,
      host: params.host,
      port: params.port,
      username: params.username,
      password: params.password,
      privateKey: params.privateKey,
      command,
      timeoutMs: commandTimeoutMs,
    });

    if (!sent) {
      logger.warn('Agent SSH exec: sendToAgent falhou (socket ausente)', {
        context: 'AgentService.executeSshCommandThroughAgent',
        agentId,
        execId,
      });
      const e = pendingAgentSshExecs.get(execId);
      if (e) {
        clearTimeout(e.timer);
        pendingAgentSshExecs.delete(execId);
      }
      settle({ ok: false, error: 'Agente não está conectado' });
    }
  });
}
