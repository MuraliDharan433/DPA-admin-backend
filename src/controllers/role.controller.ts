import type { Request, Response } from 'express';
import { roleService } from '../services/role.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';

export const roleController = {
  findAll: asyncHandler(async (_req: Request, res: Response) => {
    const data = await roleService.findAll();
    return ok(res, 'Roles fetched successfully', data);
  }),

  findOne: asyncHandler(async (req: Request, res: Response) => {
    const data = await roleService.findById(req.params.id);
    return ok(res, 'Role fetched successfully', data);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await roleService.create(req.body);
    return created(res, 'Role created successfully', data);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await roleService.update(req.params.id, req.body);
    return ok(res, 'Role updated successfully', data);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await roleService.delete(req.params.id);
    return ok(res, 'Role deleted successfully', null);
  }),
};
