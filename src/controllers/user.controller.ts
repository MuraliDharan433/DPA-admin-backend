import type { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';
import { UserStatus } from '../constants/enums.constant';
import { parseListQuery } from '../utils/pagination';

export const userController = {
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await userService.findAll(parseListQuery(req.query as Record<string, unknown>));
    return ok(res, 'Users fetched successfully', data, pagination);
  }),

  lookup: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.lookupByRoleName(String(req.query.role || ''));
    return ok(res, 'Users fetched successfully', data);
  }),

  findOne: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.findById(req.params.id);
    return ok(res, 'User fetched successfully', data);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.create(req.body, req.user!.userId);
    return created(res, 'User created successfully', data);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.update(req.params.id, req.body);
    return ok(res, 'User updated successfully', data);
  }),

  updatePermissions: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.updatePermissions(req.params.id, req.body.grant, req.body.revoke);
    return ok(res, 'Permissions updated successfully', data);
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.updateStatus(req.params.id, req.body.status);
    return ok(res, 'User status updated successfully', data);
  }),

  activate: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.updateStatus(req.params.id, UserStatus.ACTIVE);
    return ok(res, 'User activated successfully', data);
  }),

  deactivate: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.updateStatus(req.params.id, UserStatus.INACTIVE);
    return ok(res, 'User deactivated successfully', data);
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const temporaryPassword = await userService.adminResetPassword(req.params.id, req.body.newPassword);
    return ok(res, 'Password reset successfully', { temporaryPassword });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await userService.delete(req.params.id);
    return ok(res, 'User deleted successfully', null);
  }),
};
