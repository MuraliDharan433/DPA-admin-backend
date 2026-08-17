import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiResponse';
import type { PermissionKey } from '../constants/permissions.constant';
import { RoleName } from '../constants/roles.constant';

/**
 * Independently re-checks permissions on every request - the frontend hiding a button
 * is a UX nicety only, this middleware is the real authorization boundary. Requires the
 * caller to hold ALL listed permissions (Owner bypasses by definition).
 */
export function requirePermissions(...permissions: PermissionKey[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(ApiError.unauthorized());

    if (user.roleName === RoleName.OWNER) return next();

    const hasAll = permissions.every((p) => user.permissions.includes(p));
    if (!hasAll) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}
