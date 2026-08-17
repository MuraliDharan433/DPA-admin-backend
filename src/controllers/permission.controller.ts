import type { Request, Response } from 'express';
import { permissionService } from '../services/permission.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';

export const permissionController = {
  findAll: asyncHandler(async (_req: Request, res: Response) => {
    const data = await permissionService.findAll();
    return ok(res, 'Permissions fetched successfully', data);
  }),
};
