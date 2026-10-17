import type { Server as SocketIOServer, Socket } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { logger } from '../utils/logger';
import {
  subscribeSystemUpdateStatus,
  SystemUpdateProgressService,
  type SystemUpdateStatus,
} from '../services/sistema/SystemUpdateProgressService';

const NAMESPACE = '/sistema-atualizacao';

function verifySocketToken(token: string): JwtPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}

let unsubscribe: (() => void) | null = null;

/**
 * Avisa as telas autenticadas quando uma atualização começa, avança ou termina.
 * O cliente não consulta a API em intervalo.
 */
export function registerSystemUpdateNamespace(io: SocketIOServer): void {
  const ns = io.of(NAMESPACE);

  ns.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token?.trim()) return next(new Error('unauthorized'));
    const decoded = verifySocketToken(token);
    if (!decoded) return next(new Error('unauthorized'));
    (socket as Socket & { data: { user: JwtPayload } }).data = { user: decoded };
    next();
  });

  ns.on('connection', (socket: Socket) => {
    socket.emit('system-update:status', SystemUpdateProgressService.getSnapshot());
  });

  unsubscribe?.();
  unsubscribe = subscribeSystemUpdateStatus((status: SystemUpdateStatus) => {
    try {
      ns.emit('system-update:status', status);
    } catch (err) {
      logger.warn('Socket system-update', { error: err });
    }
  });
}
