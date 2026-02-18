import type { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

let io: SocketIOServer | null = null;

const BLOCKDOMI_LOGS_ROOM = 'blockdomi-logs';

export function setIO(server: SocketIOServer): void {
  io = server;
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token?.trim()) {
      return next(new Error('unauthorized'));
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.warn('Socket.IO: JWT_SECRET ausente');
      return next(new Error('server_error'));
    }
    jwt.verify(token, secret, (err, decoded) => {
      if (err) return next(new Error('unauthorized'));
      (socket as unknown as { data: { user: unknown } }).data = { user: decoded };
      next();
    });
  });
  io.on('connection', (socket) => {
    socket.on('subscribe-blockdomi-logs', () => socket.join(BLOCKDOMI_LOGS_ROOM));
    socket.on('disconnect', () => socket.leave(BLOCKDOMI_LOGS_ROOM));
  });
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitBlockdomiLog(log: Record<string, unknown>): void {
  if (!io) return;
  try {
    io.to(BLOCKDOMI_LOGS_ROOM).emit('blockdomi:log', log);
  } catch (err) {
    logger.warn('Socket emitBlockdomiLog', { error: err });
  }
}
