import type { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setIo(io: Server) {
  ioInstance = io;
}

function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  ioInstance?.to(userRoom(userId)).emit(event, payload);
}

export function emitToUsers(userIds: string[], event: string, payload: unknown): void {
  for (const id of userIds) emitToUser(id, event, payload);
}
