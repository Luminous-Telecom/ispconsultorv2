import type { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import { createHash } from 'crypto';
import { Agent } from '../models/agent/Agent';
import {
  registerAgent,
  unregisterAgent,
  getShellSession,
  deleteShellSession,
  createShellSession,
  getShellSessionsBySocket,
  appendFileChunk,
  getFileTransfer,
  deleteFileTransfer,
  resolveAgentSshTestResult,
  resolveAgentSshExecResult,
  resolveAgentHttpFetchResult,
  resolveAgentPingResult,
} from '../services/agent/AgentService';
import { logSshAudit } from '../services/ssh-manager/SshAuditService';
import { registrarExecucaoParaSocket } from '../services/sistema/AuditoriaService';
import { logger } from '../utils/logger';
import {
  clearAgentTerminalLatencyPending,
  hrtimeMsSince,
  isSshTerminalLatencyDebugEnabled,
  logAgentTerminalShellDataFromAgent,
  markAgentTerminalBackendInput,
} from '../utils/terminalLatencyDebug';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getAgentIp(socket: Socket): string {
  return (
    (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    socket.handshake.address ||
    '0.0.0.0'
  );
}

export function registerAgentNamespace(io: SocketIOServer): void {
  const ns: Namespace = io.of('/backnet-agent');

  // Middleware de autenticação por token
  ns.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token?.trim()) return next(new Error('unauthorized'));

    try {
      const hash = hashToken(token);
      const agent = await Agent.findOne({ where: { token_hash: hash, is_active: true } });
      if (!agent) return next(new Error('unauthorized'));
      (socket as Socket & { data: { agentId: number; agentName: string } }).data = {
        agentId: agent.id,
        agentName: agent.name,
      };
      next();
    } catch (err) {
      logger.warn('Agent socket: erro na autenticação', { error: err });
      next(new Error('server_error'));
    }
  });

  ns.on('connection', (socket: Socket) => {
    const { agentId, agentName } = (socket as Socket & { data: { agentId: number; agentName: string } }).data;
    const ip = getAgentIp(socket);


    // Agente envia suas informações logo após conectar
    socket.on('agent:info', async (info: {
      hostname?: string;
      os_info?: string;
      version?: string;
    }) => {
      logSshAudit({
        action: 'AGENT_CONNECT',
        userId: 'sistema',
        deviceId: agentId,
        deviceName: agentName,
        success: true,
        ip,
      });
      registerAgent(agentId, socket, {
        hostname: info.hostname ?? 'unknown',
        osInfo: info.os_info ?? 'unknown',
        version: info.version ?? '0.0.0',
        ipAddress: ip,
      });

      // Atualiza last_seen_at, hostname, os_info, version e ip no banco
      try {
        await Agent.update(
          {
            last_seen_at: new Date(),
            hostname: info.hostname ?? undefined,
            os_info: info.os_info ?? undefined,
            version: info.version ?? undefined,
            ip_address: ip,
          },
          { where: { id: agentId } }
        );
      } catch { /* ignora */ }

      socket.emit('agent:ready');
    });

    // Heartbeat para atualizar last_seen_at
    socket.on('agent:heartbeat', async () => {
      try {
        await Agent.update({ last_seen_at: new Date() }, { where: { id: agentId } });
      } catch { /* ignora */ }
    });

    socket.on('agent:pong', ({ pingId }: { pingId?: string }) => {
      if (typeof pingId === 'string' && pingId) resolveAgentPingResult(pingId);
    });

    // ── Shell: output do agente → frontend ───────────────────────────────────

    socket.on('shell:data', ({ sessionId, data }: { sessionId: string; data: string }) => {
      const session = getShellSession(sessionId);
      if (!session) return;
      logAgentTerminalShellDataFromAgent(sessionId, typeof data === 'string' ? data : '');
      ns.server.of('/agent-terminal').to(session.frontendSocketId).emit('terminal:output', {
        sessionId,
        data,
      });
    });

    socket.on('shell:exit', ({ sessionId, code }: { sessionId: string; code: number }) => {
      const session = getShellSession(sessionId);
      if (session) {
        clearAgentTerminalLatencyPending(sessionId);
        ns.server.of('/agent-terminal').to(session.frontendSocketId).emit('terminal:closed', {
          sessionId,
          reason: `Processo encerrado (código ${code})`,
        });
        deleteShellSession(sessionId);
      }
    });

    // ── File transfer: chunks do agente → frontend ────────────────────────────

    socket.on('file:chunk', ({ transferId, chunk, done, error }: {
      transferId: string;
      chunk: string;
      done: boolean;
      error?: string;
    }) => {
      appendFileChunk(transferId, chunk, done);
      const transfer = getFileTransfer(transferId);
      if (!transfer) return;

      ns.server.of('/agent-terminal').to(transfer.frontendSocketId).emit('file:chunk', {
        transferId, chunk, done, ...(error && { error }),
      });

      if (done) deleteFileTransfer(transferId);
    });

    socket.on(
      'proxy:ssh:test:result',
      (payload: { testId?: string; ok?: boolean; latencyMs?: number; error?: string }) => {
        if (!payload?.testId) return;
        resolveAgentSshTestResult(payload.testId, {
          ok: !!payload.ok,
          latencyMs: payload.latencyMs,
          error: payload.error,
        });
      }
    );

    socket.on(
      'proxy:ssh:exec:result',
      (payload: { execId?: string; ok?: boolean; output?: string; error?: string }) => {
        if (!payload?.execId) {
          logger.warn('Agent: proxy:ssh:exec:result sem execId', { agentId, agentName });
          return;
        }
        const outLen =
          typeof payload.output === 'string' ? Buffer.byteLength(payload.output, 'utf8') : 0;
        logger.info('Agent: proxy:ssh:exec:result recebido no socket', {
          agentId,
          agentName,
          execId: payload.execId,
          ok: !!payload.ok,
          outputBytes: outLen,
          errorPreview:
            typeof payload.error === 'string' ? payload.error.slice(0, 200) : undefined,
        });
        resolveAgentSshExecResult(payload.execId, {
          ok: !!payload.ok,
          output: typeof payload.output === 'string' ? payload.output : undefined,
          error: payload.error,
        });
      }
    );

    socket.on(
      'proxy:http:fetch:result',
      (payload: {
        fetchId?: string;
        ok?: boolean;
        bodyBase64?: string;
        error?: string;
        statusCode?: number;
      }) => {
        if (!payload?.fetchId) {
          logger.warn('Agent: proxy:http:fetch:result sem fetchId', { agentId, agentName });
          return;
        }
        const bytes =
          typeof payload.bodyBase64 === 'string' ? Buffer.from(payload.bodyBase64, 'base64').byteLength : 0;
        logger.info('Agent: proxy:http:fetch:result recebido', {
          agentId,
          fetchId: payload.fetchId,
          ok: !!payload.ok,
          bytes,
          statusCode: payload.statusCode,
          errorPreview: typeof payload.error === 'string' ? payload.error.slice(0, 200) : undefined,
        });
        resolveAgentHttpFetchResult(payload.fetchId, {
          ok: !!payload.ok,
          bodyBase64: typeof payload.bodyBase64 === 'string' ? payload.bodyBase64 : undefined,
          error: payload.error,
          statusCode: payload.statusCode,
        });
      }
    );

    // ── Desconexão ────────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      logSshAudit({
        action: 'AGENT_DISCONNECT',
        userId: 'sistema',
        deviceId: agentId,
        deviceName: agentName,
        success: true,
        ip: getAgentIp(socket),
      });
      unregisterAgent(agentId);
    });
  });
}

