import type { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { SshDevice } from '../models/ssh-manager/SshDevice';
import { sshEvents } from '../services/ssh-manager/SshConnectionService';
import {
  createTerminalSession,
  writeToTerminal,
  resizeTerminal,
  closeTerminalSession,
  getSessionsByUser,
} from '../services/ssh-manager/TerminalService';
import { logSshAudit } from '../services/ssh-manager/SshAuditService';
import { registrarExecucaoParaSocket } from '../services/sistema/AuditoriaService';
import { logger } from '../utils/logger';
import { isSshTerminalLatencyDebugEnabled } from '../utils/terminalLatencyDebug';

function verifySocketToken(token: string): JwtPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}

function getSocketIp(socket: Socket): string {
  return (
    (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    socket.handshake.address ||
    '0.0.0.0'
  );
}

/**
 * Registra os namespaces SSH no servidor Socket.IO.
 */
export function registerSshNamespaces(io: SocketIOServer): void {
  registerLogsNamespace(io.of('/ssh-logs'));
  registerTerminalNamespace(io.of('/ssh-terminal'));
}

// ── /ssh-logs ─────────────────────────────────────────────────────────────────

function registerLogsNamespace(ns: Namespace): void {
  ns.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token?.trim()) return next(new Error('unauthorized'));
    const decoded = verifySocketToken(token);
    if (!decoded) return next(new Error('unauthorized'));
    (socket as Socket & { data: { user: JwtPayload } }).data = { user: decoded };
    next();
  });

  ns.on('connection', (socket: Socket) => {
    logger.info('SSH logs: cliente conectado', { socketId: socket.id });

    socket.on('subscribe', ({ targetId, targetType }: { targetId: string; targetType: string }) => {
      const room = `${targetType}:${targetId}`;
      socket.join(room);
      logger.info('SSH logs: cliente inscrito', { socketId: socket.id, room });
    });

    socket.on('unsubscribe', ({ targetId, targetType }: { targetId: string; targetType: string }) => {
      const room = `${targetType}:${targetId}`;
      socket.leave(room);
    });

    socket.on('disconnect', () => {
      logger.info('SSH logs: cliente desconectado', { socketId: socket.id });
    });
  });

  sshEvents.on('log', ({ targetId, level, message, timestamp }: {
    targetId: string;
    level: string;
    message: string;
    timestamp: Date;
  }) => {
    const deviceRoom = `device:${targetId}`;
    const payload = { timestamp, level, message, targetId };
    ns.to(deviceRoom).emit('log:line', payload);
  });
}

// ── /ssh-terminal ─────────────────────────────────────────────────────────────

function registerTerminalNamespace(ns: Namespace): void {
  ns.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token?.trim()) return next(new Error('unauthorized'));
    const decoded = verifySocketToken(token);
    if (!decoded) return next(new Error('unauthorized'));
    (socket as Socket & { data: { user: JwtPayload } }).data = { user: decoded };
    next();
  });

  ns.on('connection', (socket: Socket) => {
    const user = (socket as Socket & { data: { user: JwtPayload } }).data.user;
    const userId = String(user.sub ?? 'unknown');
    const ip = getSocketIp(socket);

    logger.info('SSH terminal: cliente conectado', { socketId: socket.id, userId });

    if (isSshTerminalLatencyDebugEnabled()) {
      logger.info('SSH terminal latência: conexão /ssh-terminal', {
        socketId: socket.id,
        transport: socket.conn.transport.name,
      });
    }

    socket.on('terminal:create', async ({ deviceId }: { deviceId: string }) => {
      try {
        const device = await SshDevice.findByPk(deviceId);
        if (!device) {
          socket.emit('terminal:error', { message: 'Device SSH não encontrado' });
          return;
        }

        if (!device.is_active) {
          socket.emit('terminal:error', { message: 'Device SSH inativo' });
          return;
        }

        const sessionId = await createTerminalSession(
          device,
          userId,
          ip,
          (data) => {
            socket.emit('terminal:output', { sessionId, data });
          },
          (reason) => {
            socket.emit('terminal:closed', { sessionId, reason });
          }
        );

        const sessions: string[] = (socket as Socket & { _sshSessions?: string[] })._sshSessions ?? [];
        sessions.push(sessionId);
        (socket as Socket & { _sshSessions?: string[] })._sshSessions = sessions;

        socket.emit('terminal:created', { sessionId });

        logSshAudit({
          action: 'CONNECT',
          userId,
          deviceId: device.id,
          deviceName: device.name,
          success: true,
          ip,
        });
        try {
          await registrarExecucaoParaSocket(userId, ip, 'SshDevice', `Acesso ao terminal do equipamento ${device.name}`, { deviceId: device.id, deviceName: device.name }, device.empresa_id ?? undefined);
        } catch { /* não crítico */ }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar sessão de terminal';
        logger.warn('SSH terminal: erro ao criar sessão', { socketId: socket.id, error: message });
        socket.emit('terminal:error', { message });
      }
    });

    socket.on('terminal:input', ({ sessionId, data }: { sessionId: string; data: string }) => {
      if (isSshTerminalLatencyDebugEnabled()) {
        logger.info('SSH terminal latência: entrada recebida (/ssh-terminal)', {
          sessionIdShort: sessionId.slice(0, 8),
          byteLength: Buffer.byteLength(typeof data === 'string' ? data : '', 'utf8'),
          transport: socket.conn.transport.name,
        });
      }
      writeToTerminal(sessionId, data);
    });

    socket.on('terminal:resize', ({ sessionId, cols, rows }: { sessionId: string; cols: number; rows: number }) => {
      resizeTerminal(sessionId, cols, rows);
    });

    socket.on('terminal:close', ({ sessionId }: { sessionId: string }) => {
      closeTerminalSession(sessionId);
      const sessions = (socket as Socket & { _sshSessions?: string[] })._sshSessions ?? [];
      const idx = sessions.indexOf(sessionId);
      if (idx !== -1) sessions.splice(idx, 1);
      socket.emit('terminal:closed', { sessionId, reason: 'Sessão encerrada pelo cliente' });
    });

    socket.on('disconnect', () => {
      logger.info('SSH terminal: cliente desconectado, encerrando sessões abertas', {
        socketId: socket.id,
        userId,
      });

      const sessions = (socket as Socket & { _sshSessions?: string[] })._sshSessions ?? [];
      for (const sessionId of sessions) {
        closeTerminalSession(sessionId);
      }

      const remaining = getSessionsByUser(userId);
      for (const sessionId of remaining) {
        closeTerminalSession(sessionId);
      }
    });
  });
}
