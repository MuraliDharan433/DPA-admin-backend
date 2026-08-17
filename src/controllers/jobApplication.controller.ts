import type { Request, Response } from 'express';
import { jobApplicationService } from '../services/jobApplication.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';

export const jobApplicationController = {
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await jobApplicationService.findAll(req.query as any);
    return ok(res, 'Applications fetched successfully', data, pagination);
  }),
  findOne: asyncHandler(async (req: Request, res: Response) => {
    const data = await jobApplicationService.findById(req.params.id);
    return ok(res, 'Application fetched successfully', data);
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await jobApplicationService.create(req.body, req.user!.userId);
    return created(res, 'Application created successfully', data);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await jobApplicationService.update(req.params.id, req.body);
    return ok(res, 'Application updated successfully', data);
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await jobApplicationService.delete(req.params.id);
    return ok(res, 'Application deleted successfully', null);
  }),
};
