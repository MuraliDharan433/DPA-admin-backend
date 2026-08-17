import type { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';

function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function registerNotificationsGateway(io: Server): void {
  io.on('connection', (socket: Socket) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        socket.handshake.headers.authorization?.toString().replace('Bearer ', '');
      if (!token) throw new Error('No token provided');

      const payload = verifyAccessToken(token);
      socket.join(userRoom(payload.sub));
    } catch {
      logger.warn(`Rejected unauthenticated socket connection: ${socket.id}`);
      socket.disconnect(true);
    }
  });
}
