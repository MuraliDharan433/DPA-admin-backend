import type { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, ApiError } from '../utils/apiResponse';
import { env } from '../config/env';

const REFRESH_COOKIE_NAME = 'refreshToken';

function setRefreshCookie(res: Response, token: string, maxAgeMs: number) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/',
  });
}

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, rememberMe } = req.body;
    const { user, tokens } = await authService.validateAndLogin(email, password, !!rememberMe, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresInMs);
    return ok(res, 'Login successful', {
      accessToken: tokens.accessToken,
      user: authService.buildAuthenticatedUserView(user),
    });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) throw ApiError.unauthorized('Session expired, please log in again');
    const { user, tokens } = await authService.refresh(refreshToken);
    setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresInMs);
    return ok(res, 'Token refreshed', {
      accessToken: tokens.accessToken,
      user: authService.buildAuthenticatedUserView(user),
    });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    if (req.user) {
      await authService.logout(req.user.userId, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
    return ok(res, 'Logged out successfully', null);
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    return ok(res, 'If an account exists for this email, a password reset link has been sent', null);
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    return ok(res, 'Password reset successfully', null);
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await authService.changePassword(req.user.userId, req.body.currentPassword, req.body.newPassword);
    return ok(res, 'Password changed successfully', null);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const user = await userService.findById(req.user.userId);
    return ok(res, 'Current user fetched', user);
  }),
};
