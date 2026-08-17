import type { Request, Response } from 'express';
import { mockSessionService } from '../services/mockSession.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';

export const mockSessionController = {
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await mockSessionService.findAll(req.query as any);
    return ok(res, 'Mock sessions fetched successfully', data, pagination);
  }),

  findForStudent: asyncHandler(async (req: Request, res: Response) => {
    const data = await mockSessionService.findForStudent(req.params.studentId);
    return ok(res, 'Mock sessions fetched successfully', data);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await mockSessionService.create(req.body, req.user!.userId);
    return created(res, 'Mock session added successfully', data);
  }),

  createForStudent: asyncHandler(async (req: Request, res: Response) => {
    const data = await mockSessionService.createForStudent(req.params.studentId, req.body, req.user!.userId);
    return created(res, 'Mock session added successfully', data);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await mockSessionService.update(req.params.id, req.body);
    return ok(res, 'Mock session updated successfully', data);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await mockSessionService.delete(req.params.id);
    return ok(res, 'Mock session deleted successfully', null);
  }),
};
