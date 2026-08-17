import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/apiResponse';

/** Populates req.user from a valid Bearer access token. Rejects everything else with 401. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return next(ApiError.unauthorized('Authentication required'));

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
      roleName: payload.roleName,
      permissions: payload.permissions,
    };
    next();
  } catch {
    next(ApiError.unauthorized('Session expired, please log in again'));
  }
}

/** Populates req.user if a valid token is present, but never rejects - for public routes
 * that behave slightly differently for logged-in users without requiring login. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
      roleName: payload.roleName,
      permissions: payload.permissions,
    };
  } catch {
    // Ignore invalid tokens on optional-auth routes.
  }
  next();
}
