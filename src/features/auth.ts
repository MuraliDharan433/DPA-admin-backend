import { Router, type Response } from 'express';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, ApiError } from '../utils/apiResponse';
import { comparePassword, hashPassword } from '../utils/password';
import { strongPassword } from '../utils/validation';
import { logger } from '../utils/logger';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  msFromDuration,
  type AccessTokenPayload,
  type RefreshTokenPayload,
} from '../utils/jwt';
import { env } from '../config/env';
import { UserStatus, AuditAction } from '../constants/enums.constant';
import type { IUser } from '../models/User.model';
import type { AuthenticatedUserView } from '../types/authenticated-user.type';
import {
  getUserOrFail,
  findUserByEmailWithSecrets,
  findUserByPasswordResetTokenHash,
  getEffectivePermissions,
  recordSuccessfulLogin,
  recordFailedLogin,
  setRefreshTokenHash,
  setUserPassword,
  setPasswordResetToken,
  clearPasswordResetToken,
} from './user';
import { writeAuditLog } from './auditLog';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const REFRESH_COOKIE_NAME = 'refreshToken';

// ---------------------------------------------------------------- validation

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({ email: z.string().email() });

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: strongPassword,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: strongPassword,
});

// ------------------------------------------------------------------- helpers

function setRefreshCookie(res: Response, token: string, maxAgeMs: number) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/',
  });
}

/** Shape returned to the client on login/refresh. Unlike the JWT claims, this reads from the
 *  user document so it can carry display fields like the user's name. */
function buildAuthenticatedUserView(user: IUser): AuthenticatedUserView {
  const role = user.role as unknown as { id: string; name: string };
  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roleId: role.id,
    roleName: role.name,
    permissions: getEffectivePermissions(user),
  };
}

async function issueTokens(user: IUser, rememberMe = false) {
  const role = user.role as unknown as { id: string; name: string; permissions: string[] };

  const accessPayload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    roleId: role.id,
    roleName: role.name,
    permissions: getEffectivePermissions(user),
  };
  const accessToken = signAccessToken(accessPayload);

  const jti = randomBytes(16).toString('hex');
  const refreshExpiresIn = rememberMe ? env.jwt.refreshExpiresInRemember : env.jwt.refreshExpiresIn;
  const refreshPayload: RefreshTokenPayload = { sub: user.id, jti };
  const refreshToken = signRefreshToken(refreshPayload, refreshExpiresIn);

  await setRefreshTokenHash(user.id, await hashPassword(refreshToken));

  return { accessToken, refreshToken, refreshExpiresInMs: msFromDuration(refreshExpiresIn) };
}

// -------------------------------------------------------------------- routes

const router = Router();

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password, rememberMe } = req.body;

    const user = await findUserByEmailWithSecrets(email);
    if (!user) throw ApiError.unauthorized('Invalid email or password');

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      throw new ApiError(
        403,
        `Account temporarily locked due to failed login attempts. Try again in ${minutesLeft} minute(s).`,
        'FORBIDDEN',
      );
    }

    if (!(await comparePassword(password, user.passwordHash))) {
      await recordFailedLogin(user.id);
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ApiError(403, `Your account is ${user.status.toLowerCase()}. Contact your administrator.`, 'FORBIDDEN');
    }

    await recordSuccessfulLogin(user.id);
    const tokens = await issueTokens(user, !!rememberMe);

    await writeAuditLog({
      userId: user.id,
      action: AuditAction.LOGIN,
      module: 'auth',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresInMs);
    return ok(res, 'Login successful', {
      accessToken: tokens.accessToken,
      user: buildAuthenticatedUserView(user),
    });
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) throw ApiError.unauthorized('Session expired, please log in again');

    let payload: RefreshTokenPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Session expired, please log in again');
    }

    const user = await getUserOrFail(payload.sub);
    const userWithSecrets = await findUserByEmailWithSecrets(user.email);
    if (!userWithSecrets?.refreshTokenHash) {
      throw ApiError.unauthorized('Session expired, please log in again');
    }

    if (!(await comparePassword(refreshToken, userWithSecrets.refreshTokenHash))) {
      await setRefreshTokenHash(user.id, null);
      throw ApiError.unauthorized('Session expired, please log in again');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ApiError(403, 'Your account is no longer active', 'FORBIDDEN');
    }

    const tokens = await issueTokens(user);
    setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresInMs);
    return ok(res, 'Token refreshed', {
      accessToken: tokens.accessToken,
      user: buildAuthenticatedUserView(user),
    });
  }),
);

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user) {
      await setRefreshTokenHash(req.user.userId, null);
      await writeAuditLog({
        userId: req.user.userId,
        action: AuditAction.LOGOUT,
        module: 'auth',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
    return ok(res, 'Logged out successfully', null);
  }),
);

router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await findUserByEmailWithSecrets(req.body.email);

    // Always respond the same way - never reveal whether the account exists.
    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      await setPasswordResetToken(user.id, tokenHash, new Date(Date.now() + RESET_TOKEN_TTL_MS));

      // No email provider wired up yet - log the reset link so it can be tested locally.
      logger.log(`Password reset requested for ${req.body.email}. Reset token (valid 30 min): ${rawToken}`);
    }

    return ok(res, 'If an account exists for this email, a password reset link has been sent', null);
  }),
);

router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const tokenHash = createHash('sha256').update(req.body.token).digest('hex');
    const user = await findUserByPasswordResetTokenHash(tokenHash);
    if (!user) throw ApiError.unauthorized('Reset link is invalid or has expired');

    await setUserPassword(user.id, await hashPassword(req.body.newPassword));
    await clearPasswordResetToken(user.id);
    return ok(res, 'Password reset successfully', null);
  }),
);

router.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await getUserOrFail(req.user!.userId);
    const userWithSecrets = await findUserByEmailWithSecrets(user.email);
    if (!userWithSecrets) throw ApiError.unauthorized();

    if (!(await comparePassword(req.body.currentPassword, userWithSecrets.passwordHash))) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    await setUserPassword(user.id, await hashPassword(req.body.newPassword));
    return ok(res, 'Password changed successfully', null);
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    return ok(res, 'Current user fetched', await getUserOrFail(req.user!.userId));
  }),
);

export default router;