// ── Namespace /agent-terminal (frontend ↔ backend ↔ agente) ──────────────────

import jwt, { JwtPayload } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import {
  sendToAgent,
  createFileTransfer,
} from '../services/agent/AgentService';
import { SshDevice } from '../models/ssh-manager/SshDevice';
import { decrypt } from '../utils/encryption';
import { privateKeyPemForSsh2 } from '../utils/sshPrivateKey';

function verifyJwt(token: string): JwtPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try { return jwt.verify(token, secret) as JwtPayload; } catch { return null; }
}

function getFrontendIp(socket: Socket): string {
  return (
    (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    socket.handshake.address ||
    '0.0.0.0'
  );
}

function canAccessAgent(agent: Agent, userEmpresaId: number | null | undefined): boolean {
  if (agent.empresa_id === null) return true;
  if (userEmpresaId === null || userEmpresaId === undefined) return true;
  return agent.empresa_id === userEmpresaId;
}

export function registerAgentTerminalNamespace(io: SocketIOServer): void {
  const ns: Namespace = io.of('/agent-terminal');

  ns.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token?.trim()) return next(new Error('unauthorized'));
    const decoded = verifyJwt(token);
    if (!decoded) return next(new Error('unauthorized'));
    (socket as Socket & { data: { user: JwtPayload } }).data = { user: decoded };
    next();
  });

  ns.on('connection', (socket: Socket) => {
    const user = (socket as Socket & { data: { user: JwtPayload } }).data.user;
    const userId = String(user.sub ?? 'unknown');
    const ip = getFrontendIp(socket);

    if (isSshTerminalLatencyDebugEnabled()) {
      logger.info('SSH terminal latência: conexão /agent-terminal', {
        socketId: socket.id,
        transport: socket.conn.transport.name,
      });
    }

    // Frontend quer abrir um terminal no agente (shell local)
    const clampColsRows = (val: number, def: number, isRow: boolean) =>
      Math.min(Math.max(Number(val) || def, isRow ? 4 : 8), isRow ? 200 : 500);

    socket.on('terminal:create', async ({
      agentId: rawAgentId,
      cols = 80,
      rows = 24,
    }: {
      agentId: string | number;
      cols?: number;
      rows?: number;
    }) => {
      const agentId = Number(rawAgentId);
      const c = clampColsRows(cols, 80, false);
      const r = clampColsRows(rows, 24, true);
      const agent = await Agent.findByPk(agentId);
      if (!agent || !agent.is_active) {
        socket.emit('terminal:error', { message: 'Agente não encontrado ou inativo' });
        return;
      }
      const userEmpresaId = (user as { empresa_id?: number }).empresa_id;
      if (!canAccessAgent(agent, userEmpresaId)) {
        socket.emit('terminal:error', { message: 'Sem permissão para acessar este agente' });
        return;
      }

      if (!sendToAgent(agentId, 'ping', {})) {
        logSshAudit({
          action: 'AUTH_FAIL',
          userId,
          deviceId: agentId,
          deviceName: `Agente: ${agent.name}`,
          success: false,
          errorMessage: 'Agente offline',
          ip,
        });
        socket.emit('terminal:error', { message: `Agente "${agent.name}" está offline` });
        return;
      }

      const sessionId = randomUUID();
      createShellSession(sessionId, agentId, socket.id, false);

      const sent = sendToAgent(agentId, 'shell:open', { sessionId, cols: c, rows: r });
      if (!sent) {
        socket.emit('terminal:error', { message: 'Falha ao enviar comando ao agente' });
        deleteShellSession(sessionId);
        return;
      }

      const sessions: string[] = (socket as Socket & { _agentSessions?: string[] })._agentSessions ?? [];
      sessions.push(sessionId);
      (socket as Socket & { _agentSessions?: string[] })._agentSessions = sessions;

      socket.emit('terminal:created', { sessionId });
      try {
        await registrarExecucaoParaSocket(userId, ip, 'Agent', `Acesso ao terminal do agente ${agent.name}`, { agentId, agentName: agent.name }, agent.empresa_id ?? undefined);
      } catch { /* não crítico */ }
    });

    // Frontend quer abrir terminal proxy SSH para um SshDevice via agente
    socket.on('terminal:create:device', async ({
      deviceId,
      cols = 80,
      rows = 24,
    }: {
      deviceId: string;
      cols?: number;
      rows?: number;
    }) => {
      const c = clampColsRows(cols, 80, false);
      const r = clampColsRows(rows, 24, true);
      const device = await SshDevice.findByPk(deviceId);
      if (!device) {
        socket.emit('terminal:error', { message: 'Device SSH não encontrado' });
        return;
      }
      const userEmpresaId = (user as { empresa_id?: number }).empresa_id;
      const canAccessDevice = device.empresa_id === null || userEmpresaId == null || device.empresa_id === userEmpresaId;
      if (!canAccessDevice) {
        socket.emit('terminal:error', { message: 'Sem permissão para acessar este device' });
        return;
      }
      if (!device.agent_id) {
        socket.emit('terminal:error', { message: 'Device não possui agente configurado' });
        return;
      }
      if (!device.is_active) {
        socket.emit('terminal:error', { message: 'Device SSH inativo' });
        return;
      }

      const agent = await Agent.findByPk(device.agent_id);
      if (!agent || !agent.is_active) {
        socket.emit('terminal:error', { message: 'Agente não encontrado ou inativo' });
        return;
      }

      if (!sendToAgent(device.agent_id, 'ping', {})) {
        logSshAudit({
          action: 'AUTH_FAIL',
          userId,
          deviceId: device.id,
          deviceName: device.name,
          success: false,
          errorMessage: `Agente "${agent.name}" offline`,
          ip,
        });
        socket.emit('terminal:error', { message: `Agente "${agent.name}" está offline` });
        return;
      }

      const sessionId = randomUUID();
      createShellSession(sessionId, device.agent_id, socket.id, true, { deviceId: device.id, deviceName: device.name });


      let password: string;
      try {
        password = decrypt(device.password);
      } catch (err) {
        logger.warn('Agent terminal: falha ao descriptografar senha SSH — configure SSH_ENCRYPTION_KEY', { deviceId });
        socket.emit('terminal:error', { message: 'Erro de configuração: SSH_ENCRYPTION_KEY não definida. Configure em .env' });
        return;
      }

      let privateKey: string | undefined;
      if (device.private_key) {
        try {
          privateKey = privateKeyPemForSsh2(decrypt(device.private_key));
        } catch {
          privateKey = undefined;
        }
      }
      const useKey = !!privateKey?.length;

      const sent = sendToAgent(device.agent_id, 'proxy:ssh:open', {
        sessionId,
        host: device.host,
        port: device.port,
        username: device.username,
        ...(useKey && privateKey ? { privateKey } : { password }),
        cols: c,
        rows: r,
        deviceType: device.device_type,
      });

      if (!sent) {
        socket.emit('terminal:error', { message: 'Falha ao enviar comando ao agente' });
        deleteShellSession(sessionId);
        return;
      }

      const sessions: string[] = (socket as Socket & { _agentSessions?: string[] })._agentSessions ?? [];
      sessions.push(sessionId);
      (socket as Socket & { _agentSessions?: string[] })._agentSessions = sessions;

      socket.emit('terminal:created', { sessionId });
      try {
        await registrarExecucaoParaSocket(userId, ip, 'SshDevice', `Acesso ao terminal do equipamento ${device.name} (via agente)`, { deviceId: device.id, deviceName: device.name, agentId: device.agent_id }, device.empresa_id ?? undefined);
      } catch { /* não crítico */ }
    });

    const agentCommandBuffers = new Map<string, string>();
    socket.on('terminal:input', ({ sessionId, data }: { sessionId: string; data: string }) => {
      const session = getShellSession(sessionId);
      if (!session) return;
      const str = typeof data === 'string' ? data.slice(0, 65536) : '';
      if (str) {
        const dbg = isSshTerminalLatencyDebugEnabled();
        const t0 = dbg ? process.hrtime.bigint() : 0n;
        if (session.isProxy && session.deviceId && session.deviceName) {
          if (/[\r\n]/.test(str)) {
            let buf = agentCommandBuffers.get(sessionId) ?? '';
            buf += str;
            const lines: string[] = [];
            const parts = buf.split(/\r\n|\r|\n/);
            if (parts.length > 1) {
              for (let i = 0; i < parts.length - 1; i++) {
                lines.push(parts[i]!);
              }
              agentCommandBuffers.set(sessionId, parts[parts.length - 1] ?? '');
            } else {
              agentCommandBuffers.set(sessionId, buf);
            }
            const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/[\x00-\x1f\x7f]/g, '').trim();
            for (const line of lines) {
              const cmd = stripAnsi(line);
              if (cmd.length > 0 && cmd.length < 2000) {
                logSshAudit({
                  action: 'TERMINAL_COMMAND',
                  userId,
                  deviceId: session.deviceId,
                  deviceName: session.deviceName,
                  command: cmd,
                  success: true,
                  ip,
                });
              }
            }
          } else {
            agentCommandBuffers.set(sessionId, (agentCommandBuffers.get(sessionId) ?? '') + str);
          }
        }
        if (dbg) {
          logger.info('SSH terminal latência: entrada (/agent-terminal), antes de sendToAgent', {
            sessionIdShort: sessionId.slice(0, 8),
            byteLength: Buffer.byteLength(str, 'utf8'),
            isProxy: session.isProxy,
            transport: socket.conn.transport.name,
            processMs: hrtimeMsSince(t0),
          });
          markAgentTerminalBackendInput(sessionId);
        }
        sendToAgent(session.agentId, 'shell:write', { sessionId, data: str });
      }
    });

    socket.on('terminal:resize', ({ sessionId, cols, rows }: {
      sessionId: string; cols: number; rows: number;
    }) => {
      const session = getShellSession(sessionId);
      if (!session) return;
      const event = session.isProxy ? 'proxy:ssh:resize' : 'shell:resize';
      const c = clampColsRows(cols, 80, false);
      const r = clampColsRows(rows, 24, true);
      sendToAgent(session.agentId, event, { sessionId, cols: c, rows: r });
    });

    socket.on('terminal:close', ({ sessionId }: { sessionId: string }) => {
      agentCommandBuffers.delete(sessionId);
      clearAgentTerminalLatencyPending(sessionId);
      const session = getShellSession(sessionId);
      if (session) {
        const event = session.isProxy ? 'proxy:ssh:close' : 'shell:close';
        sendToAgent(session.agentId, event, { sessionId });
        deleteShellSession(sessionId);
      }
      socket.emit('terminal:closed', { sessionId, reason: 'Sessão encerrada pelo cliente' });
    });

    // ── File download (frontend pede, agente envia) ───────────────────────────

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    socket.on('file:download', async ({ agentId: rawAgentId, path }: { agentId: string | number; path: string }) => {
      const agentId = Number(rawAgentId);
      if (!path || typeof path !== 'string' || path.length > 4096) {
        socket.emit('terminal:error', { message: 'Caminho inválido' });
        return;
      }
      const agent = await Agent.findByPk(agentId);
      if (!agent || !agent.is_active) {
        socket.emit('terminal:error', { message: 'Agente não encontrado ou inativo' });
        return;
      }
      const userEmpresaId = (user as { empresa_id?: number }).empresa_id;
      if (!canAccessAgent(agent, userEmpresaId)) {
        socket.emit('terminal:error', { message: 'Sem permissão para acessar este agente' });
        return;
      }
      const transferId = randomUUID();
      createFileTransfer(transferId, agentId, socket.id, 'download', path);
      sendToAgent(agentId, 'file:download:request', { transferId, path });
      socket.emit('file:download:started', { transferId, path });
    });

    // ── File upload (frontend envia, agente recebe) ───────────────────────────

    socket.on('file:upload:start', async ({ agentId: rawAgentId, path, size }: {
      agentId: string | number; path: string; size: number;
    }) => {
      const agentId = Number(rawAgentId);
      if (!path || typeof path !== 'string' || path.length > 4096) {
        socket.emit('terminal:error', { message: 'Caminho inválido' });
        return;
      }
      if (typeof size !== 'number' || size < 0 || size > MAX_FILE_SIZE) {
        socket.emit('terminal:error', { message: 'Tamanho de arquivo inválido (máx. 100MB)' });
        return;
      }
      const agent = await Agent.findByPk(agentId);
      if (!agent || !agent.is_active) {
        socket.emit('terminal:error', { message: 'Agente não encontrado ou inativo' });
        return;
      }
      const userEmpresaId = (user as { empresa_id?: number }).empresa_id;
      if (!canAccessAgent(agent, userEmpresaId)) {
        socket.emit('terminal:error', { message: 'Sem permissão para acessar este agente' });
        return;
      }
      const transferId = randomUUID();
      createFileTransfer(transferId, agentId, socket.id, 'upload', path);
      sendToAgent(agentId, 'file:upload:start', { transferId, path, size });
      socket.emit('file:upload:ready', { transferId });
    });

    socket.on('file:upload:chunk', ({ transferId, chunk, done }: {
      transferId: string; chunk: string; done: boolean;
    }) => {
      const transfer = getFileTransfer(transferId);
      if (transfer) {
        sendToAgent(transfer.agentId, 'file:upload:chunk', { transferId, chunk, done });
      }
    });

    socket.on('disconnect', () => {
      const closeSession = (sessionId: string) => {
        agentCommandBuffers.delete(sessionId);
        clearAgentTerminalLatencyPending(sessionId);
        const session = getShellSession(sessionId);
        if (session) {
          const event = session.isProxy ? 'proxy:ssh:close' : 'shell:close';
          sendToAgent(session.agentId, event, { sessionId });
          deleteShellSession(sessionId);
        }
      };

      const sessions = (socket as Socket & { _agentSessions?: string[] })._agentSessions ?? [];
      for (const sessionId of sessions) closeSession(sessionId);

      const remaining = getShellSessionsBySocket(socket.id);
      for (const sessionId of remaining) closeSession(sessionId);
    });
  });
}
