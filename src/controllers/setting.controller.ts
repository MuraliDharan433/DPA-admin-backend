import type { Request, Response } from 'express';
import { settingService } from '../services/setting.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';

export const settingController = {
  get: asyncHandler(async (_req: Request, res: Response) => {
    const data = await settingService.get();
    return ok(res, 'Settings fetched successfully', data);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await settingService.update(req.body, req.user!.userId);
    return ok(res, 'Settings updated successfully', data);
  }),
};
