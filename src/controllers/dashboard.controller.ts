import type { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';

export const dashboardController = {
  getStats: asyncHandler(async (req: Request, res: Response) => {
    const data = await dashboardService.getStats(req.user!);
    return ok(res, 'Dashboard stats fetched successfully', data);
  }),
  getCharts: asyncHandler(async (req: Request, res: Response) => {
    const data = await dashboardService.getCharts(req.user!);
    return ok(res, 'Dashboard charts fetched successfully', data);
  }),
  getRecentActivity: asyncHandler(async (req: Request, res: Response) => {
    const data = await dashboardService.getRecentActivity(req.user!);
    return ok(res, 'Recent activity fetched successfully', data);
  }),
};
