import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { PermissionKey } from '../constants/permissions.constant';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: PermissionKey[];
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload, expiresIn: string): string {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload;
}

export function msFromDuration(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]] || 86400000;
  return value * unitMs;
}
