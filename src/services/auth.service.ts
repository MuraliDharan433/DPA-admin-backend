import { randomBytes, createHash } from 'crypto';
import { userService } from './user.service';
import { auditLogService } from './auditLog.service';
import { ApiError } from '../utils/apiResponse';
import { comparePassword, hashPassword } from '../utils/password';
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
import { logger } from '../utils/logger';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresInMs: number;
}

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export const authService = {
  async validateAndLogin(
    email: string,
    password: string,
    rememberMe: boolean,
    context: RequestContext = {},
  ): Promise<{ user: IUser; tokens: TokenPair }> {
    const user = await userService.findByEmailWithSecrets(email);
    if (!user) throw ApiError.unauthorized('Invalid email or password');

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      throw new ApiError(
        403,
        `Account temporarily locked due to failed login attempts. Try again in ${minutesLeft} minute(s).`,
        'FORBIDDEN',
      );
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
      await userService.recordFailedLogin(user.id);
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ApiError(403, `Your account is ${user.status.toLowerCase()}. Contact your administrator.`, 'FORBIDDEN');
    }

    await userService.recordSuccessfulLogin(user.id);
    const tokens = await this.issueTokens(user, rememberMe);

    await auditLogService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      module: 'auth',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return { user, tokens };
  },

  async issueTokens(user: IUser, rememberMe = false): Promise<TokenPair> {
    const role = user.role as unknown as { id: string; name: string; permissions: string[] };
    const permissions = userService.getEffectivePermissions(user);

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      roleId: role.id,
      roleName: role.name,
      permissions,
    };
    const accessToken = signAccessToken(accessPayload);

    const jti = randomBytes(16).toString('hex');
    const refreshExpiresIn = rememberMe ? env.jwt.refreshExpiresInRemember : env.jwt.refreshExpiresIn;
    const refreshPayload: RefreshTokenPayload = { sub: user.id, jti };
    const refreshToken = signRefreshToken(refreshPayload, refreshExpiresIn);

    const refreshTokenHash = await hashPassword(refreshToken);
    await userService.setRefreshTokenHash(user.id, refreshTokenHash);

    return { accessToken, refreshToken, refreshExpiresInMs: msFromDuration(refreshExpiresIn) };
  },

  async refresh(refreshToken: string): Promise<{ user: IUser; tokens: TokenPair }> {
    let payload: RefreshTokenPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Session expired, please log in again');
    }

    const user = await userService.findById(payload.sub);
    const userWithSecrets = await userService.findByEmailWithSecrets(user.email);
    if (!userWithSecrets?.refreshTokenHash) {
      throw ApiError.unauthorized('Session expired, please log in again');
    }

    const matches = await comparePassword(refreshToken, userWithSecrets.refreshTokenHash);
    if (!matches) {
      await userService.setRefreshTokenHash(user.id, null);
      throw ApiError.unauthorized('Session expired, please log in again');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ApiError(403, 'Your account is no longer active', 'FORBIDDEN');
    }

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  },

  async logout(userId: string, context: RequestContext = {}) {
    await userService.setRefreshTokenHash(userId, null);
    await auditLogService.log({
      userId,
      action: AuditAction.LOGOUT,
      module: 'auth',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  },

  async forgotPassword(email: string) {
    const user = await userService.findByEmailWithSecrets(email);
    if (!user) return; // Never reveal whether the account exists.

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await userService.setPasswordResetToken(user.id, tokenHash, expiresAt);

    // No email provider wired up yet - log the reset link so it can be tested locally.
    logger.log(`Password reset requested for ${email}. Reset token (valid 30 min): ${rawToken}`);
  },

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await userService.findByPasswordResetTokenHash(tokenHash);
    if (!user) throw ApiError.unauthorized('Reset link is invalid or has expired');
    const passwordHash = await hashPassword(newPassword);
    await userService.setPassword(user.id, passwordHash);
    await userService.clearPasswordResetToken(user.id);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await userService.findById(userId);
    const userWithSecrets = await userService.findByEmailWithSecrets(user.email);
    if (!userWithSecrets) throw ApiError.unauthorized();

    const matches = await comparePassword(currentPassword, userWithSecrets.passwordHash);
    if (!matches) throw ApiError.unauthorized('Current password is incorrect');
    const passwordHash = await hashPassword(newPassword);
    await userService.setPassword(userId, passwordHash);
  },

  buildAuthenticatedUserView(user: IUser): AuthenticatedUserView {
    const role = user.role as unknown as { id: string; name: string };
    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: role.id,
      roleName: role.name,
      permissions: userService.getEffectivePermissions(user),
    };
  },
};
