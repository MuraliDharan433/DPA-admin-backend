import type { Request, Response } from 'express';
import { interviewService } from '../services/interview.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';

export const interviewController = {
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await interviewService.findAll(req.query as any);
    return ok(res, 'Interviews fetched successfully', data, pagination);
  }),
  findOne: asyncHandler(async (req: Request, res: Response) => {
    const data = await interviewService.findById(req.params.id);
    return ok(res, 'Interview fetched successfully', data);
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await interviewService.create(req.body, req.user!.userId);
    return created(res, 'Interview scheduled successfully', data);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await interviewService.update(req.params.id, req.body);
    return ok(res, 'Interview updated successfully', data);
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await interviewService.delete(req.params.id);
    return ok(res, 'Interview deleted successfully', null);
  }),
};
